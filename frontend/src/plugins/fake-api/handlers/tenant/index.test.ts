import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { setupServer } from 'msw/node'
import { membershipsByUserId, tenants } from '@db/tenant/db'
import { handlerTenant } from '@db/tenant/index'

const server = setupServer(...handlerTenant)
const initialTenants = structuredClone(tenants)
const initialMemberships = structuredClone(membershipsByUserId)

/** Token fake no mesmo formato do auth handler (payload `{ id }`). */
function tokenFor(userId: number): string {
  const payload = btoa(JSON.stringify({ id: userId }))

  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.fake-signature`
}

async function parseJson(response: Response): Promise<any> {
  return response.json()
}

function resetDb() {
  tenants.splice(0, tenants.length, ...structuredClone(initialTenants))
  for (const key of Object.keys(membershipsByUserId))
    delete membershipsByUserId[key]
  Object.assign(membershipsByUserId, structuredClone(initialMemberships))
}

describe('tenant fake API handlers', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

  afterEach(() => {
    server.resetHandlers()
    resetDb()
  })

  afterAll(() => server.close())

  it('creates a workspace and adds the creator as owner', async () => {
    const response = await fetch('http://localhost/api/tenants', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${tokenFor(1)}`,
      },
      body: JSON.stringify({ name: 'Umbrella Corp' }),
    })

    expect(response.status).toBe(201)

    const body = await parseJson(response)

    expect(body.tenant.id).toBe('workspace-umbrella-corp')
    expect(body.tenant.slug).toBe('umbrella-corp')
    expect(body.tenant.name).toBe('Umbrella Corp')
    expect(body.membership.role).toBe('owner')
    expect(body.membership.tenantId).toBe('workspace-umbrella-corp')

    expect(tenants.some(t => t.id === 'workspace-umbrella-corp')).toBe(true)
    expect(membershipsByUserId['1'].some(m => m.tenantId === 'workspace-umbrella-corp')).toBe(true)
  })

  it('normalizes an explicit slug', async () => {
    const response = await fetch('http://localhost/api/tenants', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Initech', slug: ' Initech Corp! ' }),
    })

    expect(response.status).toBe(201)

    const body = await parseJson(response)

    expect(body.tenant.slug).toBe('initech-corp')
  })

  it('rejects a duplicate slug with 400', async () => {
    const response = await fetch('http://localhost/api/tenants', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Acme Renamed', slug: 'acme' }),
    })

    expect(response.status).toBe(400)
    expect(tenants).toHaveLength(2)
  })

  it('rejects a missing name with 400', async () => {
    const response = await fetch('http://localhost/api/tenants', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slug: 'empty' }),
    })

    expect(response.status).toBe(400)
  })
})
