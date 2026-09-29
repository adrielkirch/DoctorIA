import { $api } from '@/utils/api'
import type { AppFeature, GlobalRole, MyAccess } from 'contracts/types/accessControl'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAccessControlStore } from './useAccessControlStore'

vi.mock('@/utils/api', () => ({
  $api: vi.fn(),
}))

const mockApi = vi.mocked($api)

const ROLES: GlobalRole[] = [
  {
    id: 'admin',
    name: 'Admin',
    icon: 'bx-shield-quarter',
    color: 'primary',
    description: '',
    permissions: ['roles.view', 'roles.manage', 'gateway.view', 'gateway.manage'],
    gatewayRole: 'ADMIN',
  },
  {
    id: 'member',
    name: 'Member',
    icon: 'bx-user',
    color: 'success',
    description: '',
    permissions: ['ai.assistant.use', 'mcp.invoke'],
    gatewayRole: 'USER',
  },
]

const FEATURES: AppFeature[] = [
  { key: 'access-control-roles', label: 'Roles', permission: 'roles.view', surfaces: ['nav'] },
  { key: 'integrations-gateway', label: 'Gateway', permission: 'gateway.view', surfaces: ['nav'] },
  { key: 'billing-plans', label: 'Billing', permission: 'public', surfaces: ['tab'] },
  { key: 'company', label: 'Company', permission: 'users.manage', surfaces: ['tab'] },
  { key: 'account', label: 'Account', permission: 'public', surfaces: ['tab'] },
  { key: 'unknown-route', label: 'Unknown', permission: 'public' },
]

const ADMIN_ACCESS: MyAccess = {
  role: 'admin',
  membershipRole: 'admin',
  permissions: ['roles.view', 'gateway.view', 'mcp.invoke'],
  areas: {
    'ai': [],
    'integrations': ['gateway.view', 'mcp.invoke'],
    'security': [],
    'access-control': ['roles.view'],
  },
  features: ['access-control-roles', 'integrations-gateway', 'billing-plans', 'company', 'account'],
  gatewayRole: 'ADMIN',
}

const MEMBER_ACCESS: MyAccess = {
  role: 'member',
  membershipRole: 'member',
  permissions: ['ai.assistant.use', 'mcp.invoke'],
  areas: {
    'ai': ['ai.assistant.use'],
    'integrations': ['mcp.invoke'],
    'security': [],
    'access-control': [],
  },
  features: ['billing-plans', 'account'],
  gatewayRole: 'USER',
}

describe('useAccessControlStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
    vi.clearAllMocks()

    vi.stubGlobal('useCookie', (name: string) => {
      const cookies: Record<string, any> = {
        currentTenantId: 'workspace-alpha',
      }

      return { value: cookies[name] }
    })
  })

  it('can() libera features da minha role e can(permission) é granular (View ≠ Use ≠ Manage)', async () => {
    mockApi
      .mockResolvedValueOnce({ roles: ROLES })
      .mockResolvedValueOnce({ features: FEATURES })
      .mockResolvedValueOnce(ADMIN_ACCESS)

    const store = useAccessControlStore()

    await store.ensureLoaded()


    expect(store.can('access-control-roles')).toBe(true)


    expect(store.can('account')).toBe(true)


    expect(store.can('nao-mapeada')).toBe(true)


    expect(store.can()).toBe(true)
    expect(store.can(null)).toBe(true)


    expect(store.can('mcp.invoke')).toBe(true)
    expect(store.can('mcp.view')).toBe(false)


    expect(store.canPermission('mcp.invoke')).toBe(true)
    expect(store.canPermission('mcp.view')).toBe(false)



  })

  it('member vê features públicas, usa MCP via invoke, mas NÃO vê configuração', async () => {
    mockApi
      .mockResolvedValueOnce({ roles: ROLES })
      .mockResolvedValueOnce({ features: FEATURES })
      .mockResolvedValueOnce(MEMBER_ACCESS)

    const store = useAccessControlStore()

    await store.ensureLoaded()


    expect(store.can('access-control-roles')).toBe(false)
    expect(store.can('company')).toBe(false)



    expect(store.can('account')).toBe(true)


    expect(store.can('mcp.invoke')).toBe(true)
    expect(store.can('mcp.view')).toBe(false)
    expect(store.can('ai.assistant.use')).toBe(true)
    expect(store.can('ai.assistant.view')).toBe(false)
  })

  it('antes de carregar, features gated ficam ocultas e permissions negadas (deny-by-default)', async () => {
    const store = useAccessControlStore()


    expect(store.isLoaded).toBe(false)


    expect(store.can('access-control-roles')).toBe(false)


    expect(store.can('mcp.invoke')).toBe(false)


    expect(store.can('account')).toBe(true)


    expect(store.can('notification')).toBe(false)
  })

  it('falha no fetch não quebra o app (isLoaded falso, can gated false)', async () => {
    mockApi.mockRejectedValue(new Error('boom'))

    const store = useAccessControlStore()

    await store.ensureLoaded()

    expect(store.loadError).toBe(true)
    expect(store.can('access-control-roles')).toBe(false)
    expect(store.can('mcp.invoke')).toBe(false)
  })

  it('carrega apenas uma vez por tenant (dedupe)', async () => {
    mockApi
      .mockResolvedValueOnce({ roles: ROLES })
      .mockResolvedValueOnce({ features: FEATURES })
      .mockResolvedValueOnce(ADMIN_ACCESS)

    const store = useAccessControlStore()

    await store.ensureLoaded()
    await store.ensureLoaded()


    expect(mockApi).toHaveBeenCalledTimes(3)
  })
})
