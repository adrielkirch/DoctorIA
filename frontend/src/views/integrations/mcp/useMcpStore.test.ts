import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMcpStore } from '@/views/integrations/mcp/useMcpStore'

const apiMock = vi.fn()

vi.mock('@/utils/api', () => ({
  $api: (...args: unknown[]) => apiMock(...args),
}))

const storeResponse = { providers: [{ id: 'p1', slug: 'stripe', displayName: 'Stripe', category: 'payments', capabilities: ['payments.read'], requiredSecrets: ['STRIPE_API_KEY'], trustTier: 'verified', status: 'published', maintainer: 'team', createdAt: '2026-08-02T00:00:00Z', updatedAt: '2026-08-02T00:00:00Z' }], totalProviders: 1, totalPages: 1, page: 1, filters: { categories: ['payments'], trustTiers: ['verified'], statuses: ['published'] } }
const connectedResponse = { connections: [{ id: 'c1', tenantId: 'workspace-alpha', providerSlug: 'supabase', displayName: 'Supabase', status: 'active', lastValidationStatus: 'pass', healthStatus: 'healthy', connectedAt: '2026-08-02T00:00:00Z', activationSource: 'auto_validation', updatedAt: '2026-08-02T00:00:00Z', createdBy: 'admin', autoActivated: true }], totalConnections: 1, totalPages: 1, page: 1, filters: { statuses: ['active'], healthStates: ['healthy'] } }
const emptyConnected = { connections: [], totalConnections: 0, totalPages: 0, page: 1, filters: { statuses: [], healthStates: [] } }

describe('useMcpStore - user story 1 fetch behavior', () => {
  beforeEach(() => { setActivePinia(createPinia()); apiMock.mockReset() })

  it('fetchStoreCatalog populates providers and filter metadata', async () => {
    const store = useMcpStore()

    apiMock.mockResolvedValueOnce(storeResponse)
    await store.fetchStoreCatalog()

    expect(apiMock.mock.calls[0][0]).toContain('/integrations/mcp/store?')
    expect(store.providers).toHaveLength(1)
    expect(store.availableCategories).toEqual(['payments'])
    expect(store.isEmptyStore).toBe(false)
  })

  it('fetchConnectedServers populates connections and filter metadata', async () => {
    const store = useMcpStore()

    apiMock.mockResolvedValueOnce(connectedResponse)
    await store.fetchConnectedServers()

    expect(apiMock.mock.calls[0][0]).toContain('/integrations/mcp/connected?')
    expect(store.connections).toHaveLength(1)
    expect(store.isEmptyConnected).toBe(false)
  })

  it('includes filter params in requests', async () => {
    const store = useMcpStore()

    store.searchQuery = 'stripe'; store.selectedCategory = 'payments'
    apiMock.mockResolvedValueOnce({ ...storeResponse, providers: [] })
    await store.fetchStoreCatalog()

    const path = String(apiMock.mock.calls[0][0])

    expect(path).toContain('q=stripe')
    expect(path).toContain('category=payments')
  })
})

describe('useMcpStore - user story 2 connect workflow', () => {
  beforeEach(() => { setActivePinia(createPinia()); apiMock.mockReset() })

  it('connectProvider calls POST and refreshes connections on success', async () => {
    const store = useMcpStore()

    apiMock.mockResolvedValueOnce(undefined).mockResolvedValueOnce(connectedResponse)
    await store.connectProvider({ providerSlug: 'supabase', displayName: 'Sub', secrets: { SUPABASE_URL: 'x', SUPABASE_SERVICE_ROLE: 'y' }, requestedCapabilities: ['db.read'] })

    expect(apiMock.mock.calls[0][0]).toBe('/integrations/mcp/connect')
    expect((apiMock.mock.calls[0][1] as any).method).toBe('POST')
    expect(store.connections).toHaveLength(1)
    expect(store.errorMessage).toBeNull()
  })

  it('connectProvider sets errorMessage on failure', async () => {
    const store = useMcpStore()

    apiMock.mockRejectedValueOnce(new Error('Validation failed'))
    await store.connectProvider({ providerSlug: 'jira', displayName: 'x', secrets: {}, requestedCapabilities: [] })

    expect(store.errorMessage).toBe('Validation failed')
    expect(store.isLoading).toBe(false)
  })

  it('revalidateConnection calls correct endpoint', async () => {
    const store = useMcpStore()

    apiMock.mockResolvedValueOnce(undefined).mockResolvedValueOnce(connectedResponse)
    await store.revalidateConnection('conn-1')

    expect(apiMock.mock.calls[0][0]).toBe('/integrations/mcp/connections/conn-1/revalidate')
  })

  it('isLoading resets to false after failure', async () => {
    const store = useMcpStore()

    apiMock.mockRejectedValueOnce(new Error('err'))
    await store.connectProvider({ providerSlug: 'x', displayName: 'x', secrets: {}, requestedCapabilities: [] })

    expect(store.isLoading).toBe(false)
  })
})

describe('useMcpStore - user story 3 capability grants', () => {
  beforeEach(() => { setActivePinia(createPinia()); apiMock.mockReset() })

  it('updateCapabilityGrants calls PATCH and refreshes connections', async () => {
    const store = useMcpStore()

    apiMock.mockResolvedValueOnce({ grant: { id: 'g1' } }).mockResolvedValueOnce(emptyConnected)
    await store.updateCapabilityGrants('conn-1', { principalType: 'role', principalId: 'ops', allowedCapabilities: ['db.read'] })

    expect(apiMock.mock.calls[0][0]).toBe('/integrations/mcp/connections/conn-1/capability-grants')
    expect((apiMock.mock.calls[0][1] as any).method).toBe('PATCH')
    expect(store.errorMessage).toBeNull()
  })

  it('updateCapabilityGrants sets errorMessage on failure', async () => {
    const store = useMcpStore()

    apiMock.mockRejectedValueOnce(new Error('INVALID_CAPABILITY'))
    await store.updateCapabilityGrants('conn-1', { principalType: 'role', principalId: 'x', allowedCapabilities: ['bad'] })

    expect(store.errorMessage).toBe('INVALID_CAPABILITY')
    expect(store.isLoading).toBe(false)
  })
})

describe('useMcpStore - user story 4 publish provider', () => {
  beforeEach(() => { setActivePinia(createPinia()); apiMock.mockReset() })

  it('publishProvider calls POST and refreshes catalog', async () => {
    const store = useMcpStore()

    apiMock.mockResolvedValueOnce({ provider: { id: 'p2' } }).mockResolvedValueOnce(storeResponse)
    await store.publishProvider({ slug: 'new-mcp', displayName: 'New', category: 'test', capabilities: ['test.read'], requiredSecrets: [], trustTier: 'community', maintainer: 'qa' })

    expect(apiMock.mock.calls[0][0]).toBe('/integrations/mcp/providers')
    expect((apiMock.mock.calls[0][1] as any).method).toBe('POST')
    expect(store.errorMessage).toBeNull()
  })

  it('publishProvider sets errorMessage on duplicate slug', async () => {
    const store = useMcpStore()

    apiMock.mockRejectedValueOnce(new Error('Provider slug already exists'))
    await store.publishProvider({ slug: 'stripe', displayName: 'x', category: 'x', capabilities: ['x'], requiredSecrets: [], trustTier: 'verified', maintainer: 'x' })

    expect(store.errorMessage).toBe('Provider slug already exists')
  })
})
