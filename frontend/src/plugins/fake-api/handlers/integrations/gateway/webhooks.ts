import { paginateArray } from '@/plugins/fake-api/utils/paginateArray'
import { getActorUserId } from '@api-utils/actor'
import { getTenantId } from '@api-utils/tenant'
import {
    consumeRateLimit,
    db,
    deleteWebhookSecretValue,
    generateWebhookSecret,
    getDeliveriesForWebhook,
    getDeliveryById,
    getNamespaceById,
    getWebhookById,
    getWebhookSecretValue,
    getWebhooksForNamespace,
    maskWebhookSecret,
    pushWebhookDelivery,
    setWebhookSecretValue,
} from '@db/integrations/gateway/db'
import type { CreateWebhookPayload, GatewayWebhookCreateResponse, GatewayWebhookUpdateResponse, UpdateWebhookPayload } from 'contracts/integrations/gateway/types'
import type { GatewayNamespace, GatewayRoute, GatewayWebhook, GatewayWebhookDelivery } from 'contracts/types/gateway'
import { WEBHOOK_EVENTS, WEBHOOK_STATUS } from 'contracts/types/gateway'
import { HttpResponse, type JsonBodyType, http } from 'msw'



function getActorId(req: Request): string {
  return getActorUserId(req) ?? 'user-admin'
}

function parsePositiveInt(val: string | null, fallback: number): number {
  const n = Number(val)
  if (Number.isFinite(n) && n > 0)
    return Math.floor(n)

  return fallback
}

function nowIso(): string {
  return new Date().toISOString()
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function errorJson(message: string, code?: string, status = 400): HttpResponse<JsonBodyType> {
  return HttpResponse.json({ message, ...(code ? { code } : {}) }, { status })
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const WEBHOOK_STATUS_SET = new Set<string>(WEBHOOK_STATUS)
const WEBHOOK_EVENT_SET = new Set<string>(WEBHOOK_EVENTS)

function normaliseRateLimit(rateLimit: { limit: number; windowSec: number } | null | undefined): { limit: number; windowSec: number } | null | undefined {
  if (rateLimit === null)
    return null
  if (rateLimit === undefined)
    return undefined
  if (typeof rateLimit.limit !== 'number' || !Number.isFinite(rateLimit.limit) || rateLimit.limit < 1)
    throw new Error('rateLimit.limit must be a positive number')
  if (typeof rateLimit.windowSec !== 'number' || !Number.isFinite(rateLimit.windowSec) || rateLimit.windowSec < 1)
    throw new Error('rateLimit.windowSec must be a positive number')

  return { limit: Math.floor(rateLimit.limit), windowSec: Math.floor(rateLimit.windowSec) }
}

function validateWebhookPayload(body: CreateWebhookPayload): string | null {
  if (!body.name?.trim())
    return 'Webhook name is required'

  if (!body.targetUrl?.trim())
    return 'Target URL is required'

  const url = body.targetUrl.trim()
  const isRelative = url.startsWith('/')
  if (!isRelative) {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')
        return 'Target URL must be http(s) or a same-origin path'
    }
    catch {
      return 'Target URL must be http(s) or a same-origin path'
    }
  }

  if (!Array.isArray(body.events) || body.events.length === 0)
    return 'At least one event is required'

  if (!body.events.every(e => WEBHOOK_EVENT_SET.has(e)))
    return 'Unknown event — supported: ' + [...WEBHOOK_EVENT_SET].join(', ')

  if (body.status !== undefined && !WEBHOOK_STATUS_SET.has(body.status))
    return 'Invalid webhook status'

  return null
}






async function hmacSha256(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder()
  const subtle = globalThis.crypto?.subtle

  if (subtle) {
    const key = await subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const signature = await subtle.sign('HMAC', key, encoder.encode(data))

    return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('')
  }


  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  const mixed = `${secret}|${data}`
  for (let i = 0; i < mixed.length; i++) {
    h1 = Math.imul(h1 ^ mixed.charCodeAt(i), 0x01000193)
    h2 = Math.imul(h2 ^ (mixed.charCodeAt(i) ^ i), 0x85ebca6b)
  }

  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...init, signal: controller.signal })
  }
  finally {
    clearTimeout(timer)
  }
}





