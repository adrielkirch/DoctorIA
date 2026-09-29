import { $api } from '@/utils/api'
import {
    isTenantScopedPath,
    redirectToTenantPicker,
    setTenantMissingHandler,
} from '@/utils/tenantContext'
import { afterEach, describe, expect, it, vi } from 'vitest'

const mockCookies: Record<string, unknown> = {
  accessToken: null,
  currentTenantId: null,
}

vi.stubGlobal('useCookie', (name: string) => ({
  get value() {
    return mockCookies[name]
  },
}))

describe('tenantContext global guard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    setTenantMissingHandler(null)
    mockCookies.accessToken = null
    mockCookies.currentTenantId = null
  })

  it('treats tenant-scoped paths as scoped and whitelists tenant-agnostic ones', () => {
    expect(isTenantScopedPath('/security/credentials')).toBe(true)
    expect(isTenantScopedPath('/app-bar/search?q=x')).toBe(true)
    expect(isTenantScopedPath('/tenants')).toBe(false)
    expect(isTenantScopedPath('/auth/login')).toBe(false)
  })

  it('redirects through the registered SPA handler', () => {
    const handler = vi.fn()

    setTenantMissingHandler(handler)
    redirectToTenantPicker()

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('blocks tenant-scoped API calls and redirects when there is no tenant', async () => {
    mockCookies.accessToken = 'token'
    mockCookies.currentTenantId = null

    const handler = vi.fn()

    setTenantMissingHandler(handler)

    await expect($api('/security/credentials')).rejects.toThrow('ACTIVE_TENANT_REQUIRED')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('allows tenant-agnostic endpoints without an active tenant', async () => {
    mockCookies.accessToken = 'token'
    mockCookies.currentTenantId = null

    const handler = vi.fn()

    setTenantMissingHandler(handler)

    try {
      await $api('/tenants', { method: 'POST', body: { name: 'X' } })
    }
    catch (error) {

      expect(String(error)).not.toContain('ACTIVE_TENANT_REQUIRED')
    }

    expect(handler).not.toHaveBeenCalled()
  })
})
