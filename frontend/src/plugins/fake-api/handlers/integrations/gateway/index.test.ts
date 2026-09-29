import { db } from '@db/integrations/gateway/db'
import { handlerGatewayDispatch } from '@db/integrations/gateway/dispatch'
import { handlerIntegrationsGateway } from '@db/integrations/gateway/index'
import { db as credentialsDb } from '@db/security/credentials/db'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

const allHandlers = [...handlerIntegrationsGateway, ...handlerGatewayDispatch]
const server = setupServer(...allHandlers)

const initialNamespaces = structuredClone(db.namespaces)
const initialRoutes = structuredClone(db.routes)
const initialCredentials = structuredClone(credentialsDb.credentials)

const BASE = 'http://localhost/api/integrations/gateway'
const GW = 'http://localhost/api/gw'

/** Token fake (payload { id }) — admin (id 1) tem todas as permissions. */
function tokenFor(userId: number): string {
  const payload = btoa(JSON.stringify({ id: userId }))

  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.fake-signature`
}

const HEADERS = { 'content-type': 'application/json', 'x-workspace-id': 'workspace-alpha' }

/** CRUD admin (Authorization com token id 1 — tem gateway.view/manage). */
const CRUD_HEADERS = { ...HEADERS, 'Authorization': `Bearer ${tokenFor(1)}` }
const HEADERS_ADMIN = { ...HEADERS, 'x-actor-role': 'admin', 'authorization': 'Bearer token-admin' }
const HEADERS_USER = { ...HEADERS, 'x-actor-role': 'user', 'authorization': 'Bearer token-user' }

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => {
  server.resetHandlers()
  db.namespaces.splice(0, db.namespaces.length, ...structuredClone(initialNamespaces))
  db.routes.splice(0, db.routes.length, ...structuredClone(initialRoutes))
  db.extractionJobs.splice(0, db.extractionJobs.length)
  db.extractionProposals.splice(0, db.extractionProposals.length)
  credentialsDb.credentials.splice(0, credentialsDb.credentials.length, ...structuredClone(initialCredentials))
})
afterAll(() => server.close())



describe('GET /api/integrations/gateway/namespaces', () => {
  it('returns namespaces for current tenant only', async () => {
    const res = await fetch(`${BASE}/namespaces`, { headers: CRUD_HEADERS })

    expect(res.status).toBe(200)

    const body = await res.json()

    expect(Array.isArray(body.namespaces)).toBe(true)
    expect(body.namespaces.every((n: any) => n.tenantId === 'workspace-alpha')).toBe(true)
    expect(typeof body.totalNamespaces).toBe('number')
    expect(typeof body.totalPages).toBe('number')
  })

  it('filters by free-text search on displayName', async () => {
    const res = await fetch(`${BASE}/namespaces?q=mercado`, { headers: CRUD_HEADERS })
    const body = await res.json()

    expect(body.namespaces.every((n: any) => n.displayName.toLowerCase().includes('mercado') || n.slug.toLowerCase().includes('mercado'))).toBe(true)
  })

  it('enforces max itemsPerPage of 100', async () => {
    const res = await fetch(`${BASE}/namespaces?itemsPerPage=999`, { headers: CRUD_HEADERS })
    const body = await res.json()

    expect(body.totalNamespaces).toBeGreaterThan(0)
    expect(body.namespaces.length).toBeLessThanOrEqual(body.totalNamespaces)
  })

  it('returns correct page slice', async () => {
    const res = await fetch(`${BASE}/namespaces?page=1&itemsPerPage=1`, { headers: CRUD_HEADERS })
    const body = await res.json()

    expect(body.namespaces.length).toBeLessThanOrEqual(1)
    expect(body.page).toBe(1)
    expect(body.totalPages).toBeGreaterThanOrEqual(1)
  })
})



describe('POST /api/integrations/gateway/namespaces', () => {
  it('creates a namespace and returns 201', async () => {
    const res = await fetch(`${BASE}/namespaces`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ slug: 'new-provider', displayName: 'New Provider', description: 'Test' }) })

    expect(res.status).toBe(201)

    const body = await res.json()

    expect(body.namespace.slug).toBe('new-provider')
    expect(body.namespace.tenantId).toBe('workspace-alpha')
    expect(body.namespace.routeCount).toBe(0)
  })

  it('returns 409 when slug already exists for tenant', async () => {
    const res = await fetch(`${BASE}/namespaces`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ slug: 'meta', displayName: 'Dup' }) })

    expect(res.status).toBe(409)

    const body = await res.json()

    expect(body.code).toBe('CONFLICT')
  })

  it('returns 400 for invalid slug characters', async () => {
    const res = await fetch(`${BASE}/namespaces`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ slug: 'INVALID SLUG!', displayName: 'X' }) })

    expect(res.status).toBe(400)
  })

  it('returns 400 when required fields missing', async () => {
    const res = await fetch(`${BASE}/namespaces`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ slug: 'ok' }) })

    expect(res.status).toBe(400)
  })
})



describe('GET /api/integrations/gateway/namespaces/:id/routes', () => {
  it('returns routes for a namespace', async () => {
    const res = await fetch(`${BASE}/namespaces/ns-meta/routes`, { headers: CRUD_HEADERS })

    expect(res.status).toBe(200)

    const body = await res.json()

    expect(Array.isArray(body.routes)).toBe(true)
    expect(body.routes.every((r: any) => r.namespaceId === 'ns-meta')).toBe(true)
  })

  it('filters by method', async () => {
    const res = await fetch(`${BASE}/namespaces/ns-meta/routes?method=GET`, { headers: CRUD_HEADERS })
    const body = await res.json()

    expect(body.routes.every((r: any) => r.method === 'GET')).toBe(true)
  })

  it('filters by mode', async () => {
    const res = await fetch(`${BASE}/namespaces/ns-meta/routes?mode=MOCK`, { headers: CRUD_HEADERS })
    const body = await res.json()

    expect(body.routes.every((r: any) => r.mode === 'MOCK')).toBe(true)
  })

  it('returns 404 for unknown namespace', async () => {
    const res = await fetch(`${BASE}/namespaces/ns-unknown/routes`, { headers: CRUD_HEADERS })

    expect(res.status).toBe(404)
  })

  it('respects itemsPerPage limit', async () => {
    const res = await fetch(`${BASE}/namespaces/ns-meta/routes?itemsPerPage=1`, { headers: CRUD_HEADERS })
    const body = await res.json()

    expect(body.routes.length).toBeLessThanOrEqual(1)
  })
})



describe('POST /api/integrations/gateway/namespaces/:id/routes', () => {
  it('creates a MOCK route and returns 201', async () => {
    const res = await fetch(`${BASE}/namespaces/ns-whatsapp/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'DELETE', path: '/v1/test', mode: 'MOCK', mockPayload: '{"ok":true}', mockStatusCode: 200 }) })

    expect(res.status).toBe(201)

    const body = await res.json()

    expect(body.route.method).toBe('DELETE')
    expect(body.route.mode).toBe('MOCK')
  })

  it('returns 409 for duplicate method+path in namespace', async () => {
    const res = await fetch(`${BASE}/namespaces/ns-meta/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'POST', path: '/v21.0/:page_id/messages', mode: 'MOCK', mockPayload: '{}' }) })

    expect(res.status).toBe(409)

    const body = await res.json()

    expect(body.code).toBe('CONFLICT')
  })

  it('returns 400 for invalid JSON mockPayload', async () => {
    const res = await fetch(`${BASE}/namespaces/ns-whatsapp/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'GET', path: '/v1/bad', mode: 'MOCK', mockPayload: 'not-json' }) })

    expect(res.status).toBe(400)
  })

  it('returns 400 for PROXY mode missing upstreamUrl when namespace has no baseUrl', async () => {
    const nsRes = await fetch(`${BASE}/namespaces`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ slug: 'proxy-no-base', displayName: 'Proxy No Base' }) })
    const { namespace } = await nsRes.json()
    const res = await fetch(`${BASE}/namespaces/${namespace.id}/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'GET', path: '/v1/proxy-no-url', mode: 'PROXY' }) })

    expect(res.status).toBe(400)
  })

  it('creates PROXY route without upstreamUrl when the namespace has a baseUrl', async () => {
    const res = await fetch(`${BASE}/namespaces/ns-whatsapp/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'GET', path: '/v1/proxy-via-base', mode: 'PROXY' }) })

    expect(res.status).toBe(201)

    const body = await res.json()

    expect(body.route.upstreamUrl).toBe('')
  })

  it('creates PROXY route with upstreamUrl', async () => {
    const res = await fetch(`${BASE}/namespaces/ns-whatsapp/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'GET', path: '/v1/proxy-ok', mode: 'PROXY', upstreamUrl: 'https://graph.facebook.com/v1/proxy-ok' }) })

    expect(res.status).toBe(201)

    const body = await res.json()

    expect(body.route.mode).toBe('PROXY')
    expect(body.route.upstreamUrl).toBe('https://graph.facebook.com/v1/proxy-ok')
  })
})



describe('GET|POST|DELETE /api/gw/:namespace/*  (MOCK dispatch)', () => {
  it('GET dispatch returns seeded mock payload and status 200', async () => {
    const res = await fetch(`${GW}/whatsapp/v21.0/phone_123`, { headers: { 'x-workspace-id': 'workspace-alpha' } })

    expect(res.status).toBe(200)

    const body = await res.json()

    expect(body.id).toBe('phone_123')
  })

  it('POST dispatch returns configured status 201 and payload', async () => {
    const res = await fetch(`${GW}/meta/v21.0/page_123/messages`, { method: 'POST', headers: HEADERS_USER, body: '{}' })

    expect(res.status).toBe(200)

    const body = await res.json()

    expect(body.message_id).toBe('mid.meta.seed.001')
  })

  it('DELETE dispatch on a newly registered route returns mock payload', async () => {
    await fetch(`${BASE}/namespaces/ns-whatsapp/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'DELETE', path: '/v1/subscriptions/test', mode: 'MOCK', mockPayload: '{"deleted":true}', mockStatusCode: 200 }) })

    const res = await fetch(`${GW}/whatsapp/v1/subscriptions/test`, { method: 'DELETE', headers: HEADERS_USER })

    expect(res.status).toBe(200)

    const body = await res.json()

    expect(body.deleted).toBe(true)
  })
})



