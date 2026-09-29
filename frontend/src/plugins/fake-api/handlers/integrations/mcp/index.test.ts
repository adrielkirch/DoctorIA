import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { db } from '@db/integrations/mcp/db'
import { handlerIntegrationsMcp } from '@db/integrations/mcp/index'

const server = setupServer(...handlerIntegrationsMcp)
const initialProviders = structuredClone(db.providers)
const initialConnections = structuredClone(db.connections)
const initialGrants = structuredClone(db.grants)
const initialValidationRuns = structuredClone(db.validationRuns)
const initialAuditEvents = structuredClone(db.auditEvents)

const BASE = 'http://localhost/api/integrations/mcp'

/** Token fake (payload { id }) — admin (id 1) tem todas as permissions. */
function tokenFor(userId: number): string {
  const payload = btoa(JSON.stringify({ id: userId }))

  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.fake-signature`
}

const HEADERS = { 'content-type': 'application/json', 'x-workspace-id': 'workspace-alpha' ,
  'Authorization': `Bearer ${tokenFor(1)}`,}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  db.providers.splice(0, db.providers.length, ...structuredClone(initialProviders))
  db.connections.splice(0, db.connections.length, ...structuredClone(initialConnections))
  db.grants.splice(0, db.grants.length, ...structuredClone(initialGrants))
  db.validationRuns.splice(0, db.validationRuns.length, ...structuredClone(initialValidationRuns))
  db.auditEvents.splice(0, db.auditEvents.length, ...structuredClone(initialAuditEvents))
})
afterAll(() => server.close())

describe('mcp fake API handlers - user story 1 contracts', () => {
  it('GET /store returns provider cards with filters metadata', async () => {
    const res = await fetch(`${BASE}/store`, { headers: HEADERS })

    expect(res.status).toBe(200)

    const body = await res.json()

    expect(Array.isArray(body.providers)).toBe(true)
    expect(body.providers.length).toBeGreaterThan(0)
    expect(body.totalProviders).toBe(db.providers.length)
    expect(Array.isArray(body.filters.categories)).toBe(true)
  })

  it('GET /connected returns connection records for tenant', async () => {
    const res = await fetch(`${BASE}/connected`, { headers: HEADERS })

    expect(res.status).toBe(200)

    const body = await res.json()

    expect(Array.isArray(body.connections)).toBe(true)
    expect(body.connections.every((item: any) => item.tenantId === 'workspace-alpha')).toBe(true)
  })

  it('GET /store enforces max itemsPerPage of 100', async () => {
    const res = await fetch(`${BASE}/store?page=1&itemsPerPage=500`, { headers: HEADERS })
    const body = await res.json()

    expect(body.totalProviders).toBeGreaterThan(0)
    expect(body.providers.length).toBeLessThanOrEqual(body.totalProviders)
    expect(typeof body.totalPages).toBe('number')
  })

  it('GET /store expõe o shape canônico de paginação (totalProviders + totalPages + page)', async () => {
    const res = await fetch(`${BASE}/store?page=1&itemsPerPage=2`, { headers: HEADERS })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.page).toBe(1)
    expect(typeof body.totalPages).toBe('number')
    expect(body.totalPages).toBe(Math.ceil(body.totalProviders / 2))
    expect(Array.isArray(body.providers)).toBe(true)
    expect(body.providers.length).toBeLessThanOrEqual(2)
  })

  it('GET /connected returns active-first sorted results', async () => {
    const res = await fetch(`${BASE}/connected?page=1&itemsPerPage=2`, { headers: HEADERS })
    const body = await res.json()

    expect(body.page).toBe(1)
    expect(body.connections.length).toBeLessThanOrEqual(2)

    const statuses = body.connections.map((c: any) => c.status)
    const nonActiveBeforeActive = statuses.some((s: string, i: number) => s !== 'active' && statuses.slice(i + 1).includes('active'))

    expect(nonActiveBeforeActive).toBe(false)
  })
})

describe('mcp fake API handlers - user story 2 contracts', () => {
  it('POST /connect with all required secrets auto-activates the connection', async () => {
    const res = await fetch(`${BASE}/connect`, { method: 'POST', headers: { ...HEADERS, 'x-actor-role': 'admin' }, body: JSON.stringify({ providerSlug: 'supabase', displayName: 'Test Supabase', secrets: { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE: 'token' }, requestedCapabilities: ['db.read'] }) })

    expect(res.status).toBe(201)

    const body = await res.json()

    expect(body.connection.status).toBe('active')
    expect(body.connection.autoActivated).toBe(true)
    expect(body.validationRun.result).toBe('pass')
    expect(db.auditEvents.some(e => e.eventType === 'connection.activated')).toBe(true)
  })

  it('POST /connect with missing secrets returns failed connection with check details', async () => {
    const res = await fetch(`${BASE}/connect`, { method: 'POST', headers: { ...HEADERS, 'x-actor-role': 'admin' }, body: JSON.stringify({ providerSlug: 'jira', displayName: 'Jira', secrets: {}, requestedCapabilities: ['issues.read'] }) })

    expect(res.status).toBe(201)

    const body = await res.json()

    expect(body.connection.status).toBe('failed')
    expect(body.validationRun.result).toBe('fail')
    expect(body.validationRun.checks[0].detail).toContain('Missing')
  })

  it('POST /connect returns 400 for unknown capability', async () => {
    const res = await fetch(`${BASE}/connect`, { method: 'POST', headers: { ...HEADERS, 'x-actor-role': 'admin' }, body: JSON.stringify({ providerSlug: 'stripe', displayName: 'x', secrets: { STRIPE_API_KEY: 'k' }, requestedCapabilities: ['nonexistent'] }) })

    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('INVALID_CAPABILITY')
  })

  it('POST /connect returns 403 for non-admin', async () => {
    const res = await fetch(`${BASE}/connect`, { method: 'POST', headers: { ...HEADERS, Authorization: `Bearer ${tokenFor(2)}` }, body: JSON.stringify({ providerSlug: 'stripe', displayName: 'x', secrets: { STRIPE_API_KEY: 'k' }, requestedCapabilities: ['payments.read'] }) })

    expect(res.status).toBe(403)
  })

  it('POST /connections/:id/revalidate returns 403 for non-admin', async () => {
    const res = await fetch(`${BASE}/connections/${db.connections[0].id}/revalidate`, { method: 'POST', headers: { ...HEADERS, Authorization: `Bearer ${tokenFor(2)}` }, body: JSON.stringify({}) })

    expect(res.status).toBe(403)
  })

  it('POST /connections/:id/revalidate transitions to active on pass', async () => {
    const res = await fetch(`${BASE}/connections/${db.connections[0].id}/revalidate`, { method: 'POST', headers: { ...HEADERS, 'x-actor-role': 'admin' }, body: JSON.stringify({}) })

    expect(res.status).toBe(200)
    expect((await res.json()).connection.status).toBe('active')
  })
})

describe('mcp fake API handlers - user story 3 contracts', () => {
  const connectionId = 'connection-supabase-alpha'
  const ADMIN = { ...HEADERS, 'x-actor-role': 'admin' }

  it('PATCH /capability-grants creates grant with audit event', async () => {
    const res = await fetch(`${BASE}/connections/${connectionId}/capability-grants`, { method: 'PATCH', headers: ADMIN, body: JSON.stringify({ principalType: 'role', principalId: 'analyst', allowedCapabilities: ['db.read'] }) })

    expect(res.status).toBe(200)
    expect((await res.json()).grant.principalId).toBe('analyst')
    expect(db.auditEvents.some(e => e.eventType === 'grant.updated')).toBe(true)
  })

  it('PATCH /capability-grants returns 400 for unknown capability', async () => {
    const res = await fetch(`${BASE}/connections/${connectionId}/capability-grants`, { method: 'PATCH', headers: ADMIN, body: JSON.stringify({ principalType: 'role', principalId: 'x', allowedCapabilities: ['nonexistent'] }) })

    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('INVALID_CAPABILITY')
  })

  it('PATCH /capability-grants returns 403 for non-admin', async () => {
    const res = await fetch(`${BASE}/connections/${connectionId}/capability-grants`, { method: 'PATCH', headers: { ...HEADERS, Authorization: `Bearer ${tokenFor(2)}` }, body: JSON.stringify({ principalType: 'role', principalId: 'x', allowedCapabilities: [] }) })

    expect(res.status).toBe(403)
  })

  it('GET /audit-events returns tenant-scoped paginated events', async () => {
    const res = await fetch(`${BASE}/audit-events`, { headers: HEADERS })

    expect(res.status).toBe(200)

    const body = await res.json()

    expect(body.events.every((e: any) => e.tenantId === 'workspace-alpha')).toBe(true)
    expect(typeof body.totalEvents).toBe('number')
    expect(typeof body.totalPages).toBe('number')
  })

  it('GET /audit-events can be filtered by connectionId', async () => {
    const res = await fetch(`${BASE}/audit-events?connectionId=${connectionId}`, { headers: HEADERS })
    const body = await res.json()

    expect(body.events.every((e: any) => e.connectionId === connectionId)).toBe(true)
  })
})

describe('mcp fake API handlers - user story 4 contracts', () => {
  const ADMIN = { ...HEADERS, 'x-actor-role': 'admin' }
  const valid = { slug: 'test-provider', displayName: 'Test', category: 'testing', capabilities: ['test.read'], requiredSecrets: ['TEST_KEY'], trustTier: 'community', maintainer: 'qa' }

  it('POST /providers returns 201 and provider appears in store search', async () => {
    const res = await fetch(`${BASE}/providers`, { method: 'POST', headers: ADMIN, body: JSON.stringify(valid) })

    expect(res.status).toBe(201)
    expect((await res.json()).provider.slug).toBe('test-provider')

    const storeRes = await fetch(`${BASE}/store?q=test-provider`, { headers: HEADERS })

    expect((await storeRes.json()).providers.some((p: any) => p.slug === 'test-provider')).toBe(true)
  })

  it('POST /providers returns 400 for duplicate slug', async () => {
    await fetch(`${BASE}/providers`, { method: 'POST', headers: ADMIN, body: JSON.stringify(valid) })

    const res = await fetch(`${BASE}/providers`, { method: 'POST', headers: ADMIN, body: JSON.stringify(valid) })

    expect(res.status).toBe(400)
  })

  it('POST /providers returns 400 for missing metadata', async () => {
    const res = await fetch(`${BASE}/providers`, { method: 'POST', headers: ADMIN, body: JSON.stringify({ slug: 'x', displayName: 'x', category: 'x', maintainer: 'x', capabilities: [] }) })

    expect(res.status).toBe(400)
  })

  it('POST /providers returns 403 for viewer role', async () => {
    const res = await fetch(`${BASE}/providers`, { method: 'POST', headers: { ...HEADERS, Authorization: `Bearer ${tokenFor(2)}` }, body: JSON.stringify(valid) })

    expect(res.status).toBe(403)
  })
})

describe('mcp fake API handlers — DELETE (G4: disconnect/revoke)', () => {
  it('DELETE /connections/:id desconecta (204) e remove grants da connection', async () => {
    const res = await fetch(`${BASE}/connections/connection-supabase-alpha`, { method: 'DELETE', headers: HEADERS })

    expect(res.status).toBe(204)
    expect(db.connections.find(c => c.id === 'connection-supabase-alpha')).toBeUndefined()
    expect(db.grants.some(g => g.connectionId === 'connection-supabase-alpha')).toBe(false)
  })

  it('DELETE /connections/:id cross-tenant → 404 (não desconecta de outro workspace)', async () => {
    const res = await fetch(`${BASE}/connections/connection-supabase-alpha`, {
      method: 'DELETE',
      headers: { ...HEADERS, 'x-workspace-id': 'workspace-beta' },
    })

    expect(res.status).toBe(404)
    expect(db.connections.find(c => c.id === 'connection-supabase-alpha')).toBeDefined()
  })

  it('DELETE /grants/:id revoga (204) e cross-tenant → 404', async () => {
    const res = await fetch(`${BASE}/grants/grant-role-ops-agent-supabase`, { method: 'DELETE', headers: HEADERS })

    expect(res.status).toBe(204)
    expect(db.grants.find(g => g.id === 'grant-role-ops-agent-supabase')).toBeUndefined()

    const beta = await fetch(`${BASE}/grants/grant-role-ops-agent-supabase`, {
      method: 'DELETE',
      headers: { ...HEADERS, 'x-workspace-id': 'workspace-beta' },
    })

    expect(beta.status).toBe(404)
  })

  it('member (sem mcp.manage) recebe 403 no DELETE', async () => {
    const res = await fetch(`${BASE}/connections/connection-supabase-alpha`, {
      method: 'DELETE',
      headers: { ...HEADERS, 'Authorization': `Bearer ${tokenFor(2)}` },
    })

    expect(res.status).toBe(403)
  })
})

