import { getSafeHomeRoute } from '@/config/featureFlags'
import { describe, expect, it, vi } from 'vitest'
import { filterAccessibleNavItems, resolveAccessibleHomeRoute } from './accessControlNav'



const canRoutes = new Set<string>()

vi.mock('@/plugins/casl', () => ({
  getActiveAbility: () => (globalThis as any).__ACTIVE_ABILITY ?? null,
}))

vi.stubGlobal('useCookie', (name: string) => ({
  value: name === 'userData' ? (globalThis as any).__USER_DATA : undefined,
}))

describe('filterAccessibleNavItems', () => {
  it('remove links sem acesso e poda grupos/headings vazios', () => {
    const items = [
      { heading: 'AI' },
      { title: 'AI Assistant', to: 'ai-assistant' },
      { title: 'Skills', to: 'ai-skills' },
      { heading: 'Security & Access' },
      { title: 'Roles & Permissions', to: 'access-control-roles' },
      {
        title: 'Group',
        children: [
          { title: 'Gateway', to: 'integrations-gateway' },
          { title: 'Hidden', to: 'hidden-route' },
        ],
      },
    ]

    const can = (key: string | null): boolean => {
      if (!key)
        return true

      return key !== 'hidden-route'
    }

    expect(filterAccessibleNavItems(items as any, can)).toEqual([
      { heading: 'AI' },
      { title: 'AI Assistant', to: 'ai-assistant' },
      { title: 'Skills', to: 'ai-skills' },
      { heading: 'Security & Access' },
      { title: 'Roles & Permissions', to: 'access-control-roles' },
      {
        title: 'Group',
        children: [{ title: 'Gateway', to: 'integrations-gateway' }],
      },
    ])
  })

  it('remove heading órfão quando todos os itens da seção caem', () => {
    const items = [
      { heading: 'AI' },
      { title: 'AI Assistant', to: 'ai-assistant' },
      { heading: 'Integrations' },
      { title: 'MCP Hub', to: 'integrations-mcp' },
    ]

    const can = (key: string | null) => !key || key === 'ai-assistant'

    expect(filterAccessibleNavItems(items as any, can)).toEqual([
      { heading: 'AI' },
      { title: 'AI Assistant', to: 'ai-assistant' },
    ])
  })

  it('suporta `to` como objeto { name } (extractRouteName)', () => {
    const items = [
      { title: 'Gateway', to: { name: 'integrations-gateway' } },
      { title: 'Credentials', to: { name: 'security-credentials' } },
    ]

    const can = (key: string | null) => key === 'integrations-gateway'

    expect(filterAccessibleNavItems(items as any, can)).toEqual([
      { title: 'Gateway', to: { name: 'integrations-gateway' } },
    ])
  })

  it('client (can false para api-control) não vê API Gateway na busca/nav', () => {
    const items = [
      { title: 'MCP Hub', to: { name: 'integrations-mcp' } },
      { title: 'API Gateway', to: { name: 'integrations-gateway' } },
      { title: 'Switch workspace', to: { name: 'tenants' } },
    ]


    const can = (key: string | null) => {
      if (!key)
        return true

      return key === 'tenants'
    }

    expect(filterAccessibleNavItems(items as any, can)).toEqual([
      { title: 'Switch workspace', to: { name: 'tenants' } },
    ])
  })
})

describe('getSafeHomeRoute — predicado RBAC-aware', () => {
  it('sem predicado: primeiro home habilitado (ai-assistant)', () => {
    expect(getSafeHomeRoute()).toBe('ai-assistant')
  })

  it('com predicado: primeiro home que o usuário PODE navegar', () => {
    expect(getSafeHomeRoute(route => route === 'ai-skills')).toBe('ai-skills')
  })

  it('nenhum home acessível → tenant picker', () => {
    expect(getSafeHomeRoute(() => false)).toBe('tenants')
  })
})

describe('resolveAccessibleHomeRoute — COESÃO (client não cai em not-authorized)', () => {
  it('sem sessão → null (chamador decide o redirect p/ login)', () => {
    ;(globalThis as any).__USER_DATA = undefined

    expect(resolveAccessibleHomeRoute()).toBeNull()
  })

  it('admin (todas as rotas) → primeira home gated (ai-assistant)', () => {
    ;(globalThis as any).__USER_DATA = { id: 1 }
    ;(globalThis as any).__ACTIVE_ABILITY = { can: (_action: string, subject: string) => canRoutes.has(subject) }
    canRoutes.clear()
    ;['ai-assistant', 'ai-knowledge', 'ai-skills', 'integrations'].forEach(r => canRoutes.add(r))

    expect(resolveAccessibleHomeRoute()).toEqual({ name: 'ai-assistant' })
  })

  it('client (nenhuma home gated) → Account Settings (universal)', () => {
    ;(globalThis as any).__USER_DATA = { id: 2 }
    ;(globalThis as any).__ACTIVE_ABILITY = { can: (_action: string, subject: string) => canRoutes.has(subject) }
    canRoutes.clear()

    expect(resolveAccessibleHomeRoute()).toEqual({
      name: 'pages-account-settings-tab',
      params: { tab: 'account' },
    })
  })
})
