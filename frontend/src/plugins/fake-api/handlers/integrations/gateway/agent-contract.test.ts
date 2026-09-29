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



describe('agent-facing contract (Fase 5)', () => {
  it('persists request/response schemas and rejects non-object schemas', async () => {
    const createRes = await fetch(`${BASE}/namespaces/ns-whatsapp/routes`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({
        method: 'POST',
        path: '/v1/payments',
        mode: 'MOCK',
        mockPayload: '{}',
        requestSchema: {
          type: 'object',
          required: ['amount'],
          properties: { amount: { type: 'number' } },
        },
        responseSchema: { type: 'object', properties: { id: { type: 'integer' } } },
      }),
    })

    expect(createRes.status).toBe(201)

    const { route } = await createRes.json()

    expect(route.requestSchema.properties.amount.type).toBe('number')
    expect(route.responseSchema.properties.id.type).toBe('integer')

    const badRes = await fetch(`${BASE}/namespaces/ns-whatsapp/routes`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ method: 'GET', path: '/v1/bad', mode: 'MOCK', mockPayload: '{}', requestSchema: ['nope'] }),
    })

    expect(badRes.status).toBe(400)
  })

  it('exposes tool-specs with inferred response schema and auth contract', async () => {

    db.namespaces.push({
      id: 'ns-agent',
      tenantId: 'workspace-alpha',
      slug: 'agent-crm',
      displayName: 'Agent CRM',
      description: '',
      baseUrl: '',
      routeCount: 2,
      createdAt: '2026-08-02T00:00:00.000Z',
      updatedAt: '2026-08-02T00:00:00.000Z',
      createdBy: 'user-admin',
    })
    db.routes.push(
      {
        id: 'route-agent-public',
        namespaceId: 'ns-agent',
        tenantId: 'workspace-alpha',
        method: 'GET',
        path: '/status',
        mode: 'MOCK',
        isPublic: true,
        requiredRole: 'ALL',
        enabled: true,
        mockPayload: '{"status":"ok"}',
        mockStatusCode: 200,
        mockLatencyMs: 0,
        upstreamUrl: '',
        description: 'Health check',
        createdAt: '2026-08-02T00:00:00.000Z',
        updatedAt: '2026-08-02T00:00:00.000Z',
      },
      {
        id: 'route-agent-customer',
        namespaceId: 'ns-agent',
        tenantId: 'workspace-alpha',
        method: 'GET',
        path: '/customers/:id',
        mode: 'PROXY',
        isPublic: false,
        requiredRole: 'USER',
        enabled: true,
        mockPayload: '{"id": 1, "name": "Ada"}',
        mockStatusCode: 200,
        mockLatencyMs: 0,
        upstreamUrl: `${UPSTREAM}/customers/:id`,
        description: 'Fetch a customer by id',
        createdAt: '2026-08-02T00:00:00.000Z',
        updatedAt: '2026-08-02T00:00:00.000Z',
      },
    )

    const res = await fetch(`${BASE}/namespaces/ns-agent/tool-specs`, { headers: CRUD_HEADERS })

    expect(res.status).toBe(200)

    const { tools } = await res.json()

    expect(tools).toHaveLength(2)

    const statusTool = tools.find((t: any) => t.name === 'agent-crm_get_status')

    expect(statusTool.auth).toBe('public')
    expect(statusTool.responseSchema).toEqual({
      type: 'object',
      properties: { status: { type: 'string' } },
      required: ['status'],
    })

    const customerTool = tools.find((t: any) => t.name === 'agent-crm_get_customers_id')

    expect(customerTool.auth).toBe('api_key')
    expect(customerTool.inputSchema.properties.path.required).toEqual(['id'])
    expect(customerTool.inputSchema.properties.path.properties.id.type).toBe('string')
    expect(customerTool.responseSchema.properties.name.type).toBe('string')
  })

  it('scopes rate limits per API key', async () => {
    const nsRes = await fetch(`${BASE}/namespaces`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ slug: 'crm-keyed', displayName: 'Keyed', baseUrl: UPSTREAM }),
    })

    const { namespace } = await nsRes.json()

    await fetch(`${BASE}/namespaces/${namespace.id}/routes`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ method: 'GET', path: '/customers', mode: 'PROXY', rateLimit: { limit: 1, windowSec: 60 } }),
    })

    const keyARes = await fetch(`${BASE}/namespaces/${namespace.id}/api-keys`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ name: 'Key A' }) })
    const { apiKey: keyA } = await keyARes.json()
    const keyBRes = await fetch(`${BASE}/namespaces/${namespace.id}/api-keys`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ name: 'Key B' }) })
    const { apiKey: keyB } = await keyBRes.json()

    const a1 = await fetch(`${GW}/crm-keyed/customers`, { headers: { 'x-workspace-id': 'workspace-alpha', 'x-api-key': keyA.key } })
    const a2 = await fetch(`${GW}/crm-keyed/customers`, { headers: { 'x-workspace-id': 'workspace-alpha', 'x-api-key': keyA.key } })
    const b1 = await fetch(`${GW}/crm-keyed/customers`, { headers: { 'x-workspace-id': 'workspace-alpha', 'x-api-key': keyB.key } })

    expect(a1.status).toBe(200)
    expect(a2.status).toBe(429)
    expect(b1.status).toBe(200) // key B has its own bucket
  })

  it('records body previews in the audit log (MOCK response + PROXY transformed request)', async () => {

    const mockNsRes = await fetch(`${BASE}/namespaces`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ slug: 'crm-logmock', displayName: 'Log Mock' }) })
    const { namespace: mockNs } = await mockNsRes.json()

    const mockRouteRes = await fetch(`${BASE}/namespaces/${mockNs.id}/routes`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ method: 'GET', path: '/status', mode: 'MOCK', mockPayload: '{"status":"ok"}' }),
    })

    const { route: mockRoute } = await mockRouteRes.json()

    await fetch(`${GW}/crm-logmock/status`, { headers: HEADERS_USER })


    const proxyNsRes = await fetch(`${BASE}/namespaces`, { method: 'POST', headers: CRUD_HEADERS, body: JSON.stringify({ slug: 'crm-logproxy', displayName: 'Log Proxy', baseUrl: UPSTREAM }) })
    const { namespace: proxyNs } = await proxyNsRes.json()

    const proxyRouteRes = await fetch(`${BASE}/namespaces/${proxyNs.id}/routes`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ method: 'POST', path: '/customers', mode: 'PROXY', requestTransform: '{"customer": $.name}' }),
    })

    const { route: proxyRoute } = await proxyRouteRes.json()

    await fetch(`${GW}/crm-logproxy/customers`, {
      method: 'POST',
      headers: { ...HEADERS_USER, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Ada' }),
    })

    const mockLog = await fetch(`${BASE}/namespaces/${mockNs.id}/invocations`, { headers: CRUD_HEADERS })
    const { invocations: mockLogs } = await mockLog.json()

    expect(mockLogs[0].responseBodyPreview).toBe('{"status":"ok"}')

    const proxyLog = await fetch(`${BASE}/namespaces/${proxyNs.id}/invocations`, { headers: CRUD_HEADERS })
    const { invocations: proxyLogs } = await proxyLog.json()

    expect(proxyLogs[0].requestBodyPreview).toBe('{"customer":"Ada"}')
  })
})
