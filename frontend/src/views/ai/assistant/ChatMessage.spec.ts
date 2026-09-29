import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import type { AiChatMessageItem } from 'contracts/ai/chat-history/types'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ChatMessage from './ChatMessage.vue'

const copyMock = vi.hoisted(() => vi.fn())

vi.mock('@/utils/shareUtils', () => ({ copyToClipboard: copyMock }))

function makeMessage(role: 'user' | 'assistant', overrides: Partial<AiChatMessageItem> = {}): AiChatMessageItem {
  return {
    id: `m-${role}`,
    chatId: 'chat-1',
    role,
    content: 'Conteúdo da mensagem',
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function mountMessage(message: AiChatMessageItem, extraProps: Record<string, unknown> = {}) {
  return mount(ChatMessage, {
    props: { message, ...extraProps },
    global: {
      stubs: {
        VIcon: { template: '<span class="icon-stub" />' },
      },
    },
  })
}

describe('ChatMessage — bolhas refinadas', () => {
  enableAutoUnmount(afterEach)

  it('renderiza o conteúdo da mensagem', () => {
    const wrapper = mountMessage(makeMessage('assistant'))

    expect(wrapper.text()).toContain('Conteúdo da mensagem')
  })

  it('usuário: bolha alinhada à direita e sem botão de copiar', () => {
    const wrapper = mountMessage(makeMessage('user'))

    expect(wrapper.classes()).toContain('chat-message--user')
    expect(wrapper.find('.chat-message__bubble').exists()).toBe(true)
    expect(wrapper.find('.chat-message__copy').exists()).toBe(false)


    expect(wrapper.find('.chat-message__avatar').exists()).toBe(false)
    expect(wrapper.find('.chat-message__time').exists()).toBe(false)
  })

  it('assistente: texto livre com botão de copiar abaixo (sem avatar)', () => {
    const wrapper = mountMessage(makeMessage('assistant'))

    expect(wrapper.find('.chat-message__avatar').exists()).toBe(false)
    expect(wrapper.find('.chat-message__bubble').exists()).toBe(false)
    expect(wrapper.find('.chat-message__copy').exists()).toBe(true)
  })

  it('copiar chama copyToClipboard e mostra feedback de sucesso', async () => {
    copyMock.mockResolvedValue(true)

    const wrapper = mountMessage(makeMessage('assistant'))

    await wrapper.find('.chat-message__copy').trigger('click')
    await flushPromises()

    expect(copyMock).toHaveBeenCalledWith('Conteúdo da mensagem')
    expect(wrapper.find('.chat-message__copy--done').exists()).toBe(true)
  })

  it('copiar falha: não mostra feedback de sucesso', async () => {
    copyMock.mockResolvedValue(false)

    const wrapper = mountMessage(makeMessage('assistant'))

    await wrapper.find('.chat-message__copy').trigger('click')
    await flushPromises()

    expect(wrapper.find('.chat-message__copy--done').exists()).toBe(false)
  })

  it('mostra os anexos quando a mensagem tem attachments', () => {
    const wrapper = mountMessage(makeMessage('user', {
      attachments: [{ name: 'relatorio.pdf', size: 1024, mimeType: 'application/pdf' }],
    }))

    expect(wrapper.text()).toContain('relatorio.pdf')
  })

  it('Fase 3: assistente renderiza markdown (h2/strong) via MarkdownRenderer', () => {
    const wrapper = mountMessage(makeMessage('assistant', { content: '## Resumo\n\n**negrito**' }))

    expect(wrapper.find('h2').text()).toBe('Resumo')
    expect(wrapper.find('strong').text()).toBe('negrito')
  })

  it('Fase 3: streaming mostra o cursor de digitação e oculta o copiar', () => {
    const wrapper = mountMessage(makeMessage('assistant'), { isStreaming: true })

    expect(wrapper.find('.chat-message__cursor').exists()).toBe(true)
    expect(wrapper.find('.chat-message__copy').exists()).toBe(false)
  })

  it('sem streaming não exibe cursor', () => {
    const wrapper = mountMessage(makeMessage('assistant'))

    expect(wrapper.find('.chat-message__cursor').exists()).toBe(false)
  })
})
