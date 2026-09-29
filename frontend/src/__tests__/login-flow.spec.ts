import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouter, createWebHistory } from 'vue-router'

import { useCookie } from '@/@core/composable/useCookie'
import LoginPage from '@/pages/login.vue'
import { setupGuards } from '@/plugins/1.router/guards'
import { handlerAuth } from '@/plugins/fake-api/handlers/auth'
import { $api } from '@/utils/api'
import { setupServer } from 'msw/node'
import { h } from 'vue'



vi.mock('../../themeConfig', () => ({
  themeConfig: {
    app: {
      title: 'doctoria',
      logo: { type: Symbol('vnode') },
    },
  },
  layoutConfig: {},
}))

vi.stubGlobal('h', h)
vi.stubGlobal('definePage', vi.fn())

vi.mock('@layouts/plugins/casl', () => ({
  canNavigate: vi.fn(() => true),
}))


vi.stubGlobal('useCookie', useCookie)


vi.stubGlobal('$api', $api)

vi.stubGlobal('useAbility', () => ({ update: vi.fn() }))


const server = setupServer(...handlerAuth)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('login flow (pós-login: cookies reais + navegação para /tenants)', () => {
  let router: ReturnType<typeof createRouter>

  beforeEach(() => {

    document.cookie.split(';').forEach(c => {
      const name = c.split('=')[0].trim()

      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
    })

    setActivePinia(createPinia())

    router = createRouter({
      history: createWebHistory(),
      routes: [
        {
          path: '/',
          name: 'index',
          redirect: () => (useCookie('userData').value ? { name: 'ai-assistant' } : { name: 'login' }),
        },
        {
          path: '/login',
          name: 'login',
          component: LoginPage,
          meta: { unauthenticatedOnly: true },
        },
        {
          path: '/tenants',
          name: 'tenants',
          component: { template: '<div>Tenants</div>' },
        },
        {
          path: '/ai/assistant',
          name: 'ai-assistant',
          component: { template: '<div>AI</div>' },
        },
        {
          path: '/not-authorized',
          name: 'not-authorized',
          component: { template: '<div>NA</div>' },
          meta: { public: true },
        },
      ],
    })

    setupGuards(router as any)
  })

  it('login 200 → grava cookies reais → navega para /tenants (não volta para /login)', async () => {
    await router.push({ name: 'login' })

    const wrapper = mount(LoginPage, {
      global: {
        plugins: [router],
        stubs: {
          VRow: { template: '<div><slot /></div>' },
          VCol: { template: '<div><slot /></div>' },
          VImg: { template: '<div />' },
          VCard: { template: '<section><slot /></section>' },
          VCardText: { template: '<div><slot /></div>' },
          VAlert: { template: '<div><slot /></div>' },
          VForm: {
            template: '<form><slot /></form>',
            methods: { validate: () => Promise.resolve({ valid: true }) },
          },
          AppTextField: { template: '<input />' },
          VCheckbox: { template: '<input type="checkbox" />' },
          VBtn: { template: '<button type="button"><slot /></button>' },
          VDivider: { template: '<hr />' },
          Logo: { template: '<span>Brand</span>' },
          AuthProvider: { template: '<div />' },
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    })


    await (wrapper.vm.$refs.refVForm as any).$emit('submit', { preventDefault: vi.fn() })
    await new Promise(resolve => setTimeout(resolve, 0))

    console.log('COOKIES FINAIS:', document.cookie)
    console.log('ROTA ATUAL:', router.currentRoute.value.name, router.currentRoute.value.fullPath)

    expect(document.cookie).toContain('accessToken=')


    expect(useCookie('userData').value).toMatchObject({ username: 'johndoe' })
    expect(useCookie('userData').value).not.toHaveProperty('role')
    expect(useCookie('memberships').value).toHaveLength(2)


    expect(router.currentRoute.value.name).toBe('tenants')
  })
})
