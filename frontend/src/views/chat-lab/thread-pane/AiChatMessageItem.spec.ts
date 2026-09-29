import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import type { AiChatMessageItem as AiChatMessageItemType } from 'contracts/ai/chat-history/types'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AiChatMessageItem from './AiChatMessageItem.vue'

const copyMock = vi.hoisted(() => vi.fn())
const snackbarMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('@/utils/shareUtils', () => ({ copyToClipboard: copyMock }))
vi.mock('@/composables/useSnackbar', () => ({ useSnackbar: () => snackbarMock }))

function makeMessage(role: 'user' | 'assistant', overrides: Partial<AiChatMessageItemType> = {}): AiChatMessageItemType {
  return {
    id: `m-${role}`,
    chatId: 'chat-1',
    role,
    content: 'Message content',
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function mountMessage(message: AiChatMessageItemType) {
  return mount(AiChatMessageItem, {
    props: { message },
    global: {
      stubs: {
        VIcon: { template: '<span class="icon-stub" />' },
        VBtn: { template: '<button class="btn-stub"><slot /></button>' },
        VChip: { template: '<span class="chip-stub"><slot /></span>' },
        MarkdownRenderer: { props: ['content'], template: '<div class="markdown-stub">{{ content }}</div>' },
      },
    },
  })
}

describe('AiChatMessageItem — Thread Pane Message Component', () => {
  enableAutoUnmount(afterEach)

  it('renders message content', () => {
    const wrapper = mountMessage(makeMessage('assistant'))

    expect(wrapper.text()).toContain('Message content')
  })

  it('user message: aligned right with bubble styling', () => {
    const wrapper = mountMessage(makeMessage('user'))

    expect(wrapper.classes()).toContain('ai-chat-message-item--user')
    expect(wrapper.find('.ai-chat-message-item__content').exists()).toBe(true)
  })

  it('assistant message: aligned left with avatar', () => {
    const wrapper = mountMessage(makeMessage('assistant'))

    expect(wrapper.classes()).toContain('ai-chat-message-item--assistant')
    expect(wrapper.find('.ai-chat-message-item__ai-avatar').exists()).toBe(true)
  })

  it('shows user avatar icon for user messages', () => {
    const wrapper = mountMessage(makeMessage('user'))

    expect(wrapper.find('.icon-stub').exists()).toBe(true)
  })

  it('shows attachments when message has them', () => {
    const wrapper = mountMessage(makeMessage('user', {
      attachments: [{ name: 'report.pdf', size: 1024, mimeType: 'application/pdf' }],
    }))

    expect(wrapper.text()).toContain('report.pdf')
    expect(wrapper.find('.ai-chat-message-item__attachments').exists()).toBe(true)
  })

  it('copy button calls copyToClipboard and shows success snackbar', async () => {
    copyMock.mockResolvedValue(true)

    const wrapper = mountMessage(makeMessage('assistant'))
    
    await wrapper.find('.ai-chat-message-item__actions .btn-stub').trigger('click')
    await flushPromises()

    expect(copyMock).toHaveBeenCalledWith('Message content')
    expect(snackbarMock.success).toHaveBeenCalledWith('Message copied to clipboard')
  })

  it('copy failure shows error snackbar', async () => {
    copyMock.mockResolvedValue(false)

    const wrapper = mountMessage(makeMessage('assistant'))
    
    await wrapper.find('.ai-chat-message-item__actions .btn-stub').trigger('click')
    await flushPromises()

    expect(snackbarMock.error).toHaveBeenCalledWith('Unable to copy message')
  })

  it('emits regenerate event when regenerate button clicked', async () => {
    const wrapper = mountMessage(makeMessage('assistant'))
    

    const regenerateButton = wrapper.findAll('.ai-chat-message-item__actions .btn-stub')[1]
    await regenerateButton.trigger('click')

    expect(wrapper.emitted('regenerate')).toBeTruthy()
    expect(wrapper.emitted('regenerate')![0]).toEqual(['m-assistant'])
  })

  it('user messages do not have regenerate button', () => {
    const wrapper = mountMessage(makeMessage('user'))
    

    const actionButtons = wrapper.findAll('.ai-chat-message-item__actions .btn-stub')
    expect(actionButtons).toHaveLength(1)
  })

  it('assistant messages show markdown content via MarkdownRenderer', () => {
    const wrapper = mountMessage(makeMessage('assistant'))

    expect(wrapper.find('.markdown-stub').exists()).toBe(true)
  })

  it('user messages show plain text content', () => {
    const wrapper = mountMessage(makeMessage('user'))


    expect(wrapper.find('.markdown-stub').exists()).toBe(false)
    expect(wrapper.find('.ai-chat-message-item__text').text()).toBe('Message content')
  })
})
