import { setupGuards } from '@/plugins/1.router/guards'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import CredentialsPage from '@/pages/security/credentials/index.vue'

vi.stubGlobal('definePage', vi.fn())

vi.mock('@/stores/useAccessControlStore', () => ({
  useAccessControlStore: () => ({ can: () => true, ensureLoaded: () => {} }),
}))

vi.mock('@layouts/plugins/casl', () => ({
  canNavigate: vi.fn(() => !!(mockCookies.userData && mockCookies.accessToken)),
}))

const mockStore = {
  credentials: [
    {
      id: 1,
      tenantId: 'workspace-alpha',
      key: 'APP_REGION',
      type: 'VARIABLE',
      value: 'us-east-1',
      description: 'Region selector',
      updatedAt: '2026-08-01T10:00:00.000Z',
    },
    {
      id: 11,
      tenantId: 'workspace-alpha',
      key: 'OPENAI_API_KEY',
      type: 'SECRET',
      maskedValue: '********',
      description: 'Main API key',
      updatedAt: '2026-08-01T10:00:00.000Z',
    },
  ],
  searchQuery: '',
  activeFilter: 'all' as 'all' | 'secret' | 'variable',
  isLoading: false,
  variables: [
    {
      id: 1,
      tenantId: 'workspace-alpha',
      key: 'APP_REGION',
      type: 'VARIABLE',
      value: 'us-east-1',
      description: 'Region selector',
      updatedAt: '2026-08-01T10:00:00.000Z',
    },
  ],
  secrets: [
    {
      id: 11,
      tenantId: 'workspace-alpha',
      key: 'OPENAI_API_KEY',
      type: 'SECRET',
      maskedValue: '********',
      description: 'Main API key',
      updatedAt: '2026-08-01T10:00:00.000Z',
    },
  ],
  fetchCredentials: vi.fn().mockResolvedValue(undefined),
  createVariable: vi.fn().mockResolvedValue({ id: 99 }),
  createSecret: vi.fn().mockResolvedValue({ id: 199 }),
  updateVariable: vi.fn().mockResolvedValue({ id: 1 }),
  deleteSecret: vi.fn().mockResolvedValue(undefined),
}

const mockCookies: Record<string, unknown> = {
  userData: { id: 1, name: 'User' },
  accessToken: 'token',
  currentTenantId: 'workspace-alpha',
}

vi.mock('#app', () => ({
  useCookie: (name: string) => ({
    get value() {
      return mockCookies[name]
    },
  }),
}))

vi.stubGlobal('useCookie', (name: string) => ({
  get value() {
    return mockCookies[name]
  },
}))

vi.mock('@/views/security/credentials/useCredentialsStore', () => ({
  useCredentialsStore: () => mockStore,
}))