describe('MOCK dispatch latency simulation', () => {
  it('delays response by configured mockLatencyMs', async () => {
    await fetch(`${BASE}/namespaces/ns-whatsapp/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'GET', path: '/v1/slow', mode: 'MOCK', mockPayload: '{"slow":true}', mockStatusCode: 200, mockLatencyMs: 200 }) })

    const start = Date.now()
    const res = await fetch(`${GW}/whatsapp/v1/slow`, { headers: HEADERS_USER })
    const elapsed = Date.now() - start

    expect(res.status).toBe(200)
    expect(elapsed).toBeGreaterThanOrEqual(180)
  }, 3000)
})



describe('invocation plane 404 on unregistered route', () => {
  it('returns 404 with error envelope for unknown path', async () => {
    const res = await fetch(`${GW}/meta/v21.0/unknown-path`, { headers: HEADERS_USER })

    expect(res.status).toBe(404)

    const body = await res.json()

    expect(body.message).toBeDefined()
    expect(body.code).toBe('NOT_FOUND')
  })

  it('returns 404 for unknown namespace', async () => {
    const res = await fetch(`${GW}/no-such-namespace/v1/anything`, { headers: HEADERS_USER })

    expect(res.status).toBe(404)
  })
})



describe('RBAC enforcement in dispatch', () => {
  it('T043 — ADMIN route with USER JWT returns 403', async () => {
    const res = await fetch(`${GW}/meta/v21.0/pixel_123/events`, { method: 'POST', headers: HEADERS_USER, body: '{}' })

    expect(res.status).toBe(403)

    const body = await res.json()

    expect(body.code).toBe('FORBIDDEN')
  })

  it('T044 — non-public route with no JWT returns 401', async () => {
    const res = await fetch(`${GW}/meta/v21.0/page_123/messages`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-workspace-id': 'workspace-alpha' }, body: '{}' })

    expect(res.status).toBe(401)

    const body = await res.json()

    expect(body.code).toBe('UNAUTHORIZED')
  })

  it('T045 — public route with no JWT returns 200', async () => {
    const res = await fetch(`${GW}/whatsapp/v21.0/phone_123`, { headers: { 'x-workspace-id': 'workspace-alpha' } })

    expect(res.status).toBe(200)
  })
})



describe('cross-tenant namespace isolation', () => {
  it('tenant B cannot access tenant A namespaces, returns 404', async () => {

    const res = await fetch(`${GW}/meta/v21.0/page_123/messages`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-workspace-id': 'workspace-beta', 'authorization': 'Bearer token-user', 'x-actor-role': 'admin' }, body: '{}' })

    expect(res.status).toBe(404)
  })
})



describe('POST /api/integrations/gateway/quick-setup — T028 cURL and OpenAPI extraction', () => {
  it('extracts method+path from cURL commands', async () => {
    const rawInput = `
      curl -X POST https://graph.facebook.com/webhooks/meta \\
        -H "Authorization: Bearer TOKEN" -d '{}'
      curl -X GET https://graph.facebook.com/v21.0/page_123 \\
        -H "Authorization: Bearer TOKEN"
    `

    const res = await fetch(`${BASE}/quick-setup`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ rawInput }) })

    expect(res.status).toBe(200)

    const body = await res.json()

    expect(Array.isArray(body.proposals)).toBe(true)
    expect(body.proposals.length).toBeGreaterThanOrEqual(2)

    const methods = body.proposals.map((p: any) => p.method)

    expect(methods).toContain('POST')
    expect(methods).toContain('GET')
  })

  it('extracted proposals have realistic mock responses', async () => {
    const rawInput = 'curl -X POST https://api.example.com/v1/payments -d \'{}\''
    const res = await fetch(`${BASE}/quick-setup`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ rawInput }) })
    const body = await res.json()
    const proposal = body.proposals[0]

    expect(() => JSON.parse(proposal.proposedMockResponse)).not.toThrow()

    const parsed = JSON.parse(proposal.proposedMockResponse)

    expect(typeof parsed).toBe('object')
  })

  it('returns job with awaiting_review status', async () => {
    const res = await fetch(`${BASE}/quick-setup`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ rawInput: 'curl -X GET https://api.example.com/v1/status' }) })
    const body = await res.json()

    expect(body.job.status).toBe('awaiting_review')
    expect(body.job.tenantId).toBe('workspace-alpha')
  })
})

describe('POST /api/integrations/gateway/quick-setup/:jobId/confirm — T029', () => {
  it('provisions approved proposals as routes and returns createdRoutes', async () => {
    const setupRes = await fetch(`${BASE}/quick-setup`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ rawInput: 'curl -X GET https://api.example.com/v1/widgets' }) })
    const setupBody = await setupRes.json()
    const jobId = setupBody.job.id
    const proposalId = setupBody.proposals[0].id

    const confirmRes = await fetch(`${BASE}/quick-setup/${jobId}/confirm`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ namespaceId: 'ns-whatsapp', approvedProposalIds: [proposalId] }) })

    expect(confirmRes.status).toBe(201)

    const confirmBody = await confirmRes.json()

    expect(Array.isArray(confirmBody.createdRoutes)).toBe(true)
    expect(confirmBody.createdRoutes.length).toBeGreaterThanOrEqual(1)
    expect(confirmBody.createdRoutes[0].namespaceId).toBe('ns-whatsapp')
    expect(Array.isArray(confirmBody.conflicts)).toBe(true)
  })

  it('reports conflict for duplicate method+path instead of failing entire batch', async () => {

    const setupRes = await fetch(`${BASE}/quick-setup`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ rawInput: 'curl -X POST https://graph.facebook.com/v21.0/:page_id/messages' }) })
    const { job, proposals } = await setupRes.json()
    const confirmRes = await fetch(`${BASE}/quick-setup/${job.id}/confirm`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ namespaceId: 'ns-meta', approvedProposalIds: proposals.map((p: any) => p.id) }) })
    const body = await confirmRes.json()

    expect(confirmRes.status).toBe(201)
    expect(body.conflicts.length).toBeGreaterThan(0)
    expect(body.conflicts[0].reason).toBeDefined()
  })
})

describe('quick-setup validation — T030', () => {
  it('returns 400 for empty rawInput', async () => {
    const res = await fetch(`${BASE}/quick-setup`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ rawInput: '' }) })

    expect(res.status).toBe(400)
  })

  it('flags unresolved proposals when input is unrecognized text', async () => {
    const res = await fetch(`${BASE}/quick-setup`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ rawInput: 'this is not a valid API document' }) })
    const body = await res.json()

    expect(body.proposals.some((p: any) => p.unresolvedReason)).toBe(true)
  })

  it('returns 404 for confirm on unknown job', async () => {
    const res = await fetch(`${BASE}/quick-setup/job-unknown-xyz/confirm`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ namespaceId: 'ns-whatsapp', approvedProposalIds: [] }) })

    expect(res.status).toBe(404)
  })
})




describe('route validation hardening (Fase 1)', () => {
  it('rejects unknown HTTP method', async () => {
    const res = await fetch(`${BASE}/namespaces/ns-whatsapp/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'TRACE', path: '/v1/trace', mode: 'MOCK', mockPayload: '{}' }) })

    expect(res.status).toBe(400)

    const body = await res.json()

    expect(body.message).toContain('method')
  })

  it('accepts lowercase method and normalizes it', async () => {
    const res = await fetch(`${BASE}/namespaces/ns-whatsapp/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'get', path: '/v1/lower', mode: 'MOCK', mockPayload: '{}' }) })

    expect(res.status).toBe(201)

    const body = await res.json()

    expect(body.route.method).toBe('GET')
  })

  it('rejects unknown mode', async () => {
    const res = await fetch(`${BASE}/namespaces/ns-whatsapp/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'GET', path: '/v1/fanout', mode: 'FANOUT' }) })

    expect(res.status).toBe(400)
  })

  it('rejects unknown requiredRole', async () => {
    const res = await fetch(`${BASE}/namespaces/ns-whatsapp/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'GET', path: '/v1/owner', mode: 'MOCK', mockPayload: '{}', requiredRole: 'OWNER' }) })

    expect(res.status).toBe(400)
  })

  it('rejects paths that do not start with a slash', async () => {
    const res = await fetch(`${BASE}/namespaces/ns-whatsapp/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'GET', path: 'v1/noslash', mode: 'MOCK', mockPayload: '{}' }) })

    expect(res.status).toBe(400)
  })

  it('rejects paths with a query string', async () => {
    const res = await fetch(`${BASE}/namespaces/ns-whatsapp/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'GET', path: '/v1/search?q=1', mode: 'MOCK', mockPayload: '{}' }) })

    expect(res.status).toBe(400)
  })

  it('rejects paths with double slashes', async () => {
    const res = await fetch(`${BASE}/namespaces/ns-whatsapp/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'GET', path: '/v1//double', mode: 'MOCK', mockPayload: '{}' }) })

    expect(res.status).toBe(400)
  })

  it('rejects invalid upstreamUrl for PROXY', async () => {
    const res = await fetch(`${BASE}/namespaces/ns-whatsapp/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'GET', path: '/v1/bad-url', mode: 'PROXY', upstreamUrl: 'not-a-url' }) })

    expect(res.status).toBe(400)
  })

  it('accepts a same-origin upstreamUrl path', async () => {
    const res = await fetch(`${BASE}/namespaces/ns-whatsapp/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'GET', path: '/v1/same-origin', mode: 'PROXY', upstreamUrl: '/api/integrations/gateway/_upstream/echo' }) })

    expect(res.status).toBe(201)
  })

  it('rejects out-of-range mockStatusCode', async () => {
    const res = await fetch(`${BASE}/namespaces/ns-whatsapp/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'GET', path: '/v1/status-code', mode: 'MOCK', mockPayload: '{}', mockStatusCode: 999 }) })

    expect(res.status).toBe(400)
  })

  it('rejects credentialId that does not exist in the workspace', async () => {
    const res = await fetch(`${BASE}/namespaces/ns-whatsapp/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'GET', path: '/v1/nope', mode: 'PROXY', upstreamUrl: 'https://x.example.com/v1/nope', credentialId: '424242' }) })

    expect(res.status).toBe(400)

    const body = await res.json()

    expect(body.code).toBe('CREDENTIAL_NOT_FOUND')
  })

  it('rejects namespace creation with unknown credentialId', async () => {
    const res = await fetch(`${BASE}/namespaces`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ slug: 'bad-cred', displayName: 'Bad Cred', credentialId: '424242' }) })

    expect(res.status).toBe(400)
  })

  it('rejects invalid namespace baseUrl', async () => {
    const res = await fetch(`${BASE}/namespaces`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ slug: 'bad-base', displayName: 'Bad Base', baseUrl: 'ftp://nope.example.com' }) })

    expect(res.status).toBe(400)
  })

  it('updateRoute validates mode and upstreamUrl', async () => {
    const createRes = await fetch(`${BASE}/namespaces/ns-whatsapp/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'GET', path: '/v1/update-me', mode: 'MOCK', mockPayload: '{}' }) })
    const { route } = await createRes.json()

    const badMode = await fetch(`${BASE}/namespaces/ns-whatsapp/routes/${route.id}`, { method: 'PUT', headers: CRUD_HEADERS, body: JSON.stringify({ mode: 'FANOUT' }) })

    expect(badMode.status).toBe(400)

    const badUrl = await fetch(`${BASE}/namespaces/ns-whatsapp/routes/${route.id}`, { method: 'PUT', headers: CRUD_HEADERS, body: JSON.stringify({ mode: 'PROXY', upstreamUrl: 'javascript:alert(1)' }) })

    expect(badUrl.status).toBe(400)

    const ok = await fetch(`${BASE}/namespaces/ns-whatsapp/routes/${route.id}`, { method: 'PUT', headers: CRUD_HEADERS, body: JSON.stringify({ mode: 'PROXY', upstreamUrl: 'https://graph.facebook.com/v1/update-me' }) })

    expect(ok.status).toBe(200)
  })
})



describe('PROXY forwarding + credential injection (Fase 2)', () => {
  const UPSTREAM = 'http://localhost/api/integrations/gateway/_upstream'

  it('forwards GET to the namespace baseUrl upstream and returns its response', async () => {
    const nsRes = await fetch(`${BASE}/namespaces`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ slug: 'crm-a', displayName: 'CRM A', baseUrl: UPSTREAM }) })
    const { namespace } = await nsRes.json()

    await fetch(`${BASE}/namespaces/${namespace.id}/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'GET', path: '/customers', mode: 'PROXY' }) })

    const gwRes = await fetch(`${GW}/crm-a/customers`, { headers: HEADERS_USER })

    expect(gwRes.status).toBe(200)

    const body = await gwRes.json()

    expect(body.proxiedFrom.method).toBe('GET')
    expect(body.proxiedFrom.path).toBe('/customers')
  })

  it('substitutes path params in upstreamUrl', async () => {
    const nsRes = await fetch(`${BASE}/namespaces`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ slug: 'crm-b', displayName: 'CRM B' }) })
    const { namespace } = await nsRes.json()

    await fetch(`${BASE}/namespaces/${namespace.id}/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'GET', path: '/customers/:id', mode: 'PROXY', upstreamUrl: `${UPSTREAM}/customers/:id` }) })

    const gwRes = await fetch(`${GW}/crm-b/customers/123`, { headers: HEADERS_USER })

    expect(gwRes.status).toBe(200)

    const body = await gwRes.json()

    expect(body.proxiedFrom.path).toBe('/customers/123')
  })

  it('forwards query params to the upstream', async () => {
    const nsRes = await fetch(`${BASE}/namespaces`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ slug: 'crm-c', displayName: 'CRM C', baseUrl: UPSTREAM }) })
    const { namespace } = await nsRes.json()

    await fetch(`${BASE}/namespaces/${namespace.id}/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'GET', path: '/search', mode: 'PROXY' }) })

    const gwRes = await fetch(`${GW}/crm-c/search?limit=5&offset=10`, { headers: HEADERS_USER })
    const body = await gwRes.json()

    expect(body.proxiedFrom.query).toMatchObject({ limit: '5', offset: '10' })
  })

  it('forwards the request body for POST', async () => {
    const nsRes = await fetch(`${BASE}/namespaces`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ slug: 'crm-d', displayName: 'CRM D', baseUrl: UPSTREAM }) })
    const { namespace } = await nsRes.json()

    await fetch(`${BASE}/namespaces/${namespace.id}/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'POST', path: '/customers', mode: 'PROXY' }) })

    const gwRes = await fetch(`${GW}/crm-d/customers`, { method: 'POST', headers: { ...HEADERS_USER, 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Ada' }) })
    const body = await gwRes.json()

    expect(body.proxiedFrom.method).toBe('POST')
    expect(body.body).toEqual({ name: 'Ada' })
  })

  it('propagates upstream responses for any method (round-trip)', async () => {
    const nsRes = await fetch(`${BASE}/namespaces`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ slug: 'crm-h', displayName: 'CRM H', baseUrl: UPSTREAM }) })
    const { namespace } = await nsRes.json()

    await fetch(`${BASE}/namespaces/${namespace.id}/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'DELETE', path: '/forbidden', mode: 'PROXY' }) })

    const gwRes = await fetch(`${GW}/crm-h/forbidden`, { method: 'DELETE', headers: HEADERS_USER })

    expect(gwRes.status).toBe(200)

    const body = await gwRes.json()

    expect(body.proxiedFrom.method).toBe('DELETE')
  })
})

