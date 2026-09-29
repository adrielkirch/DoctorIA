import { clearApiKeyValues, clearRateBuckets, db, setApiKeyValue } from '@db/integrations/gateway/db'
import { handlerGatewayDispatch } from '@db/integrations/gateway/dispatch'
import { handlerIntegrationsGateway } from '@db/integrations/gateway/index'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

const allHandlers = [...handlerIntegrationsGateway, ...handlerGatewayDispatch]
const server = setupServer(...allHandlers)

const initialNamespaces = structuredClone(db.namespaces)
const initialRoutes = structuredClone(db.routes)
const initialApiKeys = structuredClone(db.apiKeys)

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
  db.apiKeys.splice(0, db.apiKeys.length, ...structuredClone(initialApiKeys))
  db.invocations.splice(0, db.invocations.length)
  clearApiKeyValues()
  setApiKeyValue('apikey-sandbox', 'gwk_demo-123456')
  clearRateBuckets()
})
afterAll(() => server.close())



describe('consumer API keys (Fase 4)', () => {
  async function makeNamespace(slug: string): Promise<string> {
    const nsRes = await fetch(`${BASE}/namespaces`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ slug, displayName: slug, baseUrl: UPSTREAM }),
    })

    const { namespace } = await nsRes.json()

    return namespace.id
  }

  async function makePublicRoute(namespaceId: string, path: string) {
    return fetch(`${BASE}/namespaces/${namespaceId}/routes`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ method: 'GET', path, mode: 'PROXY' }),
    })
  }

  async function createKey(namespaceId: string, name: string): Promise<{ id: string; key: string; maskedKey: string }> {
    const res = await fetch(`${BASE}/namespaces/${namespaceId}/api-keys`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ name }),
    })

    expect(res.status).toBe(201)

    const { apiKey } = await res.json()

    return apiKey
  }

  it('creates a key returning the full value once, then only exposes masked values', async () => {
    const nsId = await makeNamespace('crm-keys')
    const { id, key, maskedKey } = await createKey(nsId, 'Production')

    expect(key.startsWith('gwk_')).toBe(true)
    expect(maskedKey).not.toContain(key.slice(9))


    const listRes = await fetch(`${BASE}/namespaces/${nsId}/api-keys`, { headers: CRUD_HEADERS })
    const { apiKeys } = await listRes.json()

    expect(apiKeys.some((k: any) => k.id === id && k.key === undefined)).toBe(true)
    expect(apiKeys.some((k: any) => k.id === id && k.maskedKey)).toBe(true)
  })

  it('authenticates a private route via x-api-key', async () => {
    const nsId = await makeNamespace('crm-consumer')

    await makePublicRoute(nsId, '/customers')

    const { key } = await createKey(nsId, 'Consumer')

    const gwRes = await fetch(`${GW}/crm-consumer/customers`, { headers: { 'x-workspace-id': 'workspace-alpha', 'x-api-key': key } })

    expect(gwRes.status).toBe(200)
  })

  it('rejects invalid, revoked, and cross-namespace keys', async () => {
    const nsA = await makeNamespace('crm-a')
    const nsB = await makeNamespace('crm-b')

    await makePublicRoute(nsA, '/customers')
    await makePublicRoute(nsB, '/customers')

    const { id, key } = await createKey(nsA, 'Key A')


    const invalid = await fetch(`${GW}/crm-a/customers`, { headers: { 'x-workspace-id': 'workspace-alpha', 'x-api-key': 'gwk_wrong' } })

    expect(invalid.status).toBe(401)


    const cross = await fetch(`${GW}/crm-b/customers`, { headers: { 'x-workspace-id': 'workspace-alpha', 'x-api-key': key } })

    expect(cross.status).toBe(401)


    const del = await fetch(`${BASE}/namespaces/${nsA}/api-keys/${id}`, { method: 'DELETE', headers: CRUD_HEADERS })

    expect(del.status).toBe(204)

    const revoked = await fetch(`${GW}/crm-a/customers`, { headers: { 'x-workspace-id': 'workspace-alpha', 'x-api-key': key } })

    expect(revoked.status).toBe(401)
  })

  it('denies API keys on ADMIN-only routes', async () => {
    const nsId = await makeNamespace('crm-admin')

    await fetch(`${BASE}/namespaces/${nsId}/routes`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ method: 'DELETE', path: '/destroy', mode: 'PROXY', requiredRole: 'ADMIN' }),
    })

    const { key } = await createKey(nsId, 'Adminless')

    const gwRes = await fetch(`${GW}/crm-admin/destroy`, { method: 'DELETE', headers: { 'x-workspace-id': 'workspace-alpha', 'x-api-key': key } })

    expect(gwRes.status).toBe(403)
  })
})



