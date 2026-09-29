import { $api } from '@/utils/api'
import type { AiChatMessageItem } from 'contracts/ai/chat-history/types'
import { AI_MODELS, DEFAULT_MODEL_ID } from 'contracts/ai/models/types'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAiChatMessagesStore } from './useAiChatMessagesStore'

vi.mock('@/utils/api', () => ({
  $api: vi.fn(),
}))

const mockApi = vi.mocked($api)

function makeMessages(chatId: string, count = 4): AiChatMessageItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${chatId}-m${index}`,
    chatId,
    role: index % 2 === 0 ? 'user' : 'assistant',
    content: `Mensagem ${index}`,
    createdAt: new Date().toISOString(),
  }))
}

describe('useAiChatMessagesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockApi.mockReset()
  })

  it('fetchMessages carrega a conversa e define o chatId ativo', async () => {
    mockApi.mockResolvedValue({ data: makeMessages('chat-1'), total: 4, page: 0, limit: 4, hasMore: false })

    const store = useAiChatMessagesStore()

    await store.fetchMessages('chat-1')

    expect(store.messages).toHaveLength(4)
    expect(store.chatId).toBe('chat-1')
    expect(store.lastMessage?.role).toBe('assistant')
    expect(mockApi).toHaveBeenCalledWith('/ai/chat-history/chat-1/messages')
  })

  it('sendMessage em chat existente anexa user + placeholder e "digita" a resposta', async () => {
    const reply = { id: 'chat-1-m10', chatId: 'chat-1', role: 'assistant', content: 'Olá!', createdAt: new Date().toISOString() }

    mockApi.mockResolvedValue({
      message: { id: 'chat-1-m9', chatId: 'chat-1', role: 'user', content: 'oi', createdAt: new Date().toISOString() },
      reply,
    })

    vi.useFakeTimers()

    const store = useAiChatMessagesStore()

    store.chatId = 'chat-1'
    store.messages = makeMessages('chat-1')

    const returned = await store.sendMessage('oi')

    expect(returned).toBe('chat-1')
    expect(store.messages).toHaveLength(6)
    expect(store.messages.at(-1)?.role).toBe('assistant')


    expect(store.messages.at(-1)?.content).toBe('')
    expect(store.messages.at(-1)?.isStreaming).toBe(true)
    expect(store.isStreaming).toBe(true)

    await vi.advanceTimersByTimeAsync(1000)

    expect(store.messages.at(-1)?.content).toBe('Olá!')
    expect(store.messages.at(-1)?.isStreaming).toBe(false)
    expect(store.isStreaming).toBe(false)
    expect(store.streamingMessageId).toBeNull()
    expect(mockApi).toHaveBeenCalledWith('/ai/chat-history/chat-1/messages', { method: 'POST', body: { content: 'oi' } })

    vi.useRealTimers()
  })

  it('stopStreaming interrompe a geração e mantém o conteúdo parcial', async () => {
    const longContent = 'Resposta bem longa que seria digitada aos poucos pelo streaming fake, com várias palavras e conteúdo suficiente para que o teste de interrupção capture um estado parcial da geração antes do fim.'
    const reply = { id: 'chat-1-m10', chatId: 'chat-1', role: 'assistant', content: longContent, createdAt: new Date().toISOString() }

    mockApi.mockResolvedValue({
      message: { id: 'chat-1-m9', chatId: 'chat-1', role: 'user', content: 'oi', createdAt: new Date().toISOString() },
      reply,
    })

    vi.useFakeTimers()

    const store = useAiChatMessagesStore()

    store.chatId = 'chat-1'
    store.messages = makeMessages('chat-1')

    await store.sendMessage('oi')
    await vi.advanceTimersByTimeAsync(100)

    store.stopStreaming()

    expect(store.isStreaming).toBe(false)
    expect(store.streamingMessageId).toBeNull()
    expect(store.messages.at(-1)?.isStreaming).toBe(false)


    expect(store.messages.at(-1)?.content.length).toBeGreaterThan(0)
    expect(store.messages.at(-1)?.content.length).toBeLessThan(reply.content.length)

    vi.useRealTimers()
  })

  it('sendMessage sem chatId cria o chat via POST /ai/chat-history e define o chatId', async () => {
    const reply = { id: 'chat-n-m2', chatId: 'chat-n', role: 'assistant', content: 'Resposta', createdAt: new Date().toISOString() }
    const message = { id: 'chat-n-m1', chatId: 'chat-n', role: 'user', content: 'primeira msg', createdAt: new Date().toISOString() }

    mockApi.mockResolvedValue({
      chat: { id: 'chat-n', tenantId: 'workspace-alpha', title: 'primeira msg', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messageCount: 2, isShared: false },
      message,
      reply,
    })

    const store = useAiChatMessagesStore()
    const chatId = await store.sendMessage('primeira msg', [{ name: 'a.txt', size: 10, mimeType: 'text/plain' }])

    expect(chatId).toBe('chat-n')
    expect(store.chatId).toBe('chat-n')
    expect(store.messages).toHaveLength(2)
    expect(store.messages[0]).toEqual(message)


    expect(store.messages[1]).toEqual({ ...reply, content: '', isStreaming: true })
    expect(mockApi).toHaveBeenCalledWith('/ai/chat-history', {
      method: 'POST',
      body: { content: 'primeira msg', attachments: [{ name: 'a.txt', size: 10, mimeType: 'text/plain' }] },
    })
  })

  it('setSelectedModel troca o modelo e reset limpa o estado', async () => {
    const store = useAiChatMessagesStore()

    expect(store.selectedModel).toBe(DEFAULT_MODEL_ID)
    expect(AI_MODELS).toHaveLength(16)

    store.setSelectedModel('deepseek-v3')
    expect(store.selectedModel).toBe('deepseek-v3')

    store.chatId = 'chat-1'
    store.messages = makeMessages('chat-1')
    store.isLoading = true
    store.isSending = true

    store.reset()

    expect(store.chatId).toBeNull()
    expect(store.messages).toHaveLength(0)
    expect(store.isLoading).toBe(false)
    expect(store.isSending).toBe(false)
  })
})
