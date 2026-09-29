import { db } from '@db/integrations/gateway/db'
import { handlerGatewayDispatch } from '@db/integrations/gateway/dispatch'
import { handlerGatewayWebhooks, processDelivery } from '@db/integrations/gateway/webhooks'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

const server = setupServer(...handlerGatewayWebhooks, ...handlerGatewayDispatch)

const initialWebhooks = structuredClone(db.webhooks)
const initialDeliveries = structuredClone(db.deliveries)

const BASE = 'http://localhost/api/integrations/gateway'

/** Token fake (payload { id }) — admin (id 1) tem todas as permissions. */
function tokenFor(userId: number): string {
  const payload = btoa(JSON.stringify({ id: userId }))

  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.fake-signature`
}

const HEADERS = { 'content-type': 'application/json', 'x-workspace-id': 'workspace-alpha' }

/** CRUD admin (Authorization com token id 1 — tem gateway.view/manage). */
const CRUD_HEADERS = { ...HEADERS, 'Authorization': `Bearer ${tokenFor(1)}` }

/** CRUD admin no tenant beta. */
const CRUD_HEADERS_BETA = { ...CRUD_HEADERS, 'x-workspace-id': 'workspace-beta' }
const HEADERS_BETA = { 'content-type': 'application/json', 'x-workspace-id': 'workspace-beta' }

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => {
  server.resetHandlers()
  db.webhooks.splice(0, db.webhooks.length, ...structuredClone(initialWebhooks))
  db.deliveries.splice(0, db.deliveries.length, ...structuredClone(initialDeliveries))
})
afterAll(() => server.close())

const NS = 'ns-meta'



describe('GET /namespaces/:id/webhooks', () => {
  it('lists webhooks for the namespace, tenant-scoped', async () => {
    const res = await fetch(`${BASE}/namespaces/${NS}/webhooks`, { headers: CRUD_HEADERS })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(Array.isArray(body.webhooks)).toBe(true)
    expect(body.webhooks.length).toBeGreaterThan(0)
    expect(body.webhooks.every((w: any) => w.tenantId === 'workspace-alpha' && w.namespaceId === NS)).toBe(true)
    expect(typeof body.totalWebhooks).toBe('number')
  })

  it('filters by status', async () => {
    const res = await fetch(`${BASE}/namespaces/${NS}/webhooks?status=inactive`, { headers: CRUD_HEADERS })
    const body = await res.json()

    expect(body.webhooks.every((w: any) => w.status === 'inactive')).toBe(true)
  })

  it('404 when the namespace belongs to another tenant', async () => {
    const res = await fetch(`${BASE}/namespaces/${NS}/webhooks`, { headers: CRUD_HEADERS_BETA })
    expect(res.status).toBe(404)
  })
})



describe('POST /namespaces/:id/webhooks', () => {
  it('creates a webhook and returns the full secret exactly once', async () => {
    const res = await fetch(`${BASE}/namespaces/${NS}/webhooks`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ name: 'My Hook', targetUrl: '/api/integrations/gateway/_upstream/echo/webhook/x', events: ['route.invoked'] }),
    })
    expect(res.status).toBe(201)

    const body = await res.json()
    expect(body.webhook.name).toBe('My Hook')
    expect(body.webhook.maskedSecret).toMatch(/^whsec_.*\*\*\*\*.*$/)
    expect(body.secret).toMatch(/^whsec_/)
    expect(body.webhook.maskedSecret).not.toContain(body.secret)
  })

  it('rejects missing name', async () => {
    const res = await fetch(`${BASE}/namespaces/${NS}/webhooks`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ targetUrl: 'https://x.com/hook', events: ['route.invoked'] }),
    })
    expect(res.status).toBe(400)
  })

  it('rejects invalid target URL', async () => {
    const res = await fetch(`${BASE}/namespaces/${NS}/webhooks`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ name: 'X', targetUrl: 'not-a-url', events: ['route.invoked'] }),
    })
    expect(res.status).toBe(400)
  })

  it('rejects empty events', async () => {
    const res = await fetch(`${BASE}/namespaces/${NS}/webhooks`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ name: 'X', targetUrl: 'https://x.com/hook', events: [] }),
    })
    expect(res.status).toBe(400)
  })
})



describe('PUT / DELETE webhooks', () => {
  it('updates the webhook and regenerates the secret when asked', async () => {
    const beforeMasked = db.webhooks.find(w => w.id === 'wh-meta-messages')!.maskedSecret

    const res = await fetch(`${BASE}/namespaces/${NS}/webhooks/wh-meta-messages`, {
      method: 'PUT',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ status: 'inactive', regenerateSecret: true }),
    })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.webhook.status).toBe('inactive')
    expect(body.webhook.maskedSecret).not.toBe(beforeMasked)
    expect(body.secret).toMatch(/^whsec_/)
  })

  it('deletes the webhook and its deliveries', async () => {
    const res = await fetch(`${BASE}/namespaces/${NS}/webhooks/wh-meta-messages`, {
      method: 'DELETE',
      headers: CRUD_HEADERS,
    })
    expect(res.status).toBe(204)
    expect(db.webhooks.some(w => w.id === 'wh-meta-messages')).toBe(false)
    expect(db.deliveries.some(d => d.webhookId === 'wh-meta-messages')).toBe(false)
  })
})



describe('Deliveries', () => {
  it('lists delivery history with attempt metadata', async () => {
    const res = await fetch(`${BASE}/namespaces/${NS}/webhooks/wh-meta-messages/deliveries`, { headers: CRUD_HEADERS })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.deliveries.length).toBeGreaterThan(0)
    expect(body.deliveries.some((d: any) => d.status === 'delivered')).toBe(true)
    expect(typeof body.deliveries[0].attempts[0].attempt).toBe('number')
  })

  it('POST test enqueues a delivery that reaches delivered via the echo upstream', async () => {
    const res = await fetch(`${BASE}/namespaces/${NS}/webhooks/wh-meta-messages/test`, { method: 'POST', headers: CRUD_HEADERS })
    expect(res.status).toBe(200)


    await sleep(350)

    const delivery = db.deliveries.find(d => d.webhookId === 'wh-meta-messages' && d.event === 'webhook.test')
    expect(delivery).toBeDefined()
    expect(delivery!.status).toBe('delivered')
    expect(delivery!.attempts[0].httpStatus).toBe(200)
    expect(delivery!.attempts[0].responseTimeMs).toBeGreaterThanOrEqual(0)
  })

  it('retry re-enqueues a failed delivery as pending', async () => {
    const before = db.deliveries.find(d => d.id === 'whd-2')!
    expect(before.status).toBe('failed')

    const res = await fetch(`${BASE}/namespaces/ns-whatsapp/webhooks/wh-whatsapp-messages/deliveries/whd-2/retry`, { method: 'POST', headers: CRUD_HEADERS })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.delivery.status).toBe('pending')
    expect(body.delivery.isDeadLetter).toBe(false)
  })

  it('retry rejects delivered deliveries with 409', async () => {
    const res = await fetch(`${BASE}/namespaces/${NS}/webhooks/wh-meta-messages/deliveries/whd-1/retry`, { method: 'POST', headers: CRUD_HEADERS })
    expect(res.status).toBe(409)
  })

  it('engine: failing target retries with backoff and lands in DLQ after maxAttempts', async () => {

    const created = await (await fetch(`${BASE}/namespaces/${NS}/webhooks`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ name: 'Failer', targetUrl: 'https://fail.example/hook', events: ['route.invoked'] }),
    })).json() as { webhook: { id: string } }

    await fetch(`${BASE}/namespaces/${NS}/webhooks/${created.webhook.id}/test`, { method: 'POST', headers: CRUD_HEADERS })


    const delivery = db.deliveries.find(d => d.webhookId === created.webhook.id)!
    for (let i = 0; i < 5; i++) {
      if (delivery.status !== 'pending')
        break
      await processDelivery(delivery)
    }

    expect(delivery.attempts.length).toBe(5)
    expect(delivery.status).toBe('failed')
    expect(delivery.isDeadLetter).toBe(true)
    expect(delivery.attempts[0].error).toBe('UPSTREAM_500')
  })
})



describe('Dispatch → webhook delivery', () => {
  const AUTH = { 'content-type': 'application/json', 'x-workspace-id': 'workspace-alpha', 'x-actor-role': 'user', 'authorization': 'Bearer token-user' }

  it('invoking a route enqueues a route.invoked delivery delivered via the echo upstream', async () => {
    const res = await fetch('http://localhost/api/gw/meta/v21.0/page_123/messages', {
      method: 'POST',
      headers: AUTH,
      body: JSON.stringify({ amount: 100 }),
    })
    expect(res.status).toBe(200)


    await sleep(400)

    const delivery = db.deliveries.find(d => d.webhookId === 'wh-meta-messages' && d.event === 'route.invoked' && d.payload.includes('meta'))
    expect(delivery).toBeDefined()
    expect(delivery!.status).toBe('delivered')
    expect(delivery!.attempts[0].httpStatus).toBe(200)
    expect(delivery!.eventId).toMatch(/^wh_evt_/)
    expect(delivery!.correlationId).toMatch(/^req_/)
  })
})