describe('rate limit (Fase 4)', () => {
  it('rejects requests beyond the configured limit with 429', async () => {
    const nsRes = await fetch(`${BASE}/namespaces`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ slug: 'crm-limited', displayName: 'Limited', baseUrl: UPSTREAM }),
    })

    const { namespace } = await nsRes.json()

    const routeRes = await fetch(`${BASE}/namespaces/${namespace.id}/routes`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ method: 'GET', path: '/customers', mode: 'PROXY', rateLimit: { limit: 2, windowSec: 60 } }),
    })

    expect(routeRes.status).toBe(201)

    const first = await fetch(`${GW}/crm-limited/customers`, { headers: HEADERS_USER })
    const second = await fetch(`${GW}/crm-limited/customers`, { headers: HEADERS_USER })

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)

    const third = await fetch(`${GW}/crm-limited/customers`, { headers: HEADERS_USER })

    expect(third.status).toBe(429)

    const body = await third.json()

    expect(body.code).toBe('RATE_LIMITED')
  })

  it('inherits the namespace rate limit when the route defines none', async () => {
    const nsRes = await fetch(`${BASE}/namespaces`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ slug: 'crm-inherit', displayName: 'Inherit', baseUrl: UPSTREAM, rateLimit: { limit: 1, windowSec: 60 } }),
    })

    const { namespace } = await nsRes.json()

    await fetch(`${BASE}/namespaces/${namespace.id}/routes`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ method: 'GET', path: '/customers', mode: 'PROXY' }),
    })

    const first = await fetch(`${GW}/crm-inherit/customers`, { headers: HEADERS_USER })

    expect(first.status).toBe(200)

    const second = await fetch(`${GW}/crm-inherit/customers`, { headers: HEADERS_USER })

    expect(second.status).toBe(429)
  })
})



describe('invocation audit log (Fase 4)', () => {
  it('records every dispatch with status, actor type and latency', async () => {
    const nsRes = await fetch(`${BASE}/namespaces`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ slug: 'crm-audit', displayName: 'Audit', baseUrl: UPSTREAM }),
    })

    const { namespace } = await nsRes.json()

    await fetch(`${BASE}/namespaces/${namespace.id}/routes`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ method: 'GET', path: '/customers', mode: 'PROXY' }),
    })

    const gwRes = await fetch(`${GW}/crm-audit/customers`, { headers: HEADERS_USER })

    expect(gwRes.status).toBe(200)


    await fetch(`${GW}/crm-audit/customers`, { headers: { 'x-workspace-id': 'workspace-alpha' } })

    const logRes = await fetch(`${BASE}/namespaces/${namespace.id}/invocations`, { headers: CRUD_HEADERS })
    const { invocations, totalInvocations } = await logRes.json()

    expect(totalInvocations).toBe(2)
    expect(invocations[0].status).toBe(200)
    expect(invocations[0].actorType).toBe('jwt')
    expect(invocations[0].routeId).toBeTruthy()
    expect(typeof invocations[0].latencyMs).toBe('number')
    expect(invocations[1].status).toBe(401)
    expect(invocations[1].actorType).toBe('none')
  })

  it('records API key actors by key id', async () => {
    const nsRes = await fetch(`${BASE}/namespaces`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ slug: 'crm-audit-key', displayName: 'Audit Key', baseUrl: UPSTREAM }),
    })

    const { namespace } = await nsRes.json()

    await fetch(`${BASE}/namespaces/${namespace.id}/routes`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ method: 'GET', path: '/customers', mode: 'PROXY' }),
    })

    const keyRes = await fetch(`${BASE}/namespaces/${namespace.id}/api-keys`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ name: 'Audit Key' }),
    })

    const { apiKey } = await keyRes.json()

    await fetch(`${GW}/crm-audit-key/customers`, { headers: { 'x-workspace-id': 'workspace-alpha', 'x-api-key': apiKey.key } })

    const logRes = await fetch(`${BASE}/namespaces/${namespace.id}/invocations`, { headers: CRUD_HEADERS })
    const { invocations } = await logRes.json()

    expect(invocations[0].actorType).toBe('api_key')
    expect(invocations[0].actorId).toBe(apiKey.id)
  })
})
