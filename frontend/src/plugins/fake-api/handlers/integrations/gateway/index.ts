import { paginateArray } from '@/plugins/fake-api/utils/paginateArray'
import { getActorUserId } from '@api-utils/actor'
import { authorize } from '@api-utils/authorize'
import { getTenantId } from '@api-utils/tenant'
import { db, deleteApiKeyValue, getApiKeyById, getApiKeysForNamespace, getNamespaceById, getNamespaceBySlug, getRouteById, getRoutesForNamespace, hasDuplicateRoute, recalcRouteCount, setApiKeyValue } from '@db/integrations/gateway/db'
import { getCredentialEntry } from '@db/security/credentials/db'
import type { CreateApiKeyPayload, CreateNamespacePayload, CreateRoutePayload, QuickSetupConfirmPayload, QuickSetupPayload, UpdateNamespacePayload, UpdateRoutePayload } from 'contracts/integrations/gateway/types'
import type { ExtractionJob, ExtractionProposal, GatewayApiKey, GatewayInvocationLog, GatewayNamespace, GatewayRoute, GatewayRouteMode, GatewayRouteRateLimit, GatewayRouteRole, HttpMethod } from 'contracts/types/gateway'
import { GATEWAY_ROUTE_MODES, GATEWAY_ROUTE_ROLES, HTTP_METHODS } from 'contracts/types/gateway'
import jsonata from 'jsonata'
import { HttpResponse, type JsonBodyType, http } from 'msw'



function getActorId(req: Request): string {
  return getActorUserId(req) ?? 'user-admin'
}

