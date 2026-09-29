import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Router } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'

import { setupGuards } from '@/plugins/1.router/guards'


vi.mock('@layouts/plugins/casl', () => ({
  canNavigate: vi.fn(() => true),
}))




vi.mock('@/config/featureFlags', () => ({
  isFeatureDisabled: vi.fn((feature: string) => ['settings', 'maintenance'].includes(feature)),
  isRouteNameDisabled: vi.fn((routeName: string | null) => routeName !== null && ['settings', 'maintenance'].includes(routeName)),
  getSafeHomeRoute: vi.fn(() => 'home'),
}))


const mockCookies: Record<string, unknown> = {
  userData: { id: 1, name: 'Test User' },
  accessToken: 'fake-token',
  currentTenantId: 'workspace-alpha',
}

vi.stubGlobal('useCookie', (name: string) => ({
  value: mockCookies[name],
}))

describe('Route Guards — Feature Flags', () => {
  let router: Router

  beforeEach(() => {
    router = createRouter({
      history: createWebHistory(),
      routes: [
        {
          path: '/',
          name: 'home',
          component: { template: '<div>Home</div>' },
        },
        {
          path: '/login',
          name: 'login',
          component: { template: '<div>Login</div>' },
          meta: { unauthenticatedOnly: true },
        },
        {
          path: '/settings',
          name: 'settings',
          component: { template: '<div>Settings</div>' },
        },
        {
          path: '/maintenance',
          name: 'maintenance',
          component: { template: '<div>Maintenance</div>' },
          meta: { public: true },
        },
        {
          path: '/not-authorized',
          name: 'not-authorized',
          component: { template: '<div>Not Authorized</div>' },
          meta: { public: true },
        },
      ],
    })

    setupGuards(router as any)
  })

  it('redirects to the safe home route when the feature is disabled', async () => {
    await router.push({ name: 'settings' })

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('blocks direct URL access to disabled public routes', async () => {
    await router.push({ path: '/maintenance' })

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('allows navigation to routes whose feature is enabled', async () => {
    await router.push({ name: 'not-authorized' })

    expect(router.currentRoute.value.name).toBe('not-authorized')
  })

  it('allows navigation to the home route itself', async () => {
    await router.push({ name: 'home' })

    expect(router.currentRoute.value.name).toBe('home')
  })
})
