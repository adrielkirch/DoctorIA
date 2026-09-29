import { useGatewayStore } from '@/views/integrations/gateway/useGatewayStore'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const apiMock = vi.fn()
const apiRawMock = vi.fn()

const canValue = ref(true)

vi.mock('@/stores/useAccessControlStore', () => ({
  useAccessControlStore: () => ({ can: (key: string) => canValue.value, ensureLoaded: () => {} }),
}))

vi.mock('@/utils/api', () => ({
  $api: Object.assign(
    (...args: unknown[]) => apiMock(...args),
    { raw: (...args: unknown[]) => apiRawMock(...args) },
  ),
}))



vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => ({ currentTenantId: 'workspace-alpha' }),
}))

const nsListResponse = { namespaces: [{ id: 'ns-1', tenantId: 'workspace-alpha', slug: 'stripe', displayName: 'Stripe', description: '', routeCount: 2, createdAt: '2026-08-02T00:00:00Z', updatedAt: '2026-08-02T00:00:00Z', createdBy: 'user-admin' }], totalNamespaces: 1, totalPages: 1, page: 1 }
const routeListResponse = { routes: [{ id: 'r-1', namespaceId: 'ns-1', tenantId: 'workspace-alpha', method: 'GET', path: '/v1/status', mode: 'MOCK', isPublic: true, requiredRole: 'ALL', enabled: true, mockPayload: '{"status":"ok"}', mockStatusCode: 200, mockLatencyMs: 0, upstreamUrl: '', description: '', createdAt: '2026-08-02T00:00:00Z', updatedAt: '2026-08-02T00:00:00Z' }], totalRoutes: 1, totalPages: 1, page: 1 }

describe('useGatewayStore — fetchNamespaces', () => {
  beforeEach(() => { setActivePinia(createPinia()); apiMock.mockReset() })

  it('populates namespaces and total on success', async () => {
    const store = useGatewayStore()

    apiMock.mockResolvedValueOnce(nsListResponse)
    await store.fetchNamespaces()
    expect(store.namespaces).toHaveLength(1)
    expect(store.namespacesTotal).toBe(1)
    expect(store.namespacesLoading).toBe(false)
    expect(store.namespacesError).toBeNull()
  })

  it('includes search query param when set', async () => {
    const store = useGatewayStore()

    store.namespaceSearch = 'stripe'
    apiMock.mockResolvedValueOnce(nsListResponse)
    await store.fetchNamespaces()

    const call = apiMock.mock.calls[0]

    expect(call[1]?.params?.q).toBe('stripe')
  })

  it('sets error on failure', async () => {
    const store = useGatewayStore()

    apiMock.mockRejectedValueOnce(new Error('Network error'))
    await store.fetchNamespaces()
    expect(store.namespacesError).toBeTruthy()
    expect(store.namespaces).toHaveLength(0)
  })
})

describe('useGatewayStore — createNamespace', () => {
  beforeEach(() => { setActivePinia(createPinia()); apiMock.mockReset() })

  it('appends namespace to store on success', async () => {
    const store = useGatewayStore()

    apiMock.mockResolvedValueOnce({ namespace: nsListResponse.namespaces[0] })

    const ns = await store.createNamespace({ slug: 'stripe', displayName: 'Stripe' })

    expect(store.namespaces).toHaveLength(1)
    expect(ns.slug).toBe('stripe')
  })
})

describe('useGatewayStore — fetchRoutes', () => {
  beforeEach(() => { setActivePinia(createPinia()); apiMock.mockReset() })

  it('populates routes for selected namespace', async () => {
    const store = useGatewayStore()

    apiMock.mockResolvedValueOnce(routeListResponse)
    await store.fetchRoutes('ns-1')
    expect(store.routes).toHaveLength(1)
    expect(store.routesTotal).toBe(1)
    expect(store.routesLoading).toBe(false)
  })

  it('includes method filter param when set', async () => {
    const store = useGatewayStore()

    store.routeMethodFilter = 'GET'
    apiMock.mockResolvedValueOnce(routeListResponse)
    await store.fetchRoutes('ns-1')
    expect(apiMock.mock.calls[0][1]?.params?.method).toBe('GET')
  })
})

