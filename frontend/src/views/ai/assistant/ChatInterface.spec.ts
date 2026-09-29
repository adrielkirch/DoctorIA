import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import CapabilitiesPanel from './CapabilitiesPanel.vue'
import ChatInput from './ChatInput.vue'
import ChatInterface from './ChatInterface.vue'
import ChatMessage from './ChatMessage.vue'

const mocks = vi.hoisted(() => ({
  $api: vi.fn(),
  snackbar: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  route: { query: {} as Record<string, string>, params: {} as Record<string, string> },
  router: { replace: vi.fn() },
}))




const reactiveRoute = reactive(mocks.route)

vi.mock('@/utils/api', () => ({ $api: mocks.$api }))
vi.mock('@/composables/useSnackbar', () => ({ useSnackbar: () => mocks.snackbar }))
vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => ({ user: { fullName: 'John Doe' } }),
}))
vi.mock('vue-router', () => ({ useRoute: () => reactiveRoute, useRouter: () => mocks.router }))

function makeMessages(chatId: string) {
  return [
    { id: `${chatId}-m0`, chatId, role: 'user', content: 'Pergunta', createdAt: new Date().toISOString() },
    { id: `${chatId}-m1`, chatId, role: 'assistant', content: 'Resposta', createdAt: new Date().toISOString() },
  ]
}

function mountInterface() {
  return mount(ChatInterface, {
    global: {
      plugins: [createPinia()],
      stubs: {



        ChatInput: { template: '<div class="chat-input-stub" />' },
        CapabilitiesPanel: { template: '<div class="capabilities-stub" />' },
        VChip: { template: '<span class="chip-stub"><slot /></span>' },
        VIcon: { template: '<span class="icon-stub" />' },
      },
    },
  })
}