const MAX_ATTEMPTS = 5
const BODY_PREVIEW_MAX = 200
const deliveryTimers = new Map<string, ReturnType<typeof setTimeout>>()

function clearDeliveryTimer(deliveryId: string): void {
  const timer = deliveryTimers.get(deliveryId)
  if (timer) {
    clearTimeout(timer)
    deliveryTimers.delete(deliveryId)
  }
}

function previewBody(body: string): string {
  return body.length > BODY_PREVIEW_MAX ? `${body.slice(0, BODY_PREVIEW_MAX)}…` : body
}

export function enqueueWebhookDelivery(params: {
  webhook: GatewayWebhook
  namespaceId: string
  tenantId: string
  eventId: string
  event: string
  correlationId: string
  payload: string
}): GatewayWebhookDelivery {
  const now = nowIso()
  const delivery: GatewayWebhookDelivery = {
    id: `whd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    webhookId: params.webhook.id,
    namespaceId: params.namespaceId,
    tenantId: params.tenantId,
    eventId: params.eventId,
    event: params.event,
    payload: params.payload,
    payloadPreview: previewBody(params.payload),
    status: 'pending',
    attempts: [],
    maxAttempts: MAX_ATTEMPTS,
    correlationId: params.correlationId,
    isDeadLetter: false,
    createdAt: now,
    updatedAt: now,
  }

  pushWebhookDelivery(delivery)
  scheduleDelivery(delivery, 50)

  return delivery
}

function scheduleDelivery(delivery: GatewayWebhookDelivery, delayMs: number): void {
  clearDeliveryTimer(delivery.id)
  const timer = setTimeout(() => {
    deliveryTimers.delete(delivery.id)
    void processDelivery(delivery)
  }, delayMs)
  deliveryTimers.set(delivery.id, timer)
}

function registerAttempt(
  delivery: GatewayWebhookDelivery,
  attemptInfo: { attempt: number; httpStatus?: number; responseTimeMs?: number; error?: string },
): void {
  delivery.attempts.push({
    attempt: attemptInfo.attempt,
    httpStatus: attemptInfo.httpStatus,
    responseTimeMs: attemptInfo.responseTimeMs,
    error: attemptInfo.error,
    attemptedAt: nowIso(),
  })

  const delivered = attemptInfo.httpStatus !== undefined && attemptInfo.httpStatus < 400

  if (delivered) {
    delivery.status = 'delivered'
    delivery.isDeadLetter = false
    delivery.nextRetryAt = undefined
    delivery.updatedAt = nowIso()

    return
  }

  if (attemptInfo.attempt >= delivery.maxAttempts) {
    delivery.status = 'failed'
    delivery.isDeadLetter = true
    delivery.nextRetryAt = undefined
    delivery.updatedAt = nowIso()

    return
  }


  const backoffSec = 2 ** (attemptInfo.attempt - 1)
  delivery.status = 'pending'
  delivery.nextRetryAt = new Date(Date.now() + backoffSec * 1000).toISOString()
  delivery.updatedAt = nowIso()
  scheduleDelivery(delivery, backoffSec * 1000)
}

export async function processDelivery(delivery: GatewayWebhookDelivery): Promise<void> {
  if (delivery.status !== 'pending')
    return

  const webhook = getWebhookById(delivery.webhookId, delivery.namespaceId, delivery.tenantId)
  if (!webhook)
    return

  const attempt = delivery.attempts.length + 1


  if (webhook.rateLimit && !consumeRateLimit(delivery.tenantId, delivery.namespaceId, webhook.id, webhook.rateLimit, webhook.id)) {
    registerAttempt(delivery, { attempt, httpStatus: 429, error: 'RATE_LIMITED' })

    return
  }


  if (webhook.ipAllowlist?.length && !webhook.ipAllowlist.includes('127.0.0.1')) {
    registerAttempt(delivery, { attempt, error: 'IP_NOT_ALLOWED' })

    return
  }


  const timestampSec = Math.floor(Date.now() / 1000).toString()
  const body = delivery.payload
  const secret = getWebhookSecretValue(webhook.id) ?? ''
  let signature = ''
  try {
    signature = await hmacSha256(secret, `${timestampSec}.${body}`)
  }
  catch {
    signature = ''
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-DoctorIA-Signature': signature,
    'X-DoctorIA-Timestamp': timestampSec,
    'X-DoctorIA-Event-Id': delivery.eventId,
    'X-DoctorIA-Correlation-Id': delivery.correlationId,
  }

  const started = Date.now()
  const targetUrl = webhook.targetUrl
  let httpStatus: number | undefined
  let error: string | undefined

  try {
    if (targetUrl.startsWith('https://fail.')) {

      await delay(10)
      httpStatus = 500
      error = 'UPSTREAM_500'
    }
    else if (targetUrl.startsWith('/')) {


      const origin = typeof location !== 'undefined' ? location.origin : 'http://localhost'
      const res = await fetchWithTimeout(new URL(targetUrl, origin).toString(), {
        method: 'POST',
        headers,
        body,
      }, webhook.timeoutMs)
      httpStatus = res.status
      if (httpStatus >= 400)
        error = `HTTP_${httpStatus}`
    }
    else {

      await delay(20)
      httpStatus = 200
    }
  }
  catch {
    error = 'UNREACHABLE'
  }

  const responseTimeMs = Date.now() - started
  registerAttempt(delivery, { attempt, httpStatus, responseTimeMs, error })
}



export function enqueueWebhookEvents(params: {
  tenantId: string
  namespace: GatewayNamespace
  route: GatewayRoute
  status: number
  method: string
  path: string
  latencyMs: number
}): void {
  const webhooks = getWebhooksForNamespace(params.namespace.id, params.tenantId)
    .filter(w => w.status === 'active' && w.events.includes('route.invoked'))

  if (webhooks.length === 0)
    return

  const eventId = `wh_evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const correlationId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const payload = JSON.stringify({
    event: 'route.invoked',
    eventId,
    timestamp: nowIso(),
    data: {
      namespace: params.namespace.slug,
      route: { id: params.route.id, method: params.method, path: params.path },
      status: params.status,
      latencyMs: params.latencyMs,
    },
  })

  for (const webhook of webhooks) {
    enqueueWebhookDelivery({
      webhook,
      namespaceId: params.namespace.id,
      tenantId: params.tenantId,
      eventId,
      event: 'route.invoked',
      correlationId,
      payload,
    })
  }
}



const listWebhooks = http.get('*/api/integrations/gateway/namespaces/:id/webhooks', ({ request, params }) => {
  const tenantId = getTenantId(request)
  const ns = getNamespaceById(params.id as string, tenantId)
  if (!ns)
    return errorJson('Namespace not found', 'NOT_FOUND', 404)

  const url = new URL(request.url)
  const page = parsePositiveInt(url.searchParams.get('page'), 1)
  const itemsPerPage = Math.min(parsePositiveInt(url.searchParams.get('itemsPerPage') ?? url.searchParams.get('pageSize'), 20), 100)

  let items = getWebhooksForNamespace(ns.id, tenantId)
  const statusParam = url.searchParams.get('status')
  if (statusParam)
    items = items.filter(w => w.status === statusParam)

  const total = items.length
  const totalPages = Math.ceil(total / itemsPerPage)
  const data = paginateArray(items, itemsPerPage, page) as GatewayWebhook[]


  return HttpResponse.json({ webhooks: data, totalWebhooks: total, totalPages, page })
})

const createWebhook = http.post('*/api/integrations/gateway/namespaces/:id/webhooks', async ({ request, params }) => {
  const tenantId = getTenantId(request)
  const ns = getNamespaceById(params.id as string, tenantId)
  if (!ns)
    return errorJson('Namespace not found', 'NOT_FOUND', 404)

  let body: CreateWebhookPayload
  try {
    body = await request.json() as CreateWebhookPayload
  }
  catch {
    return errorJson('Invalid JSON body')
  }

  const validation = validateWebhookPayload(body)
  if (validation)
    return errorJson(validation)

  const secret = generateWebhookSecret()
  const now = nowIso()
  const webhook: GatewayWebhook = {
    id: newId('wh'),
    namespaceId: ns.id,
    tenantId,
    name: body.name.trim(),
    targetUrl: body.targetUrl.trim(),
    events: body.events,
    maskedSecret: maskWebhookSecret(secret),
    status: body.status ?? 'active',
    rateLimit: normaliseRateLimit(body.rateLimit) ?? null,
    ipAllowlist: body.ipAllowlist?.length ? body.ipAllowlist : null,
    timeoutMs: body.timeoutMs && body.timeoutMs > 0 ? Math.floor(body.timeoutMs) : 10_000,
    createdAt: now,
    updatedAt: now,
    createdBy: getActorId(request),
  }

  db.webhooks.push(webhook)
  setWebhookSecretValue(webhook.id, secret)

  const response: GatewayWebhookCreateResponse = { webhook, secret }

  return HttpResponse.json(response, { status: 201 })
})

const updateWebhook = http.put('*/api/integrations/gateway/namespaces/:id/webhooks/:webhookId', async ({ request, params }) => {
  const tenantId = getTenantId(request)
  const ns = getNamespaceById(params.id as string, tenantId)
  if (!ns)
    return errorJson('Namespace not found', 'NOT_FOUND', 404)

  const webhook = getWebhookById(params.webhookId as string, ns.id, tenantId)
  if (!webhook)
    return errorJson('Webhook not found', 'NOT_FOUND', 404)

  let body: UpdateWebhookPayload
  try {
    body = await request.json() as UpdateWebhookPayload
  }
  catch {
    return errorJson('Invalid JSON body')
  }

  const merged: CreateWebhookPayload = {
    name: body.name ?? webhook.name,
    targetUrl: body.targetUrl ?? webhook.targetUrl,
    events: body.events ?? webhook.events,
    status: body.status ?? webhook.status,
    rateLimit: body.rateLimit !== undefined ? body.rateLimit : webhook.rateLimit ?? null,
    ipAllowlist: body.ipAllowlist !== undefined ? body.ipAllowlist : webhook.ipAllowlist ?? null,
    timeoutMs: body.timeoutMs ?? webhook.timeoutMs,
  }

  const validation = validateWebhookPayload(merged)
  if (validation)
    return errorJson(validation)

  let regeneratedSecret: string | undefined

  if (body.regenerateSecret) {
    regeneratedSecret = generateWebhookSecret()
    setWebhookSecretValue(webhook.id, regeneratedSecret)
    webhook.maskedSecret = maskWebhookSecret(regeneratedSecret)
  }

  webhook.name = merged.name.trim()
  webhook.targetUrl = merged.targetUrl.trim()
  webhook.events = merged.events
  webhook.status = merged.status as GatewayWebhook['status']
  webhook.rateLimit = normaliseRateLimit(merged.rateLimit) ?? null
  webhook.ipAllowlist = merged.ipAllowlist?.length ? merged.ipAllowlist : null
  webhook.timeoutMs = merged.timeoutMs && merged.timeoutMs > 0 ? Math.floor(merged.timeoutMs) : 10_000
  webhook.updatedAt = nowIso()

  const response: GatewayWebhookUpdateResponse = { webhook, secret: regeneratedSecret }

  return HttpResponse.json(response)
})

const deleteWebhook = http.delete('*/api/integrations/gateway/namespaces/:id/webhooks/:webhookId', ({ request, params }) => {
  const tenantId = getTenantId(request)
  const ns = getNamespaceById(params.id as string, tenantId)
  if (!ns)
    return errorJson('Namespace not found', 'NOT_FOUND', 404)

  const index = db.webhooks.findIndex(w => w.id === params.webhookId && w.namespaceId === ns.id && w.tenantId === tenantId)
  if (index === -1)
    return errorJson('Webhook not found', 'NOT_FOUND', 404)

  const [removed] = db.webhooks.splice(index, 1)
  deleteWebhookSecretValue(removed.id)
  db.deliveries = db.deliveries.filter(d => d.webhookId !== removed.id)

  return new HttpResponse(null, { status: 204 })
})

const testWebhook = http.post('*/api/integrations/gateway/namespaces/:id/webhooks/:webhookId/test', ({ request, params }) => {
  const tenantId = getTenantId(request)
  const ns = getNamespaceById(params.id as string, tenantId)
  if (!ns)
    return errorJson('Namespace not found', 'NOT_FOUND', 404)

  const webhook = getWebhookById(params.webhookId as string, ns.id, tenantId)
  if (!webhook)
    return errorJson('Webhook not found', 'NOT_FOUND', 404)

  const eventId = `wh_evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const payload = JSON.stringify({
    event: 'webhook.test',
    eventId,
    timestamp: nowIso(),
    data: { namespace: ns.slug, message: 'Test event — verify your endpoint receives and validates the signature.' },
  })

  enqueueWebhookDelivery({
    webhook,
    namespaceId: ns.id,
    tenantId,
    eventId,
    event: 'webhook.test',
    correlationId: `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    payload,
  })

  return HttpResponse.json({ message: 'Test event enqueued' })
})