describe('useGatewayStore — createRoute', () => {
  beforeEach(() => { setActivePinia(createPinia()); apiMock.mockReset() })

  it('appends route and increments namespace routeCount', async () => {
    const store = useGatewayStore()

    apiMock.mockResolvedValueOnce(nsListResponse)
    await store.fetchNamespaces()
    apiMock.mockResolvedValueOnce({ route: routeListResponse.routes[0] })

    const route = await store.createRoute('ns-1', { method: 'GET', path: '/v1/status', mode: 'MOCK' })

    expect(store.routes).toHaveLength(1)
    expect(route.path).toBe('/v1/status')

    const ns = store.namespaces.find(n => n.id === 'ns-1')

    expect(ns?.routeCount).toBe(3)
  })
})



describe('useGatewayStore — invokeRoute', () => {
  beforeEach(() => { setActivePinia(createPinia()); apiMock.mockReset(); apiRawMock.mockReset() })

  it('populates status code, response body, and elapsed time on success', async () => {
    const store = useGatewayStore()


    store.selectedNamespace = { id: 'ns-1', tenantId: 'workspace-alpha', slug: 'stripe', displayName: 'Stripe', description: '', baseUrl: 'https://api.stripe.test', routeCount: 1, createdAt: '', updatedAt: '', createdBy: '' }

    const mockRoute = { id: 'r-1', namespaceId: 'ns-1', tenantId: 'workspace-alpha', method: 'GET' as const, path: '/v1/status', mode: 'MOCK' as const, isPublic: true, requiredRole: 'ALL' as const, enabled: true, mockPayload: '{"status":"ok"}', mockStatusCode: 200, mockLatencyMs: 0, upstreamUrl: '', description: '', createdAt: '', updatedAt: '' }

    apiRawMock.mockResolvedValueOnce({ status: 200, _data: { status: 'ok' } })
    await store.invokeRoute(mockRoute)
    expect(store.invokerStatusCode).toBe(200)
    expect(store.invokerResponse).toEqual({ status: 'ok' })
    expect(store.invokerElapsedMs).toBeGreaterThanOrEqual(0)
    expect(store.invokerLoading).toBe(false)
  })

  it('captures 4xx status code as invokerStatusCode without throwing', async () => {
    const store = useGatewayStore()

    store.selectedNamespace = { id: 'ns-1', tenantId: 'workspace-alpha', slug: 'mercadopago', displayName: 'MP', description: '', baseUrl: 'https://api.mercadopago.test', routeCount: 1, createdAt: '', updatedAt: '', createdBy: '' }

    const mockRoute = { id: 'r-2', namespaceId: 'ns-1', tenantId: 'workspace-alpha', method: 'POST' as const, path: '/v1/payments', mode: 'MOCK' as const, isPublic: false, requiredRole: 'USER' as const, enabled: true, mockPayload: '{"error":"invalid"}', mockStatusCode: 400, mockLatencyMs: 0, upstreamUrl: '', description: '', createdAt: '', updatedAt: '' }

    apiRawMock.mockResolvedValueOnce({ status: 400, _data: { error: 'invalid' } })
    await store.invokeRoute(mockRoute)
    expect(store.invokerStatusCode).toBe(400)
    expect(store.invokerLoading).toBe(false)
  })

  it('records error message on network failure', async () => {
    const store = useGatewayStore()

    store.selectedNamespace = { id: 'ns-1', tenantId: 'workspace-alpha', slug: 'stripe', displayName: 'Stripe', description: '', baseUrl: 'https://api.stripe.test', routeCount: 1, createdAt: '', updatedAt: '', createdBy: '' }

    const mockRoute = { id: 'r-1', namespaceId: 'ns-1', tenantId: 'workspace-alpha', method: 'GET' as const, path: '/v1/status', mode: 'MOCK' as const, isPublic: true, requiredRole: 'ALL' as const, enabled: true, mockPayload: '{}', mockStatusCode: 200, mockLatencyMs: 0, upstreamUrl: '', description: '', createdAt: '', updatedAt: '' }

    apiRawMock.mockRejectedValueOnce(new Error('Network failure'))
    await store.invokeRoute(mockRoute)
    expect((store.invokerResponse as any).error).toBe('Network failure')
    expect(store.invokerLoading).toBe(false)
  })
})

describe('useGatewayStore — clearInvokerResponse', () => {
  beforeEach(() => { setActivePinia(createPinia()); apiMock.mockReset(); apiRawMock.mockReset() })

  it('resets all invoker output state', () => {
    const store = useGatewayStore()

    store.invokerStatusCode = 200
    store.invokerElapsedMs = 150
    store.invokerResponse = { ok: true }
    store.clearInvokerResponse()
    expect(store.invokerStatusCode).toBeNull()
    expect(store.invokerElapsedMs).toBeNull()
    expect(store.invokerResponse).toBeNull()
  })
})



