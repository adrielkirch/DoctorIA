import { clearApiKeyValues, clearRateBuckets, db } from '@db/integrations/gateway/db'
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

function tokenFor(userId: number): string {
  const payload = btoa(JSON.stringify({ id: userId }))

  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.fake-signature`
}




const OWNER_TOKEN = tokenFor(1)
const CLIENT_TOKEN = tokenFor(2)

const HEADERS = {
  'content-type': 'application/json',
  'x-workspace-id': 'workspace-alpha',

  'Authorization': `Bearer ${OWNER_TOKEN}`,
}

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => {
  server.resetHandlers()
  db.namespaces.splice(0, db.namespaces.length, ...structuredClone(initialNamespaces))
  db.routes.splice(0, db.routes.length, ...structuredClone(initialRoutes))
  db.apiKeys.splice(0, db.apiKeys.length)
  db.invocations.splice(0, db.invocations.length)
  clearApiKeyValues()
  clearRateBuckets()
})
afterAll(() => server.close())

describe('gateway dispatch — enforcement RBAC (Parte 2)', () => {
  async function makeNamespace(slug: string): Promise<string> {
    const nsRes = await fetch(`${BASE}/namespaces`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ slug, displayName: slug, baseUrl: `${BASE}/_upstream` }),
    })
    const { namespace } = await nsRes.json()

    return namespace.id
  }

  async function makeRoute(namespaceId: string, method: string, path: string, requiredRole: string) {
    await fetch(`${BASE}/namespaces/${namespaceId}/routes`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ method, path, mode: 'MOCK', requiredRole, mockStatusCode: 200, mockPayload: '{"ok":true}' }),
    })
  }

  it('owner (gatewayRole ADMIN) acessa rota ADMIN mesmo com header x-actor-role rebaixado', async () => {
    const nsId = await makeNamespace('rbac-owner')
    await makeRoute(nsId, 'DELETE', '/destroy', 'ADMIN')

    const res = await fetch(`${GW}/rbac-owner/destroy`, {
      method: 'DELETE',
      headers: { ...HEADERS, 'x-actor-role': 'user', 'authorization': `Bearer ${OWNER_TOKEN}` },
    })

    expect(res.status).toBe(200)
  })

  it('client (gatewayRole USER) NÃO acessa rota ADMIN mesmo com header x-actor-role elevado', async () => {
    const nsId = await makeNamespace('rbac-client')
    await makeRoute(nsId, 'DELETE', '/destroy', 'ADMIN')



    const { Authorization: _ownerAuth, ...invokeHeaders } = HEADERS
    const res = await fetch(`${GW}/rbac-client/destroy`, {
      method: 'DELETE',
      headers: { ...invokeHeaders, 'x-actor-role': 'admin', 'authorization': `Bearer ${CLIENT_TOKEN}` },
    })

    expect(res.status).toBe(403)
  })

  it('client (gatewayRole USER) acessa rota USER normalmente', async () => {
    const nsId = await makeNamespace('rbac-client-user')
    await makeRoute(nsId, 'GET', '/customers', 'USER')

    const { Authorization: _ownerAuth, ...invokeHeaders } = HEADERS
    const res = await fetch(`${GW}/rbac-client-user/customers`, {
      headers: { ...invokeHeaders, 'x-actor-role': 'admin', 'authorization': `Bearer ${CLIENT_TOKEN}` },
    })

    expect(res.status).toBe(200)
  })
})