const listDeliveries = http.get('*/api/integrations/gateway/namespaces/:id/webhooks/:webhookId/deliveries', ({ request, params }) => {
  const tenantId = getTenantId(request)
  const ns = getNamespaceById(params.id as string, tenantId)
  if (!ns)
    return errorJson('Namespace not found', 'NOT_FOUND', 404)

  const webhook = getWebhookById(params.webhookId as string, ns.id, tenantId)
  if (!webhook)
    return errorJson('Webhook not found', 'NOT_FOUND', 404)

  const url = new URL(request.url)
  const page = parsePositiveInt(url.searchParams.get('page'), 1)
  const itemsPerPage = Math.min(parsePositiveInt(url.searchParams.get('itemsPerPage') ?? url.searchParams.get('pageSize'), 20), 100)

  let items = getDeliveriesForWebhook(webhook.id, ns.id, tenantId)
  const statusParam = url.searchParams.get('status')
  if (statusParam)
    items = items.filter(d => d.status === statusParam)

  const total = items.length
  const totalPages = Math.ceil(total / itemsPerPage)
  const data = paginateArray(items, itemsPerPage, page) as GatewayWebhookDelivery[]


  return HttpResponse.json({ deliveries: data, totalDeliveries: total, totalPages, page })
})

const retryDelivery = http.post('*/api/integrations/gateway/namespaces/:id/webhooks/:webhookId/deliveries/:deliveryId/retry', ({ request, params }) => {
  const tenantId = getTenantId(request)
  const ns = getNamespaceById(params.id as string, tenantId)
  if (!ns)
    return errorJson('Namespace not found', 'NOT_FOUND', 404)

  const webhook = getWebhookById(params.webhookId as string, ns.id, tenantId)
  if (!webhook)
    return errorJson('Webhook not found', 'NOT_FOUND', 404)

  const delivery = getDeliveryById(params.deliveryId as string, webhook.id, ns.id, tenantId)
  if (!delivery)
    return errorJson('Delivery not found', 'NOT_FOUND', 404)

  if (delivery.status === 'delivered')
    return errorJson('Delivery already delivered', 'CONFLICT', 409)

  delivery.status = 'pending'
  delivery.isDeadLetter = false
  delivery.nextRetryAt = nowIso()
  delivery.updatedAt = nowIso()
  scheduleDelivery(delivery, 50)

  return HttpResponse.json({ delivery })
})

export const handlerGatewayWebhooks = [
  listWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  listDeliveries,
  retryDelivery,
]



