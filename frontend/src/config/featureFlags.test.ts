import { afterEach, describe, expect, it, vi } from 'vitest'

import { extractRouteName, parseDisabledFeatures, resolveFeatureKey } from './featureFlags'

/**
 * Re-import the module after stubbing `VITE_DISABLE_FEATURE_FLAGS` so the
 * module-level disabled set reflects the stubbed value.
 */
async function loadWithEnv(value: string | undefined) {
  vi.resetModules()

  if (value === undefined)
    vi.unstubAllEnvs()
  else
    vi.stubEnv('VITE_DISABLE_FEATURE_FLAGS', value)

  return await import('./featureFlags')
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('parseDisabledFeatures', () => {
  it('returns an empty set for missing/empty values', () => {
    expect([...parseDisabledFeatures(undefined)]).toEqual([])
    expect([...parseDisabledFeatures('')]).toEqual([])
    expect([...parseDisabledFeatures('  , , ')]).toEqual([])
  })

  it('splits by comma, trims whitespace and ignores empty entries', () => {
    const features = [
      ...parseDisabledFeatures('  ai-assistant , ai-knowledge ,,  pages-misc-under-maintenance '),
    ]

    expect(features).toEqual(['ai-assistant', 'ai-knowledge', 'pages-misc-under-maintenance'])
  })
})

describe('env-driven feature flags', () => {
  it('enables every feature when the variable is empty', async () => {
    const { isFeatureDisabled, isFeatureEnabled } = await loadWithEnv('')

    expect(isFeatureEnabled('ai-assistant')).toBe(true)
    expect(isFeatureDisabled('ai-assistant')).toBe(false)
    expect(isFeatureEnabled('pages-misc-under-maintenance')).toBe(true)
  })

  it('disables listed features and keeps the rest enabled', async () => {
    const { getDisabledFeatures, isFeatureDisabled, isFeatureEnabled } = await loadWithEnv(
      'ai-assistant, ai-knowledge ,',
    )

    expect(isFeatureDisabled('ai-assistant')).toBe(true)
    expect(isFeatureDisabled('ai-knowledge')).toBe(true)
    expect(isFeatureDisabled('pages-misc-under-maintenance')).toBe(false)
    expect(isFeatureEnabled('pages-misc-under-maintenance')).toBe(true)
    expect(getDisabledFeatures()).toEqual(['ai-assistant', 'ai-knowledge'])
  })
})

describe('extractRouteName', () => {
  it('extracts route names from strings and location objects', () => {
    expect(extractRouteName('ai-assistant')).toBe('ai-assistant')
    expect(extractRouteName({ name: 'ai-knowledge' })).toBe('ai-knowledge')
    expect(extractRouteName({ path: '/ai/assistant' })).toBeNull()
    expect(extractRouteName({ href: '/api/gateway' })).toBeNull()
    expect(extractRouteName(undefined)).toBeNull()
    expect(extractRouteName(null)).toBeNull()
  })
})

describe('isRouteLocationDisabled', () => {
  it('detects disabled features from strings and location objects', async () => {
    const { isRouteLocationDisabled } = await loadWithEnv('ai-assistant')

    expect(isRouteLocationDisabled('ai-assistant')).toBe(true)
    expect(isRouteLocationDisabled({ name: 'ai-assistant' })).toBe(true)
    expect(isRouteLocationDisabled({ name: 'ai-knowledge' })).toBe(false)
    expect(isRouteLocationDisabled({ name: 'sales-chat' })).toBe(false)
  })

  it('disables sales-chat independently from ai-assistant', async () => {
    const { isFeatureDisabled, isRouteLocationDisabled } = await loadWithEnv('sales-chat')

    expect(isFeatureDisabled('sales-chat')).toBe(true)
    expect(isRouteLocationDisabled('sales-chat')).toBe(true)
    expect(isRouteLocationDisabled('ai-assistant')).toBe(false)
    expect(isRouteLocationDisabled({ path: '/ai/assistant' })).toBe(false)
    expect(isRouteLocationDisabled({ href: 'https://example.com' })).toBe(false)
  })
})

describe('filterFeatureFlagNavItems', () => {
  it('removes disabled links, empty groups and orphaned headings', async () => {
    const { filterFeatureFlagNavItems } = await loadWithEnv('ai-knowledge')

    const items = [
      { title: 'AI Assistant', to: 'ai-assistant' },
      { heading: 'AI' },
      { title: 'Knowledge', to: 'ai-knowledge' },
      { heading: 'Integrations' },
      { title: 'MCP Hub', to: 'integrations-mcp' },
      {
        title: 'Security',
        children: [{ title: 'Credentials', to: 'security-credentials' }],
      },
      {
        title: 'Disabled Group',
        children: [{ title: 'Knowledge', to: 'ai-knowledge' }],
      },
    ]

    expect(filterFeatureFlagNavItems(items)).toEqual([
      { title: 'AI Assistant', to: 'ai-assistant' },
      { heading: 'Integrations' },
      { title: 'MCP Hub', to: 'integrations-mcp' },
      {
        title: 'Security',
        children: [{ title: 'Credentials', to: 'security-credentials' }],
      },
    ])
  })
})

describe('getSafeHomeRoute', () => {
  it('keeps ai-assistant as home by default', async () => {
    const { getSafeHomeRoute: safeHome } = await loadWithEnv('')

    expect(safeHome()).toBe('ai-assistant')
  })

  it('falls back to the first enabled candidate', async () => {
    const { getSafeHomeRoute: safeHome } = await loadWithEnv('ai-assistant,ai-knowledge')

    expect(safeHome()).toBe('ai-skills')
  })

  it('falls back to the tenant picker when every candidate is disabled', async () => {
    const { getSafeHomeRoute: safeHome } = await loadWithEnv(
      'ai-assistant,ai-knowledge,ai-skills,integrations',
    )

    expect(safeHome()).toBe('tenants')
  })

  describe('resolveFeatureKey / isRouteNameDisabled (rotas filhas herdam o flag)', () => {
    it('resolve a rota filha para o recurso pai', () => {
      expect(resolveFeatureKey('ai-knowledge-id')).toBe('ai-knowledge')
      expect(resolveFeatureKey('ai-knowledge-new')).toBe('ai-knowledge')
      expect(resolveFeatureKey('ai-knowledge')).toBe('ai-knowledge')
      expect(resolveFeatureKey(null)).toBeNull()
      expect(resolveFeatureKey(undefined)).toBeNull()
    })

    it('bloqueia o deep-link do editor quando o recurso está desabilitado', async () => {
      const { isRouteNameDisabled } = await loadWithEnv('ai-knowledge')

      expect(isRouteNameDisabled('ai-knowledge')).toBe(true)
      expect(isRouteNameDisabled('ai-knowledge-new')).toBe(true)
      expect(isRouteNameDisabled('ai-knowledge-id')).toBe(true)
      expect(isRouteNameDisabled('ai-skills')).toBe(false)
      expect(isRouteNameDisabled(null)).toBe(false)
    })

    it('mantém as rotas filhas liberadas quando o recurso está habilitado', async () => {
      const { isRouteNameDisabled } = await loadWithEnv(undefined)

      expect(isRouteNameDisabled('ai-knowledge-id')).toBe(false)
      expect(isRouteNameDisabled('ai-knowledge-new')).toBe(false)
    })
  })
})