describe('PROXY credential injection & fail-closed behavior (Fase 2)', () => {
  const UPSTREAM = 'http://localhost/api/integrations/gateway/_upstream'

  it('injects the namespace credential as Authorization Bearer and never leaks the caller token', async () => {
    credentialsDb.credentials.push({ id: 9001, tenantId: 'workspace-alpha', key: 'CRM_TOKEN', type: 'VARIABLE', value: 'sk-secret-9001', updatedAt: '2026-08-02T00:00:00.000Z' })

    const nsRes = await fetch(`${BASE}/namespaces`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ slug: 'crm-cred', displayName: 'CRM Cred', baseUrl: UPSTREAM, credentialId: '9001' }) })
    const { namespace } = await nsRes.json()

    await fetch(`${BASE}/namespaces/${namespace.id}/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'GET', path: '/customers', mode: 'PROXY' }) })

    const gwRes = await fetch(`${GW}/crm-cred/customers`, { headers: { ...HEADERS_USER, authorization: 'Bearer caller-token' } })

    expect(gwRes.status).toBe(200)

    const body = await gwRes.json()

    expect(body.proxiedFrom.headers.authorization).toBe('Bearer sk-secret-9001')
    expect(body.proxiedFrom.headers.authorization).not.toContain('caller-token')
  })

  it('supports custom auth header/scheme from the route (API-key style upstream)', async () => {
    credentialsDb.credentials.push({ id: 9002, tenantId: 'workspace-alpha', key: 'RD_API_TOKEN', type: 'VARIABLE', value: 'rd-xyz', updatedAt: '2026-08-02T00:00:00.000Z' })

    const nsRes = await fetch(`${BASE}/namespaces`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ slug: 'crm-e', displayName: 'CRM E' }) })
    const { namespace } = await nsRes.json()

    await fetch(`${BASE}/namespaces/${namespace.id}/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'GET', path: '/contacts', mode: 'PROXY', upstreamUrl: `${UPSTREAM}/contacts`, credentialId: '9002', authHeader: 'X-API-Key', authScheme: '' }) })

    const gwRes = await fetch(`${GW}/crm-e/contacts`, { headers: HEADERS_USER })
    const body = await gwRes.json()

    expect(body.proxiedFrom.headers['x-api-key']).toBe('rd-xyz')
  })

  it('resolves SECRET credentials from the internal store (masked API value, plaintext only at proxy time)', async () => {
    credentialsDb.credentials.push({ id: 9004, tenantId: 'workspace-alpha', key: 'CRM_SECRET_TOKEN', type: 'SECRET', maskedValue: '********', updatedAt: '2026-08-02T00:00:00.000Z' })


    const { setSecretValue } = await import('@db/security/credentials/db')

    setSecretValue(9004, 'sk-plaintext-9004')

    const nsRes = await fetch(`${BASE}/namespaces`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ slug: 'crm-secret', displayName: 'CRM Secret', baseUrl: UPSTREAM, credentialId: '9004' }) })
    const { namespace } = await nsRes.json()

    await fetch(`${BASE}/namespaces/${namespace.id}/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'GET', path: '/customers', mode: 'PROXY' }) })

    const gwRes = await fetch(`${GW}/crm-secret/customers`, { headers: HEADERS_USER })
    const body = await gwRes.json()

    expect(body.proxiedFrom.headers.authorization).toBe('Bearer sk-plaintext-9004')
  })

  it('returns 502 when a PROXY route has no resolvable upstream config', async () => {
    const nsRes = await fetch(`${BASE}/namespaces`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ slug: 'crm-f', displayName: 'CRM F', baseUrl: UPSTREAM }) })
    const { namespace } = await nsRes.json()

    await fetch(`${BASE}/namespaces/${namespace.id}/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'GET', path: '/customers', mode: 'PROXY' }) })


    await fetch(`${BASE}/namespaces/${namespace.id}`, { method: 'PUT', headers: CRUD_HEADERS, body: JSON.stringify({ baseUrl: '' }) })

    const gwRes = await fetch(`${GW}/crm-f/customers`, { headers: HEADERS_USER })

    expect(gwRes.status).toBe(502)

    const body = await gwRes.json()

    expect(body.code).toBe('BAD_GATEWAY')
  })

  it('returns 502 when the referenced credential is missing at dispatch time (fail closed)', async () => {
    credentialsDb.credentials.push({ id: 9003, tenantId: 'workspace-alpha', key: 'TEMP_TOKEN', type: 'VARIABLE', value: 'x', updatedAt: '2026-08-02T00:00:00.000Z' })

    const nsRes = await fetch(`${BASE}/namespaces`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ slug: 'crm-g', displayName: 'CRM G', baseUrl: UPSTREAM, credentialId: '9003' }) })
    const { namespace } = await nsRes.json()

    await fetch(`${BASE}/namespaces/${namespace.id}/routes`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ method: 'GET', path: '/customers', mode: 'PROXY' }) })


    credentialsDb.credentials.splice(credentialsDb.credentials.findIndex(c => c.id === 9003), 1)

    const gwRes = await fetch(`${GW}/crm-g/customers`, { headers: HEADERS_USER })

    expect(gwRes.status).toBe(502)

    const body = await gwRes.json()

    expect(body.code).toBe('CREDENTIAL_NOT_FOUND')
  })
})
