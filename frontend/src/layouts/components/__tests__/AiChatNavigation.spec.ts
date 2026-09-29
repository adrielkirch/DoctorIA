import AiChatListItem from '@/layouts/components/vertical-nav-views/AiChatListItem.vue'
import AiChatNavigation from '@/layouts/components/vertical-nav-views/AiChatNavigation.vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { routerKey } from 'vue-router'

const mocks = vi.hoisted(() => ({
  $api: vi.fn(),
  copyToClipboard: vi.fn(),
  snackbar: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  router: { push: vi.fn(), go: vi.fn() },
}))

vi.mock('@/utils/api', () => ({ $api: mocks.$api }))
vi.mock('@/utils/shareUtils', () => ({ copyToClipboard: mocks.copyToClipboard }))
vi.mock('@/composables/useSnackbar', () => ({ useSnackbar: () => mocks.snackbar }))
vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => ({ currentTenantId: 'workspace-alpha' }),
}))

function makePage(page: number, count: number, hasMore: boolean) {
  return {
    data: Array.from({ length: count }, (_, i) => ({
      id: `chat-${page}-${i}`,
      tenantId: 'workspace-alpha',
      title: `Chat ${page}-${i}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 5,
      isShared: false,
    })),
    total: 40,
    page,
    limit: 18,
    hasMore,
  }
}

function mountNav() {
  return mount(AiChatNavigation, {
    global: {
      plugins: [createPinia()],
      provide: {

        [routerKey as symbol]: mocks.router,
      },
      stubs: {
        PerfectScrollbar: { template: '<div class="ps-stub"><slot /></div>' },
        VProgressCircular: { template: '<span class="spinner" />' },
        VTextField: { template: '<input class="text-field" />' },
        VMenu: { template: '<div class="menu"><slot name="activator" /><slot /></div>' },
        VBtn: { template: '<button class="btn"><slot /></button>' },
        VList: { template: '<div class="list"><slot /></div>' },
        VListItem: { template: '<div class="list-item"><slot /></div>' },
        VListItemTitle: { template: '<div class="list-item-title"><slot /></div>' },
        VDivider: { template: '<hr />' },
      },
    },
  })
}

describe('AiChatNavigation — histórico com infinite scroll', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
  })

  it('busca o histórico no onMounted quando a lista está vazia', async () => {
    mocks.$api.mockResolvedValue(makePage(0, 2, true))

    const wrapper = mountNav()

    await flushPromises()

    expect(mocks.$api).toHaveBeenCalledWith('/ai/chat-history', { query: { page: '0', limit: '18' } })
    expect(wrapper.findAllComponents(AiChatListItem)).toHaveLength(2)
    expect(wrapper.text()).toContain('Chat 0-0')
    expect(wrapper.text()).toContain('Chat history')
  })

  it('scroll próximo ao fim dispara o fetch da próxima página', async () => {
    mocks.$api.mockResolvedValueOnce(makePage(0, 18, true))
    mocks.$api.mockResolvedValueOnce(makePage(1, 4, false))

    const wrapper = mountNav()

    await flushPromises()
    expect(wrapper.findAllComponents(AiChatListItem)).toHaveLength(18)

    const el = wrapper.find('.ps-stub').element as HTMLElement

    Object.defineProperty(el, 'scrollTop', { value: 590, configurable: true })
    Object.defineProperty(el, 'scrollHeight', { value: 900, configurable: true })
    Object.defineProperty(el, 'clientHeight', { value: 300, configurable: true })

    await wrapper.find('.ps-stub').trigger('ps-scroll-y')
    await flushPromises()

    expect(mocks.$api).toHaveBeenLastCalledWith('/ai/chat-history', { query: { page: '1', limit: '18' } })
    expect(wrapper.findAllComponents(AiChatListItem)).toHaveLength(22)
  })

  it('share copia o link e mostra snackbar de sucesso', async () => {
    mocks.$api.mockResolvedValue(makePage(0, 2, false))
    mocks.copyToClipboard.mockResolvedValue(true)

    const wrapper = mountNav()

    await flushPromises()

    mocks.$api.mockResolvedValueOnce({ shareUrl: 'https://app.example.com/share/chat-0-0' })

    const item = wrapper.findAllComponents(AiChatListItem)[0]

    item.vm.$emit('share', 'chat-0-0')
    await flushPromises()

    expect(mocks.$api).toHaveBeenCalledWith('/ai/chat-history/chat-0-0/share', { method: 'POST' })
    expect(mocks.copyToClipboard).toHaveBeenCalledWith('https://app.example.com/share/chat-0-0')
    expect(mocks.snackbar.success).toHaveBeenCalledWith('Chat link copied to clipboard!')
  })

  it('novo chat navega para o assistant sem conversa selecionada', async () => {
    mocks.$api.mockResolvedValue(makePage(0, 2, false))

    const wrapper = mountNav()

    await flushPromises()

    await wrapper.find('.chat-navigation__action').trigger('click')

    expect(mocks.router.push).toHaveBeenCalledWith({ name: 'ai-assistant', query: {} })
  })

})
