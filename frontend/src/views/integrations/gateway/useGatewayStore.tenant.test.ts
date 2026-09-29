import { useAuthStore } from '@/stores/useAuthStore'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { useGatewayStore } from './useGatewayStore'




vi.mock('@/utils/api', () => ({
  $api: Object.assign(
    vi.fn(() => Promise.resolve({ namespaces: [], total: 0, page: 1, pageSize: 20, hasMore: false })),
    { raw: vi.fn() },
  ),
}))

function stubCookies(tenantId: string): void {
  vi.stubGlobal('useCookie', (name: string) => {
    const cookies: Record<string, unknown> = {
      accessToken: 'token',
      userData: { id: 1, fullName: 'Admin', username: 'admin', email: 'a@b.c', role: 'admin' },
      memberships: [
        { tenantId: 'workspace-alpha', role: 'owner', tenant: { id: 'workspace-alpha', name: 'Acme Inc', slug: 'acme', plan: 'enterprise', createdAt: '' } },
        { tenantId: 'workspace-beta', role: 'admin', tenant: { id: 'workspace-beta', name: 'Globex Corp', slug: 'globex', plan: 'pro', createdAt: '' } },
      ],
      currentTenantId: tenantId,
    }

    return { value: cookies[name] ?? null }
  })
}

describe('useGatewayStore — reset na troca de tenant', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    stubCookies('workspace-alpha')
    setActivePinia(createPinia())
  })

  it('limpa selectedNamespace, rotas e filtros quando o tenant muda', async () => {
    const auth = useAuthStore()
    const store = useGatewayStore()


    store.selectedNamespace = { id: 'ns-shipping-api', tenantId: 'workspace-alpha', slug: 'shipping-api', displayName: 'Shipping API', description: '', baseUrl: 'https://shipping.test', routeCount: 1, createdAt: '', updatedAt: '', createdBy: 'user-admin' }
    store.routes = [{ id: 'r1', namespaceId: 'ns-shipping-api', tenantId: 'workspace-alpha', method: 'GET', path: '/v1/ship', mode: 'MOCK', isPublic: false, requiredRole: 'ALL', enabled: true, mockPayload: '{}', mockStatusCode: 200, mockLatencyMs: 0, upstreamUrl: '', description: '', createdAt: '', updatedAt: '' }]
    store.routeMethodFilter = 'GET'


    auth.switchTenant('workspace-beta')
    await nextTick()

    expect(store.selectedNamespace).toBeNull()
    expect(store.routes).toEqual([])
    expect(store.routeMethodFilter).toBe('')
  })
})
