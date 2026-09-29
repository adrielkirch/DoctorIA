import { frozenModules } from '@/navigation/frozenModules'
import { setupGuards } from '@/plugins/1.router/guards'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RouteLocationNormalized, Router } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'


vi.mock('@layouts/plugins/casl', () => ({
  canNavigate: vi.fn((to: RouteLocationNormalized) => {

    if (to.meta?.public)
      return true



    return !to.meta?.requiresAdmin
  }),
}))


const mockCookies: Record<string, any> = {
  userData: null,
  accessToken: null,
  currentTenantId: null,
}

vi.stubGlobal('useCookie', (name: string) => ({
  value: mockCookies[name],
}))

describe('Route Guards (US2)', () => {
  let router: Router

  beforeEach(() => {

    mockCookies.userData = null
    mockCookies.accessToken = null
    mockCookies.currentTenantId = null


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
          path: '/access-control/roles',
          name: 'access-control-roles',
          component: { template: '<div>Roles</div>' },
          meta: { requiresAdmin: true },
        },
        {
          path: '/dashboard',
          name: 'dashboard',
          component: { template: '<div>Dashboard</div>' },
        },
        {
          path: '/not-authorized',
          name: 'not-authorized',
          component: { template: '<div>Not Authorized</div>' },
          meta: { public: true },
        },
        {
          path: '/tenants',
          name: 'tenants',
          component: { template: '<div>Tenants</div>' },
        },
        {
          path: '/:pathMatch(.*)*',
          name: 'error',
          component: { template: '<div>404</div>' },
          meta: { public: true },
        },
      ],
    })

    setupGuards(router as any)
  })

  describe('Unauthenticated Access', () => {
    it('should redirect to login when accessing protected routes without authentication', async () => {
      const to = router.resolve({ name: 'settings' })

      await router.push(to)


      expect(router.currentRoute.value.name).toBe('login')
    })

    it('should allow access to public routes without authentication', async () => {
      const to = router.resolve({ name: 'error' })

      await router.push(to)

      expect(router.currentRoute.value.name).toBe('error')
    })

    it('should allow access to login page when not authenticated', async () => {
      const to = router.resolve({ name: 'login' })

      await router.push(to)

      expect(router.currentRoute.value.name).toBe('login')
    })
  })

  describe('Authenticated Access', () => {
    beforeEach(() => {

      mockCookies.userData = { id: 1, name: 'Test User' }
      mockCookies.accessToken = 'fake-token'
      mockCookies.currentTenantId = 'workspace-alpha'
    })

    it('should redirect to home when accessing login while authenticated', async () => {
      const to = router.resolve({ name: 'login' })

      await router.push(to)

      expect(router.currentRoute.value.path).toBe('/')
    })

    it('should allow access to settings when authenticated', async () => {
      const to = router.resolve({ name: 'settings' })

      await router.push(to)

      expect(router.currentRoute.value.name).toBe('settings')
    })

    it('should block access to admin-only routes for non-admin users', async () => {
      const to = router.resolve({ name: 'access-control-roles' })

      await router.push(to)

      expect(router.currentRoute.value.name).toBe('not-authorized')
    })
  })

  describe('Frozen Module Route Access', () => {
    beforeEach(() => {

      mockCookies.userData = { id: 1, name: 'Test User' }
      mockCookies.accessToken = 'fake-token'
      mockCookies.currentTenantId = 'workspace-alpha'
    })

    it('should respect directAccessPolicy for frozen modules', () => {
      frozenModules.forEach(module => {
        expect(module.directAccessPolicy).toBeDefined()
        expect(['allow-authorized', 'deny-all', 'allow-admin']).toContain(
          module.directAccessPolicy,
        )
      })
    })

    it('should allow direct access to frozen modules with allow-authorized policy', async () => {

      const to = router.resolve({ name: 'dashboard' })

      await router.push(to)


      expect(router.currentRoute.value.name).toBe('dashboard')
    })
  })

  describe('Query Parameter Preservation', () => {
    it('should preserve redirect path in query when redirecting to login', async () => {
      const to = router.resolve({
        name: 'settings',
        query: { tab: 'profile' },
      })

      await router.push(to)

      expect(router.currentRoute.value.name).toBe('login')
      expect(router.currentRoute.value.query.to).toBeDefined()
    })

    it('should not add redirect path for root route', async () => {
      const to = router.resolve({ path: '/' })

      await router.push(to)

      expect(router.currentRoute.value.query.to).toBeUndefined()
    })
  })

  describe('Permission-Based Navigation', () => {
    beforeEach(() => {
      mockCookies.userData = { id: 1, name: 'Test User' }
      mockCookies.accessToken = 'fake-token'
      mockCookies.currentTenantId = 'workspace-alpha'
    })

    it('should check canNavigate for protected routes', async () => {
      const { canNavigate } = await import('@layouts/plugins/casl')
      const spy = vi.mocked(canNavigate)

      const to = router.resolve({ name: 'settings' })

      await router.push(to)

      expect(spy).toHaveBeenCalled()
    })

    it('should allow navigation when canNavigate returns true', async () => {
      const to = router.resolve({ name: 'settings' })

      await router.push(to)

      expect(router.currentRoute.value.name).toBe('settings')
    })
  })

  describe('Role-Based Route Access', () => {
    it('should maintain consistent access policies across authenticated sessions', () => {


      const policies = frozenModules.map(m => m.directAccessPolicy)

      for (const policy of policies)
        expect(policy).toBe('allow-authorized')
    })
  })

  describe('Tenant Context', () => {
    it('should redirect authenticated users without active tenant to tenants picker', async () => {
      mockCookies.userData = { id: 1, name: 'Test User' }
      mockCookies.accessToken = 'fake-token'
      mockCookies.currentTenantId = null

      const to = router.resolve({ name: 'settings' })

      await router.push(to)

      expect(router.currentRoute.value.name).toBe('tenants')
    })

    it('should allow authenticated users to access tenants picker without active tenant', async () => {
      mockCookies.userData = { id: 1, name: 'Test User' }
      mockCookies.accessToken = 'fake-token'
      mockCookies.currentTenantId = null

      const to = router.resolve({ name: 'tenants' })

      await router.push(to)

      expect(router.currentRoute.value.name).toBe('tenants')
    })

    it('should redirect unauthenticated users away from tenants picker', async () => {
      const to = router.resolve({ name: 'tenants' })

      await router.push(to)

      expect(router.currentRoute.value.name).toBe('login')
    })
  })
})