describe('ChatInterface — shell da interface de chat', () => {



  enableAutoUnmount(afterEach)

  beforeEach(() => {
    setActivePinia(createPinia())
    reactiveRoute.query = {}
    reactiveRoute.params = {}
    vi.resetAllMocks()



    window.scrollTo = vi.fn()
  })

  it('sem query `chat` mostra a boas-vindas com o nome do usuário', async () => {
    const wrapper = mountInterface()

    await flushPromises()

    expect(wrapper.text()).toContain('Hi John Doe, what\'s on your mind?')
    expect(wrapper.text()).toContain("I'm here to help you with any question or task. How can I be useful?")
    expect(wrapper.find('.chat-interface__welcome').exists()).toBe(true)
    expect(mocks.$api).not.toHaveBeenCalled()
  })

  it('com URL curta `/c/chat-1` (params) carrega a conversa e renderiza as mensagens', async () => {
    mocks.$api.mockResolvedValue({ data: makeMessages('chat-1'), total: 2, page: 0, limit: 2, hasMore: false })

    reactiveRoute.params = { chatId: 'chat-1' }

    const wrapper = mountInterface()

    await flushPromises()

    expect(mocks.$api).toHaveBeenCalledWith('/ai/chat-history/chat-1/messages')
    expect(wrapper.findAllComponents(ChatMessage)).toHaveLength(2)
    expect(wrapper.text()).toContain('Pergunta')
    expect(wrapper.text()).toContain('Resposta')
    expect(wrapper.find('.chat-interface__welcome').exists()).toBe(false)
  })

  it('troca de chat recarrega a conversa (sidebar navegando entre chats)', async () => {
    mocks.$api.mockResolvedValueOnce({ data: makeMessages('chat-1'), total: 2, page: 0, limit: 2, hasMore: false })
    mocks.$api.mockResolvedValueOnce({ data: makeMessages('chat-2'), total: 2, page: 0, limit: 2, hasMore: false })

    reactiveRoute.params = { chatId: 'chat-1' }

    const wrapper = mountInterface()

    await flushPromises()
    expect(mocks.$api).toHaveBeenLastCalledWith('/ai/chat-history/chat-1/messages')

    reactiveRoute.params = { chatId: 'chat-2' }
    await flushPromises()

    expect(mocks.$api).toHaveBeenLastCalledWith('/ai/chat-history/chat-2/messages')
    expect(wrapper.text()).toContain('Resposta')
  })

  it('novo chat (sem chatId) zera a conversa', async () => {
    mocks.$api.mockResolvedValue({ data: makeMessages('chat-1'), total: 2, page: 0, limit: 2, hasMore: false })

    reactiveRoute.params = { chatId: 'chat-1' }

    const wrapper = mountInterface()

    await flushPromises()
    expect(wrapper.findAllComponents(ChatMessage)).toHaveLength(2)

    reactiveRoute.params = {}
    await flushPromises()

    expect(wrapper.findAllComponents(ChatMessage)).toHaveLength(0)
    expect(wrapper.find('.chat-interface__welcome').exists()).toBe(true)
  })

  it('envia mensagem (novo chat) via POST /ai/chat-history e anexa reply', async () => {
    const now = new Date().toISOString()

    mocks.$api.mockResolvedValue({
      chat: { id: 'chat-novo', tenantId: 'workspace-alpha', title: 'Oi', createdAt: now, updatedAt: now, messageCount: 2, isShared: false },
      message: { id: 'chat-novo-m1', chatId: 'chat-novo', role: 'user', content: 'Oi', createdAt: now },
      reply: { id: 'chat-novo-m2', chatId: 'chat-novo', role: 'assistant', content: 'Olá!', createdAt: now },
    })


    vi.useFakeTimers()

    const wrapper = mountInterface()

    await flushPromises()

    wrapper.findComponent(ChatInput).vm.$emit('send', 'Oi')
    await flushPromises()

    expect(mocks.$api).toHaveBeenCalledWith('/ai/chat-history', { method: 'POST', body: { content: 'Oi' } })
    expect(wrapper.findAllComponents(ChatMessage)).toHaveLength(2)


    await vi.advanceTimersByTimeAsync(1000)
    await flushPromises()

    expect(wrapper.text()).toContain('Olá!')
    expect(wrapper.find('.chat-message__cursor').exists()).toBe(false)


    expect(mocks.router.replace).toHaveBeenCalledWith({ name: 'c-chatId', params: { chatId: 'chat-novo' } })

    vi.useRealTimers()
  })

  it('anexa arquivos selecionados ao enviar', async () => {
    const now = new Date().toISOString()

    mocks.$api.mockResolvedValue({
      chat: { id: 'chat-novo', tenantId: 'workspace-alpha', title: 'Oi', createdAt: now, updatedAt: now, messageCount: 2, isShared: false },
      message: { id: 'chat-novo-m1', chatId: 'chat-novo', role: 'user', content: 'Oi', createdAt: now },
      reply: { id: 'chat-novo-m2', chatId: 'chat-novo', role: 'assistant', content: 'Olá!', createdAt: now },
    })

    const wrapper = mountInterface()

    await flushPromises()

    const file = new File(['x'], 'nota.txt', { type: 'text/plain' })

    wrapper.findComponent(ChatInput).vm.$emit('fileSelect', [file])
    await flushPromises()

    expect(wrapper.findAll('.chat-interface__file')).toHaveLength(1)
    expect(wrapper.text()).toContain('nota.txt')

    wrapper.findComponent(ChatInput).vm.$emit('send', 'Oi')
    await flushPromises()

    expect(mocks.$api).toHaveBeenCalledWith('/ai/chat-history', {
      method: 'POST',
      body: { content: 'Oi', attachments: [{ name: 'nota.txt', size: 1, mimeType: 'text/plain' }] },
    })
    expect(wrapper.findAll('.chat-interface__file')).toHaveLength(0)
  })

  it('limita a 5 arquivos por mensagem e avisa via snackbar', async () => {
    const wrapper = mountInterface()

    await flushPromises()

    const files = Array.from({ length: 6 }, (_, i) => new File(['x'], `f${i}.txt`, { type: 'text/plain' }))

    wrapper.findComponent(ChatInput).vm.$emit('fileSelect', files)
    await flushPromises()

    expect(wrapper.findAll('.chat-interface__file')).toHaveLength(5)
    expect(mocks.snackbar.warning).toHaveBeenCalledWith('Up to 5 files per message.')
  })

  it('toggle do botão de capacidades abre o painel; selecionar fecha e informa', async () => {
    const wrapper = mountInterface()

    await flushPromises()

    expect(wrapper.find('.capabilities-stub').exists()).toBe(false)

    wrapper.findComponent(ChatInput).vm.$emit('toggleCapabilities')
    await flushPromises()

    expect(wrapper.find('.capabilities-stub').exists()).toBe(true)

    wrapper.findComponent(CapabilitiesPanel).vm.$emit('selectCapability', 'knowledge')
    await flushPromises()

    expect(wrapper.find('.capabilities-stub').exists()).toBe(false)
    expect(mocks.snackbar.info).toHaveBeenCalledWith('Selected resource: Knowledge')
  })
})
