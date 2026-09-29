import { db } from '@db/integrations/gateway/db'
import { handlerGatewayDispatch } from '@db/integrations/gateway/dispatch'
import { handlerIntegrationsGateway } from '@db/integrations/gateway/index'
import { db as credentialsDb } from '@db/security/credentials/db'
import { handlerSecurityCredentials } from '@db/security/credentials/index'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

const allHandlers = [...handlerSecurityCredentials, ...handlerIntegrationsGateway, ...handlerGatewayDispatch]
const server = setupServer(...allHandlers)

const initialNamespaces = structuredClone(db.namespaces)
const initialRoutes = structuredClone(db.routes)
const initialCredentials = structuredClone(credentialsDb.credentials)

const CRED = 'http://localhost/api/security/credentials'
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
  credentialsDb.credentials.splice(0, credentialsDb.credentials.length, ...structuredClone(initialCredentials))
})
afterAll(() => server.close())



describe('gateway ↔ credentials marriage', () => {
  it('creates a credential, attaches it to a namespace, and proxies with the injected value', async () => {

    const credRes = await fetch(`${CRED}/variables`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ key: 'CRM_PIPEDRIVE_TOKEN', value: 'pd-live-abc123' }),
    })

    expect(credRes.status).toBe(201)

    const { credential } = await credRes.json()
    const credentialId = String(credential.id)


    const nsRes = await fetch(`${BASE}/namespaces`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ slug: 'crm-pipedrive', displayName: 'Pipedrive', baseUrl: UPSTREAM, credentialId }),
    })

    expect(nsRes.status).toBe(201)

    const { namespace } = await nsRes.json()

    const routeRes = await fetch(`${BASE}/namespaces/${namespace.id}/routes`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ method: 'GET', path: '/customers', mode: 'PROXY' }),
    })

    expect(routeRes.status).toBe(201)


    const gwRes = await fetch(`${GW}/crm-pipedrive/customers`, { headers: HEADERS_USER })

    expect(gwRes.status).toBe(200)

    const body = await gwRes.json()

    expect(body.proxiedFrom.headers.authorization).toBe('Bearer pd-live-abc123')
  })

  it('refuses to delete a credential still referenced by the gateway (409) and allows it after cleanup', async () => {

    const secretRes = await fetch(`${CRED}/secrets`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ key: 'CRM_SF_TOKEN', value: 'sf-token' }),
    })

    expect(secretRes.status).toBe(201)

    const { credential } = await secretRes.json()
    const credentialId = String(credential.id)


    const nsRes = await fetch(`${BASE}/namespaces`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ slug: 'crm-sf', displayName: 'Salesforce', baseUrl: UPSTREAM, credentialId }),
    })

    expect(nsRes.status).toBe(201)

    const { namespace } = await nsRes.json()


    const delInUse = await fetch(`${CRED}/secrets/${credentialId}`, { method: 'DELETE', headers: CRUD_HEADERS })

    expect(delInUse.status).toBe(409)

    const errBody = await delInUse.json()

    expect(errBody.code).toBe('CREDENTIAL_IN_USE')
    expect(errBody.references.namespaces).toContain(namespace.id)


    const clean = await fetch(`${BASE}/namespaces/${namespace.id}`, {
      method: 'PUT',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ credentialId: '' }),
    })

    expect(clean.status).toBe(200)

    const delOk = await fetch(`${CRED}/secrets/${credentialId}`, { method: 'DELETE', headers: CRUD_HEADERS })

    expect(delOk.status).toBe(204)
  })

  it('resolves SECRET plaintext stored at creation time through the gateway without exposing it via the API', async () => {

    const secretRes = await fetch(`${CRED}/secrets`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ key: 'CRM_SANDBOX2', value: 'plaintext-xyz' }),
    })

    expect(secretRes.status).toBe(201)

    const { credential } = await secretRes.json()

    expect(credential.maskedValue).toBe('********')
    expect(credential.value).toBeUndefined()


    const nsRes = await fetch(`${BASE}/namespaces`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ slug: 'crm-secret2', displayName: 'CRM Secret 2', baseUrl: UPSTREAM, credentialId: String(credential.id) }),
    })

    const { namespace } = await nsRes.json()

    await fetch(`${BASE}/namespaces/${namespace.id}/routes`, {
      method: 'POST',
      headers: CRUD_HEADERS,
      body: JSON.stringify({ method: 'GET', path: '/customers', mode: 'PROXY' }),
    })


    const gwRes = await fetch(`${GW}/crm-secret2/customers`, { headers: HEADERS_USER })

    expect(gwRes.status).toBe(200)

    const body = await gwRes.json()

    expect(body.proxiedFrom.headers.authorization).toBe('Bearer plaintext-xyz')
  })
})
