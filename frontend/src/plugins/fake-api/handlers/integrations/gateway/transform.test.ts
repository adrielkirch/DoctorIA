import { db } from '@db/integrations/gateway/db'
import { handlerGatewayDispatch } from '@db/integrations/gateway/dispatch'
import { handlerIntegrationsGateway } from '@db/integrations/gateway/index'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

const allHandlers = [...handlerIntegrationsGateway, ...handlerGatewayDispatch]
const server = setupServer(...allHandlers)

const initialNamespaces = structuredClone(db.namespaces)
const initialRoutes = structuredClone(db.routes)

const BASE = 'http://localhost/api/integrations/gateway'
const GW = 'http://localhost/api/gw'
const UPSTREAM = 'http://localhost/api/integrations/gateway/_upstream'

/** Token fake (payload { id }) — admin (id 1) tem todas as permissions. */
function tokenFor(userId: number): string {
  const payload = btoa(JSON.stringify({ id: userId }))

  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.fake-signature`
}

const HEADERS = { 'content-type': 'application/json', 'x-workspace-id': 'workspace-alpha' }

/** CRUD admin (Authorization com token id 1 — tem gateway.view/manage). */
const CRUD_HEADERS = { ...HEADERS, 'Authorization': `Bearer ${tokenFor(1)}` }
const HEADERS_USER = { ...HEADERS, 'x-actor-role': 'user', 'authorization': 'Bearer token-user' }

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => {
  server.resetHandlers()
  db.namespaces.splice(0, db.namespaces.length, ...structuredClone(initialNamespaces))
  db.routes.splice(0, db.routes.length, ...structuredClone(initialRoutes))
  db.extractionJobs.splice(0, db.extractionJobs.length)
  db.extractionProposals.splice(0, db.extractionProposals.length)
})
afterAll(() => server.close())



describe('JSONata transforms (Fase 3)', () => {
  async function createProxyRoute(namespaceId: string, payload: Record<string, unknown>) {
    return await fetch(`${BASE}/namespaces/${namespaceId}/routes`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ method: 'GET', path: '/customers', mode: 'PROXY', upstreamUrl: `${UPSTREAM}/customers`, ...payload }),
    })
  }

  it('rejects routes with an invalid requestTransform expression', async () => {
    const res = await createProxyRoute('ns-whatsapp', { requestTransform: '{"broken": ' })

    expect(res.status).toBe(400)

    const body = await res.json()

    expect(body.message).toContain('requestTransform')
  })

  it('rejects routes with an invalid responseTransform expression', async () => {
    const res = await createProxyRoute('ns-whatsapp', { responseTransform: '$$$ not jsonata' })

    expect(res.status).toBe(400)
  })

  it('accepts valid transforms on create and update', async () => {
    const createRes = await createProxyRoute('ns-whatsapp', {
      requestTransform: '{"customer": $.name}',
      responseTransform: '{"ok": true}',
    })

    expect(createRes.status).toBe(201)

    const { route } = await createRes.json()

    expect(route.requestTransform).toBe('{"customer": $.name}')

    const updateRes = await fetch(`${BASE}/namespaces/ns-whatsapp/routes/${route.id}`, {
      method: 'PUT',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ responseTransform: '{"id": $.id}' }),
    })

    expect(updateRes.status).toBe(200)
  })

  it('normalizes the upstream response body through responseTransform', async () => {

    const nsRes = await fetch(`${BASE}/namespaces`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ slug: 'crm-norm', displayName: 'CRM Norm', baseUrl: UPSTREAM }),
    })

    const { namespace } = await nsRes.json()

    await createProxyRoute(namespace.id, {
      responseTransform: '{"route": $.proxiedFrom.path, "healthy": true}',
    })

    const gwRes = await fetch(`${GW}/crm-norm/customers`, { headers: HEADERS_USER })

    expect(gwRes.status).toBe(200)

    const body = await gwRes.json()

    expect(body).toEqual({ route: '/customers', healthy: true })
  })

  it('maps the client payload to the upstream shape through requestTransform', async () => {
    const nsRes = await fetch(`${BASE}/namespaces`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ slug: 'crm-map', displayName: 'CRM Map', baseUrl: UPSTREAM }),
    })

    const { namespace } = await nsRes.json()

    const routeRes = await fetch(`${BASE}/namespaces/${namespace.id}/routes`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ method: 'POST', path: '/customers', mode: 'PROXY', requestTransform: '{"customer": $.name, "total": $.amount}' }),
    })

    expect(routeRes.status).toBe(201)

    const gwRes = await fetch(`${GW}/crm-map/customers`, {
      method: 'POST',
      headers: { ...HEADERS_USER, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Ada', amount: 100 }),
    })

    expect(gwRes.status).toBe(200)

    const body = await gwRes.json()


    expect(body.body).toEqual({ customer: 'Ada', total: 100 })
  })

  it('returns 400 when requestTransform receives a non-JSON body', async () => {
    const nsRes = await fetch(`${BASE}/namespaces`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ slug: 'crm-badbody', displayName: 'CRM BadBody', baseUrl: UPSTREAM }),
    })

    const { namespace } = await nsRes.json()

    const routeRes = await fetch(`${BASE}/namespaces/${namespace.id}/routes`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ method: 'POST', path: '/customers', mode: 'PROXY', requestTransform: '{"x": 1}' }),
    })

    expect(routeRes.status).toBe(201)

    const gwRes = await fetch(`${GW}/crm-badbody/customers`, {
      method: 'POST',
      headers: { ...HEADERS_USER, 'content-type': 'text/plain' },
      body: 'not-json',
    })

    expect(gwRes.status).toBe(400)

    const body = await gwRes.json()

    expect(body.code).toBe('REQUEST_TRANSFORM_REQUIRES_JSON')
  })

  it('exposes path params and query to the transform environment', async () => {
    const nsRes = await fetch(`${BASE}/namespaces`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ slug: 'crm-env', displayName: 'CRM Env', baseUrl: UPSTREAM }),
    })

    const { namespace } = await nsRes.json()

    await fetch(`${BASE}/namespaces/${namespace.id}/routes`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ method: 'GET', path: '/customers/:id', mode: 'PROXY', responseTransform: '{"id": $params.id, "limit": $query.limit}' }),
    })

    const gwRes = await fetch(`${GW}/crm-env/customers/42?limit=7`, { headers: HEADERS_USER })

    expect(gwRes.status).toBe(200)

    const body = await gwRes.json()

    expect(body).toEqual({ id: '42', limit: '7' })
  })
})