describe('Credentials page', () => {
  beforeEach(() => {
    mockStore.fetchCredentials.mockReset()
    mockStore.fetchCredentials.mockResolvedValue(undefined)
    mockStore.createVariable.mockReset()
    mockStore.createVariable.mockResolvedValue({ id: 99 })
    mockStore.createSecret.mockReset()
    mockStore.createSecret.mockResolvedValue({ id: 199 })
    mockStore.updateVariable.mockReset()
    mockStore.updateVariable.mockResolvedValue({ id: 1 })
    mockStore.deleteSecret.mockReset()
    mockStore.deleteSecret.mockResolvedValue(undefined)
    mockCookies.userData = { id: 1, name: 'User' }
    mockCookies.accessToken = 'token'
  })

  function mountPage() {
    return mount(CredentialsPage, {
      global: {
        stubs: {
          VBtn: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
          VChip: { template: '<button><slot /></button>' },
          VTextField: { template: '<input />' },
          VTextarea: { template: '<textarea />' },
          VProgressLinear: true,
          VAlert: { template: '<div><slot />{{ title }}{{ text }}</div>', props: ['title', 'text'] },
          VCard: { template: '<section><slot /></section>' },
          VCardItem: { template: '<div><slot /></div>' },
          VCardTitle: { template: '<h3><slot /></h3>' },
          VCardText: { template: '<div><slot /></div>' },
          VCardActions: { template: '<div><slot /></div>' },
          VList: { template: '<div><slot /></div>' },
          VListItem: { template: '<article><slot name="prepend" /><slot /><slot name="append" /></article>' },
          VListItemTitle: { template: '<h4><slot /></h4>' },
          VListItemSubtitle: { template: '<p><slot /></p>' },
          VAvatar: { template: '<span><slot /></span>' },
          VIcon: true,
          VSpacer: { template: '<span />' },
          VDialog: { template: '<div><slot /></div>' },
          VNavigationDrawer: { template: '<div><slot /></div>' },
          VSnackbar: { template: '<div><slot /></div>' },
          VariableDrawer: {
            props: ['modelValue'],
            template: `
              <div>
                <button data-test="submit-create" @click="$emit('submit', { credentialType: 'VARIABLE', key: 'NEW_VAR', value: '1' })">emit-create</button>
                <button data-test="submit-create-secret" @click="$emit('submit', { credentialType: 'SECRET', key: 'OPENAI_NEW_KEY', value: 'top-secret' })">emit-create-secret</button>
                <button data-test="submit-edit" @click="$emit('submit', { id: 1, key: 'APP_REGION', value: '2' })">emit-edit</button>
              </div>
            `,
          },
        },
      },
    })
  }

  it('renders grouped sections and filter controls', async () => {
    const wrapper = mountPage()

    await nextTick()

    expect(mockStore.fetchCredentials).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('Credentials')
    expect(wrapper.text()).toContain('Variables')
    expect(wrapper.text()).toContain('Secrets')
    expect(wrapper.text()).toContain('All')
    expect(wrapper.text()).toContain('Secret')
    expect(wrapper.text()).toContain('Variable')
  })

  it('shows allowed actions only by credential type at page level', async () => {
    const wrapper = mountPage()

    await nextTick()

    expect(wrapper.text()).toContain('Edit Variable')
    expect(wrapper.text()).toContain('Delete Secret')
    expect(wrapper.text()).not.toContain('Delete Variable')
    expect(wrapper.text()).not.toContain('Edit Secret')
  })

  it('shows success feedback for create, edit, and delete actions', async () => {
    const wrapper = mountPage()

    await wrapper.find('[data-test="submit-create"]').trigger('click')
    await nextTick()
    expect(mockStore.createVariable).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Default created successfully.')

    await wrapper.find('[data-test="submit-create-secret"]').trigger('click')
    await nextTick()
    expect(mockStore.createSecret).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Secret created successfully.')

    await wrapper.find('[data-test="submit-edit"]').trigger('click')
    await nextTick()
    expect(mockStore.updateVariable).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Variable updated successfully.')

    const deleteButton = wrapper.findAll('button').find(item => item.text().includes('Delete Secret'))

    expect(deleteButton).toBeTruthy()
    await deleteButton!.trigger('click')

    const confirmButton = wrapper.findAll('button').find(item => item.text().includes('Confirm Delete'))

    expect(confirmButton).toBeTruthy()
    await confirmButton!.trigger('click')
    await nextTick()
    expect(mockStore.deleteSecret).toHaveBeenCalled()
    expect(wrapper.text()).toContain('Secret deleted successfully.')
  })

  it('shows error feedback when create, edit, and delete fail', async () => {
    mockStore.createVariable.mockRejectedValueOnce(new Error('create failed'))
    mockStore.createSecret.mockRejectedValueOnce(new Error('create secret failed'))
    mockStore.updateVariable.mockRejectedValueOnce(new Error('edit failed'))
    mockStore.deleteSecret.mockRejectedValue(new Error('delete failed'))

    const wrapper = mountPage()

    await wrapper.find('[data-test="submit-create"]').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('Unable to save variable. Please try again.')

    await wrapper.find('[data-test="submit-create-secret"]').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('Unable to save variable. Please try again.')

    await wrapper.find('[data-test="submit-edit"]').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('Unable to save variable. Please try again.')

    const deleteButton = wrapper.findAll('button').find(item => item.text().includes('Delete Secret'))

    expect(deleteButton).toBeTruthy()
    await deleteButton!.trigger('click')

    const confirmButton = wrapper.findAll('button').find(item => item.text().includes('Confirm Delete'))

    expect(confirmButton).toBeTruthy()
    await confirmButton!.trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('Unable to delete secret. Please try again.')
  })

  it('allows authenticated access and redirects guests to login for credentials route', async () => {
    setActivePinia(createPinia())

    const router = createRouter({
      history: createWebHistory(),
      routes: [
        {
          path: '/security/credentials',
          name: 'security-credentials',
          component: { template: '<div>Credentials</div>' },
        },
        {
          path: '/login',
          name: 'login',
          component: { template: '<div>Login</div>' },
          meta: { unauthenticatedOnly: true },
        },
        {
          path: '/tenants',
          name: 'tenants',
          component: { template: '<div>Tenants</div>' },
        },
        {
          path: '/not-authorized',
          name: 'not-authorized',
          component: { template: '<div>No</div>' },
          meta: { public: true },
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

    mockCookies.userData = { id: 1 }
    mockCookies.accessToken = 'token'
    mockCookies.currentTenantId = 'workspace-alpha'
    await router.push({ name: 'security-credentials' })
    expect(router.currentRoute.value.name).toBe('security-credentials')

    mockCookies.userData = null
    mockCookies.accessToken = null
    mockCookies.currentTenantId = null
    await router.push({ name: 'login' })
    await router.push({ name: 'security-credentials' })
    expect(router.currentRoute.value.name).toBe('login')
  })
})