function parsePositiveInt(val: string | null, fallback: number): number {
  const n = Number(val)

  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
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

function includesSearch(source: string, q: string): boolean {
  return source.toLowerCase().includes(q.toLowerCase())
}



const HTTP_METHOD_SET = new Set<string>(HTTP_METHODS)
const ROUTE_MODE_SET = new Set<string>(GATEWAY_ROUTE_MODES)
const ROUTE_ROLE_SET = new Set<string>(GATEWAY_ROUTE_ROLES)

function validatePath(path: string): string | null {
  if (!path.startsWith('/'))
    return 'path must start with \'/\''
  if (path.length > 1 && path.endsWith('/'))
    return 'path must not end with \'/\''
  if (path.includes('//'))
    return 'path must not contain \'//\''
  if (path.includes('?'))
    return 'path must not contain a query string'
  if (path.includes('#'))
    return 'path must not contain \'#\''
  if (/\s/.test(path))
    return 'path must not contain whitespace'

  return null
}

function isValidUpstreamUrl(value: string): boolean {
  if (/\s/.test(value))
    return false
  if (value.startsWith('/'))
    return true
  try {
    const parsed = new URL(value)

    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  }
  catch {
    return false
  }
}

function isValidCredentialRef(credentialId: string | undefined, tenantId: string): boolean {
  if (credentialId === undefined || credentialId === null || credentialId === '')
    return true

  return getCredentialEntry(credentialId, tenantId) !== null
}

function isValidJsonata(expression: string): boolean {
  try {
    jsonata(expression)

    return true
  }
  catch {
    return false
  }
}

function normaliseRateLimit(rateLimit: GatewayRouteRateLimit | null | undefined): GatewayRouteRateLimit | null | undefined {
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

function generateApiKey(): string {
  const random = Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return `gwk_${random}`
}

function maskApiKey(key: string): string {
  return `${key.slice(0, 8)}****${key.slice(-4)}`
}



function inferSchemaFromValue(value: unknown): object {
  if (value === null || value === undefined)
    return { type: 'null' }
  if (Array.isArray(value)) {
    return {
      type: 'array',
      items: value.length > 0 ? inferSchemaFromValue(value[0]) : {},
    }
  }
  if (typeof value === 'object') {
    const properties: Record<string, object> = {}
    const required: string[] = []
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      properties[key] = inferSchemaFromValue(item)
      if (item !== null && item !== undefined)
        required.push(key)
    }

    return { type: 'object', properties, ...(required.length ? { required } : {}) }
  }
  if (typeof value === 'string')
    return { type: 'string' }
  if (typeof value === 'number')
    return Number.isInteger(value) ? { type: 'integer' } : { type: 'number' }
  if (typeof value === 'boolean')
    return { type: 'boolean' }

  return {}
}

function isValidSchema(value: unknown): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function inferSchemaFromJson(json: string): object | undefined {
  try {
    return inferSchemaFromValue(JSON.parse(json))
  }
  catch {
    return undefined
  }
}



function toolSpecName(slug: string, method: string, path: string): string {
  const segments = path
    .split('/')
    .filter(Boolean)
    .map(segment => segment.replace(/[:{}]/g, ''))

  return [slug, method.toLowerCase(), ...segments].join('_')
}



const getNamespaces = http.get('*/api/integrations/gateway/namespaces', ({ request }) => {
  const denied = authorize(request, 'gateway.view')
  if (denied)
    return denied

  const tenantId = getTenantId(request)
  const url = new URL(request.url)
  const q = url.searchParams.get('q') ?? ''
  const page = parsePositiveInt(url.searchParams.get('page'), 1)
  const itemsPerPage = Math.min(parsePositiveInt(url.searchParams.get('itemsPerPage') ?? url.searchParams.get('pageSize'), 20), 100)

  let items = db.namespaces.filter(n => n.tenantId === tenantId)
  if (q)
    items = items.filter(n => includesSearch(n.displayName, q) || includesSearch(n.slug, q))

  const total = items.length
  const totalPages = Math.ceil(total / itemsPerPage)
  const data = paginateArray(items, itemsPerPage, page) as GatewayNamespace[]


  return HttpResponse.json({ namespaces: data, totalNamespaces: total, totalPages, page })
})

const createNamespace = http.post('*/api/integrations/gateway/namespaces', async ({ request }) => {
  const denied = authorize(request, 'gateway.manage')
  if (denied)
    return denied

  const tenantId = getTenantId(request)
  const actorId = getActorId(request)
  const body = await request.json() as CreateNamespacePayload

  if (!body.slug?.trim() || !body.displayName?.trim())
    return errorJson('slug and displayName are required')

  const slugPattern = /^[a-z0-9-]{2,64}$/
  if (!slugPattern.test(body.slug))
    return errorJson('slug must be 2–64 lowercase alphanumeric characters or hyphens')

  if (getNamespaceBySlug(body.slug, tenantId))
    return errorJson(`Namespace with slug '${body.slug}' already exists`, 'CONFLICT', 409)

  if (body.baseUrl && !isValidUpstreamUrl(body.baseUrl))
    return errorJson('baseUrl must be a valid http(s) URL or a same-origin path')

  if (!isValidCredentialRef(body.credentialId, tenantId))
    return errorJson('credentialId does not reference a credential in this workspace', 'CREDENTIAL_NOT_FOUND', 400)

  let rateLimit: GatewayRouteRateLimit | null | undefined
  try {
    rateLimit = normaliseRateLimit(body.rateLimit)
  }
  catch (err: unknown) {
    return errorJson((err as Error).message)
  }

  const ns: GatewayNamespace = {
    id: newId('ns'),
    tenantId,
    slug: body.slug,
    displayName: body.displayName,
    description: body.description ?? '',
    baseUrl: body.baseUrl ?? '',
    credentialId: body.credentialId ?? '',
    authHeader: body.authHeader ?? undefined,
    authScheme: body.authScheme ?? undefined,
    rateLimit: rateLimit ?? undefined,
    routeCount: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    createdBy: actorId,
  }

  db.namespaces.push(ns)

  return HttpResponse.json({ namespace: ns }, { status: 201 })
})

const updateNamespace = http.put('*/api/integrations/gateway/namespaces/:id', async ({ request, params }) => {
  const denied = authorize(request, 'gateway.manage')
  if (denied)
    return denied

  const tenantId = getTenantId(request)
  const ns = getNamespaceById(params.id as string, tenantId)
  if (!ns)
    return errorJson('Namespace not found', 'NOT_FOUND', 404)

  const body = await request.json() as UpdateNamespacePayload
  if (body.displayName !== undefined)
    ns.displayName = body.displayName
  if (body.description !== undefined)
    ns.description = body.description
  if (body.baseUrl !== undefined) {
    if (body.baseUrl && !isValidUpstreamUrl(body.baseUrl))
      return errorJson('baseUrl must be a valid http(s) URL or a same-origin path')
    ns.baseUrl = body.baseUrl
  }
  if (body.credentialId !== undefined) {
    if (!isValidCredentialRef(body.credentialId, tenantId))
      return errorJson('credentialId does not reference a credential in this workspace', 'CREDENTIAL_NOT_FOUND', 400)
    ns.credentialId = body.credentialId
  }
  if (body.authHeader !== undefined)
    ns.authHeader = body.authHeader
  if (body.authScheme !== undefined)
    ns.authScheme = body.authScheme
  if (body.rateLimit !== undefined) {
    try {
      ns.rateLimit = normaliseRateLimit(body.rateLimit) ?? undefined
    }
    catch (err: unknown) {
      return errorJson((err as Error).message)
    }
  }
  ns.updatedAt = nowIso()

  return HttpResponse.json({ namespace: ns })
})

const deleteNamespace = http.delete('*/api/integrations/gateway/namespaces/:id', ({ request, params }) => {
  const denied = authorize(request, 'gateway.manage')
  if (denied)
    return denied

  const tenantId = getTenantId(request)
  const nsIdx = db.namespaces.findIndex(n => n.id === params.id && n.tenantId === tenantId)
  if (nsIdx === -1)
    return errorJson('Namespace not found', 'NOT_FOUND', 404)


  const nsId = params.id as string

  db.routes = db.routes.filter(r => r.namespaceId !== nsId)
  db.namespaces.splice(nsIdx, 1)

  return new HttpResponse(null, { status: 204 })
})



const getRoutes = http.get('*/api/integrations/gateway/namespaces/:id/routes', ({ request, params }) => {
  const denied = authorize(request, 'gateway.view')
  if (denied)
    return denied

  const tenantId = getTenantId(request)
  const ns = getNamespaceById(params.id as string, tenantId)
  if (!ns)
    return errorJson('Namespace not found', 'NOT_FOUND', 404)

  const url = new URL(request.url)
  const method = url.searchParams.get('method')?.toUpperCase()
  const mode = url.searchParams.get('mode')?.toUpperCase()
  const enabledParam = url.searchParams.get('enabled')
  const page = parsePositiveInt(url.searchParams.get('page'), 1)
  const itemsPerPage = Math.min(parsePositiveInt(url.searchParams.get('itemsPerPage') ?? url.searchParams.get('pageSize'), 20), 100)

  let items = getRoutesForNamespace(params.id as string, tenantId)
  if (method)
    items = items.filter(r => r.method === method)
  if (mode)
    items = items.filter(r => r.mode === mode)
  if (enabledParam !== null)
    items = items.filter(r => r.enabled === (enabledParam === 'true'))

  const total = items.length
  const totalPages = Math.ceil(total / itemsPerPage)
  const data = paginateArray(items, itemsPerPage, page) as GatewayRoute[]


  return HttpResponse.json({ routes: data, totalRoutes: total, totalPages, page })
})

const createRoute = http.post('*/api/integrations/gateway/namespaces/:id/routes', async ({ request, params }) => {
  const denied = authorize(request, 'gateway.manage')
  if (denied)
    return denied

  const tenantId = getTenantId(request)
  const ns = getNamespaceById(params.id as string, tenantId)
  if (!ns)
    return errorJson('Namespace not found', 'NOT_FOUND', 404)

  const body = await request.json() as CreateRoutePayload

  const method = body.method?.trim().toUpperCase() ?? ''
  const mode = body.mode?.trim().toUpperCase() ?? ''
  const requiredRole = (body.requiredRole?.trim().toUpperCase() || 'USER') as GatewayRouteRole
  const upstreamUrl = body.upstreamUrl?.trim() ?? ''

  if (!method || !body.path || !mode)
    return errorJson('method, path, and mode are required')

  if (!HTTP_METHOD_SET.has(method))
    return errorJson(`method must be one of: ${HTTP_METHODS.join(', ')}`)

  if (!ROUTE_MODE_SET.has(mode))
    return errorJson(`mode must be one of: ${GATEWAY_ROUTE_MODES.join(', ')}`)

  if (!ROUTE_ROLE_SET.has(requiredRole))
    return errorJson(`requiredRole must be one of: ${GATEWAY_ROUTE_ROLES.join(', ')}`)

  const pathError = validatePath(body.path)
  if (pathError)
    return errorJson(pathError)

  if (body.mockStatusCode !== undefined && (body.mockStatusCode < 100 || body.mockStatusCode > 599))
    return errorJson('mockStatusCode must be between 100 and 599')

  if (body.isPublic !== undefined && typeof body.isPublic !== 'boolean')
    return errorJson('isPublic must be a boolean')

  if (body.enabled !== undefined && typeof body.enabled !== 'boolean')
    return errorJson('enabled must be a boolean')

  if (!isValidCredentialRef(body.credentialId, tenantId))
    return errorJson('credentialId does not reference a credential in this workspace', 'CREDENTIAL_NOT_FOUND', 400)

  if (body.requestTransform !== undefined && body.requestTransform.trim() !== '' && !isValidJsonata(body.requestTransform))
    return errorJson('requestTransform must be a valid JSONata expression')
  if (body.responseTransform !== undefined && body.responseTransform.trim() !== '' && !isValidJsonata(body.responseTransform))
    return errorJson('responseTransform must be a valid JSONata expression')

  if (body.requestSchema !== undefined && body.requestSchema !== null && !isValidSchema(body.requestSchema))
    return errorJson('requestSchema must be a JSON Schema object')
  if (body.responseSchema !== undefined && body.responseSchema !== null && !isValidSchema(body.responseSchema))
    return errorJson('responseSchema must be a JSON Schema object')

  let rateLimit: GatewayRouteRateLimit | null | undefined
  try {
    rateLimit = normaliseRateLimit(body.rateLimit)
  }
  catch (err: unknown) {
    return errorJson((err as Error).message)
  }

  if (mode === 'PROXY') {
    const hasNamespaceBase = Boolean(ns?.baseUrl)
    if (!upstreamUrl && !hasNamespaceBase)
      return errorJson('upstreamUrl is required for PROXY mode unless the namespace defines a baseUrl')
    if (upstreamUrl && !isValidUpstreamUrl(upstreamUrl))
      return errorJson('upstreamUrl must be a valid http(s) URL or a same-origin path')
  }

  if (mode === 'MOCK') {
    if (!body.mockPayload)
      return errorJson('mockPayload is required for MOCK mode')
    try { JSON.parse(body.mockPayload) }
    catch { return errorJson('mockPayload must be valid JSON') }
  }

  if (body.mockLatencyMs !== undefined && (body.mockLatencyMs < 0 || body.mockLatencyMs > 10000))
    return errorJson('mockLatencyMs must be between 0 and 10000')

  if (hasDuplicateRoute(params.id as string, method, body.path))
    return errorJson(`A route for ${method} ${body.path} already exists in this namespace`, 'CONFLICT', 409)

  const route: GatewayRoute = {
    id: newId('route'),
    namespaceId: params.id as string,
    tenantId,
    method: method as HttpMethod,
    path: body.path,
    mode: mode as GatewayRouteMode,
    isPublic: body.isPublic ?? false,
    requiredRole,
    enabled: body.enabled ?? true,
    mockPayload: body.mockPayload ?? '{}',
    mockStatusCode: body.mockStatusCode ?? 200,
    mockLatencyMs: body.mockLatencyMs ?? 0,
    upstreamUrl,
    credentialId: body.credentialId ?? '',
    authHeader: body.authHeader ?? undefined,
    authScheme: body.authScheme ?? undefined,
    requestTransform: body.requestTransform ?? '',
    responseTransform: body.responseTransform ?? '',
    requestSchema: body.requestSchema ?? undefined,
    responseSchema: body.responseSchema ?? undefined,
    rateLimit: rateLimit ?? undefined,
    description: body.description ?? '',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }

  db.routes.push(route)
  recalcRouteCount(params.id as string)

  return HttpResponse.json({ route }, { status: 201 })
})

const updateRoute = http.put('*/api/integrations/gateway/namespaces/:id/routes/:routeId', async ({ request, params }) => {
  const denied = authorize(request, 'gateway.manage')
  if (denied)
    return denied

  const tenantId = getTenantId(request)
  const route = getRouteById(params.routeId as string, params.id as string, tenantId)
  if (!route)
    return errorJson('Route not found', 'NOT_FOUND', 404)

  const body = await request.json() as UpdateRoutePayload

  if (body.mockPayload !== undefined) {
    try { JSON.parse(body.mockPayload) }
    catch { return errorJson('mockPayload must be valid JSON') }
    route.mockPayload = body.mockPayload
  }
  if (body.mockStatusCode !== undefined) {
    if (body.mockStatusCode < 100 || body.mockStatusCode > 599)
      return errorJson('mockStatusCode must be between 100 and 599')
    route.mockStatusCode = body.mockStatusCode
  }
  if (body.mockLatencyMs !== undefined) {
    if (body.mockLatencyMs < 0 || body.mockLatencyMs > 10000)
      return errorJson('mockLatencyMs must be between 0 and 10000')
    route.mockLatencyMs = body.mockLatencyMs
  }
  if (body.mode !== undefined) {
    const mode = body.mode.trim().toUpperCase()
    if (!ROUTE_MODE_SET.has(mode))
      return errorJson(`mode must be one of: ${GATEWAY_ROUTE_MODES.join(', ')}`)
    route.mode = mode as GatewayRouteMode
  }
  if (body.isPublic !== undefined) {
    if (typeof body.isPublic !== 'boolean')
      return errorJson('isPublic must be a boolean')
    route.isPublic = body.isPublic
  }
  if (body.requiredRole !== undefined) {
    const role = body.requiredRole.trim().toUpperCase()
    if (!ROUTE_ROLE_SET.has(role))
      return errorJson(`requiredRole must be one of: ${GATEWAY_ROUTE_ROLES.join(', ')}`)
    route.requiredRole = role as GatewayRouteRole
  }
  if (body.enabled !== undefined) {
    if (typeof body.enabled !== 'boolean')
      return errorJson('enabled must be a boolean')
    route.enabled = body.enabled
  }
  if (body.upstreamUrl !== undefined) {
    const upstreamUrl = body.upstreamUrl.trim()
    if (upstreamUrl && !isValidUpstreamUrl(upstreamUrl))
      return errorJson('upstreamUrl must be a valid http(s) URL or a same-origin path')
    route.upstreamUrl = upstreamUrl
  }
  if (body.credentialId !== undefined) {
    if (!isValidCredentialRef(body.credentialId, tenantId))
      return errorJson('credentialId does not reference a credential in this workspace', 'CREDENTIAL_NOT_FOUND', 400)
    route.credentialId = body.credentialId
  }
  if (body.authHeader !== undefined)
    route.authHeader = body.authHeader
  if (body.authScheme !== undefined)
    route.authScheme = body.authScheme
  if (body.requestTransform !== undefined) {
    if (body.requestTransform.trim() !== '' && !isValidJsonata(body.requestTransform))
      return errorJson('requestTransform must be a valid JSONata expression')
    route.requestTransform = body.requestTransform
  }
  if (body.responseTransform !== undefined) {
    if (body.responseTransform.trim() !== '' && !isValidJsonata(body.responseTransform))
      return errorJson('responseTransform must be a valid JSONata expression')
    route.responseTransform = body.responseTransform
  }
  if (body.requestSchema !== undefined) {
    if (body.requestSchema !== null && !isValidSchema(body.requestSchema))
      return errorJson('requestSchema must be a JSON Schema object')
    route.requestSchema = body.requestSchema ?? undefined
  }
  if (body.responseSchema !== undefined) {
    if (body.responseSchema !== null && !isValidSchema(body.responseSchema))
      return errorJson('responseSchema must be a JSON Schema object')
    route.responseSchema = body.responseSchema ?? undefined
  }
  if (body.rateLimit !== undefined) {
    try {
      route.rateLimit = normaliseRateLimit(body.rateLimit) ?? undefined
    }
    catch (err: unknown) {
      return errorJson((err as Error).message)
    }
  }
  if (body.description !== undefined)
    route.description = body.description


  if (route.mode === 'PROXY') {
    const ns = getNamespaceById(params.id as string, tenantId)
    if (!route.upstreamUrl && !ns?.baseUrl)
      return errorJson('upstreamUrl is required for PROXY mode unless the namespace defines a baseUrl')
  }

  route.updatedAt = nowIso()

  return HttpResponse.json({ route })
})

const deleteRoute = http.delete('*/api/integrations/gateway/namespaces/:id/routes/:routeId', ({ request, params }) => {
  const denied = authorize(request, 'gateway.manage')
  if (denied)
    return denied

  const tenantId = getTenantId(request)
  const idx = db.routes.findIndex(r => r.id === params.routeId && r.namespaceId === params.id && r.tenantId === tenantId)
  if (idx === -1)
    return errorJson('Route not found', 'NOT_FOUND', 404)

  db.routes.splice(idx, 1)
  recalcRouteCount(params.id as string)

  return new HttpResponse(null, { status: 204 })
})



const listApiKeys = http.get('*/api/integrations/gateway/namespaces/:id/api-keys', ({ request, params }) => {
  const denied = authorize(request, 'gateway.keys.manage')
  if (denied)
    return denied

  const tenantId = getTenantId(request)
  const ns = getNamespaceById(params.id as string, tenantId)
  if (!ns)
    return errorJson('Namespace not found', 'NOT_FOUND', 404)

  return HttpResponse.json({ apiKeys: getApiKeysForNamespace(ns.id, tenantId) })
})

const createApiKey = http.post('*/api/integrations/gateway/namespaces/:id/api-keys', async ({ request, params }) => {
  const denied = authorize(request, 'gateway.keys.manage')
  if (denied)
    return denied

  const tenantId = getTenantId(request)
  const actorId = getActorId(request)
  const ns = getNamespaceById(params.id as string, tenantId)
  if (!ns)
    return errorJson('Namespace not found', 'NOT_FOUND', 404)

  const body = await request.json() as CreateApiKeyPayload
  const name = body.name?.trim()
  if (!name)
    return errorJson('name is required')

  const fullKey = generateApiKey()

  const apiKey: GatewayApiKey = {
    id: newId('apikey'),
    namespaceId: ns.id,
    tenantId,
    name,
    keyPrefix: 'gwk_',
    maskedKey: maskApiKey(fullKey),
    enabled: true,
    createdAt: nowIso(),
    createdBy: actorId,
  }

  db.apiKeys.push(apiKey)
  setApiKeyValue(apiKey.id, fullKey)


  return HttpResponse.json({ apiKey: { ...apiKey, key: fullKey } }, { status: 201 })
})

const deleteApiKey = http.delete('*/api/integrations/gateway/namespaces/:id/api-keys/:keyId', ({ request, params }) => {
  const denied = authorize(request, 'gateway.keys.manage')
  if (denied)
    return denied

  const tenantId = getTenantId(request)
  const apiKey = getApiKeyById(params.keyId as string, params.id as string, tenantId)
  if (!apiKey)
    return errorJson('API key not found', 'NOT_FOUND', 404)

  db.apiKeys.splice(db.apiKeys.indexOf(apiKey), 1)
  deleteApiKeyValue(apiKey.id)

  return new HttpResponse(null, { status: 204 })
})



const listInvocations = http.get('*/api/integrations/gateway/namespaces/:id/invocations', ({ request, params }) => {
  const denied = authorize(request, 'gateway.logs.view')
  if (denied)
    return denied

  const tenantId = getTenantId(request)
  const ns = getNamespaceById(params.id as string, tenantId)
  if (!ns)
    return errorJson('Namespace not found', 'NOT_FOUND', 404)

  const url = new URL(request.url)
  const page = parsePositiveInt(url.searchParams.get('page'), 1)
  const itemsPerPage = Math.min(parsePositiveInt(url.searchParams.get('itemsPerPage') ?? url.searchParams.get('pageSize'), 20), 100)

  let items = db.invocations.filter(i => i.namespaceId === ns.id && i.tenantId === tenantId)
  const statusParam = url.searchParams.get('status')
  if (statusParam)
    items = items.filter(i => i.status === Number(statusParam))

  const total = items.length
  const totalPages = Math.ceil(total / itemsPerPage)
  const data = paginateArray(items, itemsPerPage, page) as GatewayInvocationLog[]


  return HttpResponse.json({ invocations: data, totalInvocations: total, totalPages, page })
})






const listToolSpecs = http.get('*/api/integrations/gateway/namespaces/:id/tool-specs', ({ request, params }) => {
  const denied = authorize(request, ['gateway.view', 'gateway.invoke'])
  if (denied)
    return denied

  const tenantId = getTenantId(request)
  const ns = getNamespaceById(params.id as string, tenantId)
  if (!ns)
    return errorJson('Namespace not found', 'NOT_FOUND', 404)

  const routes = getRoutesForNamespace(ns.id, tenantId).filter(r => r.enabled)

  const tools = routes.map(route => {
    const pathParams = route.path
      .split('/')
      .filter(segment => segment.startsWith(':'))
      .map(segment => segment.slice(1))

    const pathSchema: Record<string, object> = {}

    pathParams.forEach(param => {
      pathSchema[param] = { type: 'string' }
    })

    const inputProperties: Record<string, object> = {
      path: {
        type: 'object',
        properties: pathSchema,
        ...(pathParams.length ? { required: pathParams } : {}),
      },
      query: { type: 'object', properties: {} },
    }

    if (route.requestSchema)
      inputProperties.body = route.requestSchema

    return {
      name: toolSpecName(ns.slug, route.method, route.path),
      description: route.description || `${route.method} ${route.path}`,
      method: route.method,
      path: route.path,
      auth: route.isPublic ? 'public' : (route.requiredRole === 'ADMIN' ? 'jwt' : 'api_key'),
      inputSchema: { type: 'object', properties: inputProperties },
      responseSchema: route.responseSchema ?? inferSchemaFromJson(route.mockPayload) ?? {},
    }
  })

  return HttpResponse.json({ namespaceId: ns.id, slug: ns.slug, tools })
})




function buildMockResponse(method: string, path: string): string {
  const p = path.toLowerCase()
  if (p.includes('payment') || p.includes('charge')) {
    if (method === 'POST')
      return JSON.stringify({ id: 12345678, status: 'approved', status_detail: 'accredited', transaction_amount: 100, currency_id: 'BRL', date_created: new Date().toISOString() })

    return JSON.stringify({ id: 12345678, status: 'approved', transaction_amount: 100, currency_id: 'BRL' })
  }
  if (p.includes('refund'))
    return JSON.stringify({ id: 987654, payment_id: 12345678, status: 'approved', amount: 100 })
  if (p.includes('customer') || p.includes('user'))
    return JSON.stringify({ id: 'cus_NffrFeUfNV2Hib', email: 'user@example.com', name: 'Example User', created: Math.floor(Date.now() / 1000) })
  if (p.includes('subscription') || p.includes('plan'))
    return JSON.stringify({ id: 'sub_1234', status: 'active', current_period_end: Math.floor(Date.now() / 1000) + 2592000 })
  if (p.includes('webhook'))
    return JSON.stringify({ id: 'wh-abc123', url: 'https://example.com/hook', events: ['payment.created'], active: true })
  if (p.includes('status') || p.includes('health'))
    return JSON.stringify({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() })
  if (method === 'DELETE')
    return JSON.stringify({ deleted: true, id: ':id' })
  if (method === 'POST' || method === 'PUT')
    return JSON.stringify({ id: `${path.split('/').pop()}-${Math.floor(Math.random() * 9999)}`, status: 'created', created_at: new Date().toISOString() })

  return JSON.stringify({ id: ':id', status: 'ok', path })
}


function extractProposalsFromText(rawInput: string, jobId: string): ExtractionProposal[] {
  const proposals: ExtractionProposal[] = []
  const seen = new Set<string>()


  const dataMatch = rawInput.match(/(?:-d|--data)\s+['"]([^'"]+)['"]/)
  let inferredRequestBody: unknown = null
  if (dataMatch) {
    try {
      inferredRequestBody = JSON.parse(dataMatch[1])
    }
    catch { /* non-JSON body — leave schema un-inferred */ }
  }


  const curlPattern = /curl\s+(?:-X\s+(\w+)\s+)?['"]?(https?:\/\/[^'"?\s]+)(['"]?)/gi
  let m: RegExpExecArray | null
  while ((m = curlPattern.exec(rawInput)) !== null) {
    const method = (m[1] || 'GET').toUpperCase()
    try {
      const url = new URL(m[2].replace(/['"]$/, ''))
      const path = url.pathname || '/'
      const key = `${method}:${path}`
      if (seen.has(key))
        continue
      seen.add(key)
      proposals.push({
        id: newId('prop'),
        jobId,
        method: method as HttpMethod,
        path,
        description: `${method} ${path}`,
        inferredRequestSchema: inferredRequestBody ? inferSchemaFromValue(inferredRequestBody) : null,
        proposedMockResponse: buildMockResponse(method, path),
        inferredRole: method === 'DELETE' || path.includes('refund') ? 'ADMIN' : 'USER',
        approvalStatus: 'pending',
        unresolvedReason: '',
        createdAt: nowIso(),
      })
    }
    catch { /* skip malformed URLs */ }
  }


  const openApiPattern = /['"]?(\/[\w/{}:-]+)['"]?\s*:\s*(get|post|put|delete|patch|options):/gi
  while ((m = openApiPattern.exec(rawInput)) !== null) {
    const path = m[1]
    const method = m[2].toUpperCase()
    const key = `${method}:${path}`
    if (seen.has(key))
      continue
    seen.add(key)
    proposals.push({
      id: newId('prop'),
      jobId,
      method: method as HttpMethod,
      path,
      description: `${method} ${path}`,
      inferredRequestSchema: null,
      proposedMockResponse: buildMockResponse(method, path),
      inferredRole: method === 'DELETE' ? 'ADMIN' : 'USER',
      approvalStatus: 'pending',
      unresolvedReason: '',
      createdAt: nowIso(),
    })
  }


  if (proposals.length === 0) {
    proposals.push({
      id: newId('prop'),
      jobId,
      method: 'GET',
      path: '',
      description: '',
      inferredRequestSchema: null,
      proposedMockResponse: '{}',
      inferredRole: 'USER',
      approvalStatus: 'pending',
      unresolvedReason: 'Could not extract a route from the provided input. Please fill in method and path manually.',
      createdAt: nowIso(),
    })
  }

  return proposals
}

const quickSetup = http.post('*/api/integrations/gateway/quick-setup', async ({ request }) => {
  const denied = authorize(request, 'gateway.manage')
  if (denied)
    return denied

  const tenantId = getTenantId(request)
  const body = await request.json() as QuickSetupPayload

  if (!body.rawInput?.trim())
    return errorJson('rawInput is required and must not be empty')

  if (body.rawInput.trim().length < 5)
    return errorJson('rawInput is too short to extract routes from')

  const job: ExtractionJob = {
    id: newId('job'),
    tenantId,
    targetNamespaceId: body.targetNamespaceId ?? '',
    rawInput: body.rawInput,
    status: 'awaiting_review',
    proposalCount: 0,
    resolvedCount: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }

  const proposals = extractProposalsFromText(body.rawInput, job.id)

  job.proposalCount = proposals.length

  db.extractionJobs.push(job)
  db.extractionProposals.push(...proposals)

  return HttpResponse.json({ job, proposals })
})

const quickSetupConfirm = http.post('*/api/integrations/gateway/quick-setup/:jobId/confirm', async ({ request, params }) => {
  const denied = authorize(request, 'gateway.manage')
  if (denied)
    return denied

  const tenantId = getTenantId(request)
  const job = db.extractionJobs.find(j => j.id === params.jobId && j.tenantId === tenantId)
  if (!job)
    return errorJson('Extraction job not found or expired', 'NOT_FOUND', 404)

  const body = await request.json() as QuickSetupConfirmPayload
  if (!body.namespaceId)
    return errorJson('namespaceId is required')

  const ns = getNamespaceById(body.namespaceId, tenantId)
  if (!ns)
    return errorJson('Namespace not found', 'NOT_FOUND', 404)

  const approved = db.extractionProposals.filter(p => p.jobId === job.id && body.approvedProposalIds.includes(p.id) && !p.unresolvedReason)

  const createdRoutes: GatewayRoute[] = []
  const conflicts: Array<{ proposalId: string; reason: string }> = []

  for (const proposal of approved) {
    if (hasDuplicateRoute(body.namespaceId, proposal.method, proposal.path)) {
      conflicts.push({ proposalId: proposal.id, reason: `A route for ${proposal.method} ${proposal.path} already exists` })
      continue
    }

    const route: GatewayRoute = {
      id: newId('route'),
      namespaceId: body.namespaceId,
      tenantId,
      method: proposal.method,
      path: proposal.path,
      mode: 'MOCK',
      isPublic: false,
      requiredRole: proposal.inferredRole,
      enabled: true,
      mockPayload: proposal.proposedMockResponse,
      mockStatusCode: proposal.method === 'POST' ? 201 : 200,
      mockLatencyMs: 0,
      upstreamUrl: '',
      requestSchema: proposal.inferredRequestSchema ?? undefined,
      responseSchema: inferSchemaFromJson(proposal.proposedMockResponse),
      description: proposal.description,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }

    db.routes.push(route)
    createdRoutes.push(route)
  }

  recalcRouteCount(body.namespaceId)
  job.status = 'confirmed'
  job.updatedAt = nowIso()

  return HttpResponse.json({ createdRoutes, conflicts }, { status: 201 })
})



export const handlerIntegrationsGateway = [
  getNamespaces,
  createNamespace,
  updateNamespace,
  deleteNamespace,
  getRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
  listApiKeys,
  createApiKey,
  deleteApiKey,
  listInvocations,
  listToolSpecs,
  quickSetup,
  quickSetupConfirm,
]