describe('useGatewayStore — canManageNamespace / canDeleteRoute', () => {
  beforeEach(() => { setActivePinia(createPinia()) })

  it('canManageNamespace/canDeleteRoute seguem gateway.manage (permission granular)', () => {
    const store = useGatewayStore()

    canValue.value = true
    expect(store.canManageNamespace).toBe(true)
    expect(store.canDeleteRoute).toBe(true)

    canValue.value = false
    expect(store.canManageNamespace).toBe(false)
    expect(store.canDeleteRoute).toBe(false)
  })
})



const mockProposal = { id: 'prop-1', jobId: 'job-1', method: 'GET', path: '/v1/status', description: 'GET /v1/status', inferredRequestSchema: null, proposedMockResponse: '{"status":"ok"}', inferredRole: 'USER', approvalStatus: 'pending', unresolvedReason: '', createdAt: '2026-08-02T00:00:00Z' }
const mockJob = { id: 'job-1', tenantId: 'workspace-alpha', targetNamespaceId: '', rawInput: 'curl GET https://api.example.com/v1/status', status: 'awaiting_review', proposalCount: 1, resolvedCount: 0, createdAt: '2026-08-02T00:00:00Z', updatedAt: '2026-08-02T00:00:00Z' }
const setupResponse = { job: mockJob, proposals: [mockProposal] }
const confirmResponse = { createdRoutes: [{ id: 'r-new', namespaceId: 'ns-1', tenantId: 'workspace-alpha', method: 'GET', path: '/v1/status', mode: 'MOCK', isPublic: false, requiredRole: 'USER', enabled: true, mockPayload: '{"status":"ok"}', mockStatusCode: 200, mockLatencyMs: 0, upstreamUrl: '', description: '', createdAt: '2026-08-02T00:00:00Z', updatedAt: '2026-08-02T00:00:00Z' }], conflicts: [] }

describe('useGatewayStore — submitExtraction', () => {
  beforeEach(() => { setActivePinia(createPinia()); apiMock.mockReset() })

  it('populates extractionJob and extractionProposals on success', async () => {
    const store = useGatewayStore()

    apiMock.mockResolvedValueOnce(setupResponse)
    await store.submitExtraction('curl -X GET https://api.example.com/v1/status')
    expect(store.extractionJob?.id).toBe('job-1')
    expect(store.extractionProposals).toHaveLength(1)
    expect(store.extractionLoading).toBe(false)
    expect(store.extractionError).toBeNull()
  })

  it('sets error on failure', async () => {
    const store = useGatewayStore()

    apiMock.mockRejectedValueOnce(new Error('Server error'))
    await store.submitExtraction('some input')
    expect(store.extractionError).toBeTruthy()
    expect(store.extractionJob).toBeNull()
  })
})

describe('useGatewayStore — approveProposal / rejectProposal', () => {
  beforeEach(() => { setActivePinia(createPinia()); apiMock.mockReset() })

  it('approveProposal changes approvalStatus to approved', async () => {
    const store = useGatewayStore()

    apiMock.mockResolvedValueOnce(setupResponse)
    await store.submitExtraction('curl -X GET https://api.example.com/v1/status')
    store.approveProposal('prop-1')
    expect(store.extractionProposals[0].approvalStatus).toBe('approved')
  })

  it('rejectProposal changes approvalStatus to rejected', async () => {
    const store = useGatewayStore()

    apiMock.mockResolvedValueOnce(setupResponse)
    await store.submitExtraction('curl -X GET https://api.example.com/v1/status')
    store.rejectProposal('prop-1')
    expect(store.extractionProposals[0].approvalStatus).toBe('rejected')
  })
})

describe('useGatewayStore — confirmProvisioning', () => {
  beforeEach(() => { setActivePinia(createPinia()); apiMock.mockReset() })

  it('calls confirm endpoint and refreshes namespaces', async () => {
    const store = useGatewayStore()

    apiMock.mockResolvedValueOnce(setupResponse)
    await store.submitExtraction('curl -X GET https://api.example.com/v1/status')
    store.approveProposal('prop-1')
    apiMock.mockResolvedValueOnce(confirmResponse)
    apiMock.mockResolvedValueOnce({ namespaces: [], totalNamespaces: 0, totalPages: 0, page: 1 })

    const result = await store.confirmProvisioning('ns-1')

    expect(result?.createdRoutes).toHaveLength(1)
    expect(apiMock).toHaveBeenCalledWith(expect.stringContaining('confirm'), expect.any(Object))
  })
})
