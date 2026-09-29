import { $api } from '@/utils/api'
import type { AiChatSummary } from 'contracts/ai/chat-history/types'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AI_CHAT_PAGE_SIZE, useAiChatStore } from './useAiChatStore'

vi.mock('@/utils/api', () => ({
  $api: vi.fn(),
}))

const mockApi = vi.mocked($api)

function makeChats(count: number, startId = 0): AiChatSummary[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `chat-${startId + index}`,
    tenantId: 'workspace-alpha',
    title: `Chat ${startId + index}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messageCount: 5,
    isShared: false,
  }))
}

describe('useAiChatStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockApi.mockReset()
  })

  it('fetchChats acumula páginas, avança currentPage e respeita hasMore', async () => {
    mockApi.mockResolvedValue({ data: makeChats(AI_CHAT_PAGE_SIZE), total: 40, page: 0, limit: AI_CHAT_PAGE_SIZE, hasMore: true })

    const store = useAiChatStore()
    const first = await store.fetchChats()

    expect(first).toHaveLength(AI_CHAT_PAGE_SIZE)
    expect(store.chats).toHaveLength(AI_CHAT_PAGE_SIZE)
    expect(store.hasMoreChats).toBe(true)
    expect(mockApi).toHaveBeenCalledWith('/ai/chat-history', { query: { page: '0', limit: String(AI_CHAT_PAGE_SIZE) } })

    mockApi.mockResolvedValue({ data: makeChats(4, AI_CHAT_PAGE_SIZE), total: 40, page: 1, limit: AI_CHAT_PAGE_SIZE, hasMore: false })
    await store.fetchChats()

    expect(store.chats).toHaveLength(AI_CHAT_PAGE_SIZE + 4)
    expect(store.hasMoreChats).toBe(false)
    expect(mockApi).toHaveBeenLastCalledWith('/ai/chat-history', { query: { page: '1', limit: String(AI_CHAT_PAGE_SIZE) } })
  })

  it('fetchChats(reset=true) zera e recarrega do zero', async () => {
    mockApi.mockResolvedValue({ data: makeChats(AI_CHAT_PAGE_SIZE), total: 18, page: 0, limit: AI_CHAT_PAGE_SIZE, hasMore: false })

    const store = useAiChatStore()

    await store.fetchChats()

    mockApi.mockResolvedValue({ data: makeChats(2), total: 2, page: 0, limit: AI_CHAT_PAGE_SIZE, hasMore: false })
    await store.fetchChats(true)

    expect(store.chats).toHaveLength(2)
    expect(store.currentPage).toBe(1)
    expect(store.hasMoreChats).toBe(false)
    expect(mockApi).toHaveBeenLastCalledWith('/ai/chat-history', { query: { page: '0', limit: String(AI_CHAT_PAGE_SIZE) } })
  })

  it('bloqueia fetch quando não há mais páginas', async () => {
    mockApi.mockResolvedValue({ data: makeChats(AI_CHAT_PAGE_SIZE), total: 40, page: 0, limit: AI_CHAT_PAGE_SIZE, hasMore: true })

    const store = useAiChatStore()

    await store.fetchChats()

    mockApi.mockResolvedValue({ data: [], total: 40, page: 1, limit: AI_CHAT_PAGE_SIZE, hasMore: false })
    await store.fetchChats()

    expect(store.hasMoreChats).toBe(false)

    const calls = mockApi.mock.calls.length

    await store.fetchChats()

    expect(mockApi.mock.calls.length).toBe(calls)
  })

  it('ignora chamadas concorrentes enquanto carrega (guard isLoading)', async () => {
    let resolveFirst!: (value: unknown) => void
    mockApi.mockImplementationOnce(() => new Promise(resolve => {
      resolveFirst = resolve
    }))

    const store = useAiChatStore()
    const p1 = store.fetchChats()
    const p2 = store.fetchChats()

    expect(await p2).toEqual([])
    resolveFirst({ data: makeChats(2), total: 2, page: 0, limit: AI_CHAT_PAGE_SIZE, hasMore: false })
    await p1

    expect(mockApi).toHaveBeenCalledTimes(1)
  })

  it('shareChat retorna shareUrl e marca isShared no estado local', async () => {
    const store = useAiChatStore()

    store.chats = makeChats(1)

    const target = store.chats[0]

    mockApi.mockResolvedValue({ shareUrl: `https://app.example.com/share/${target.id}` })

    const url = await store.shareChat(target.id)

    expect(url).toBe(`https://app.example.com/share/${target.id}`)
    expect(store.chats[0].isShared).toBe(true)
    expect(store.chats[0].shareUrl).toBe(url)
    expect(mockApi).toHaveBeenCalledWith(`/ai/chat-history/${target.id}/share`, { method: 'POST' })
  })

  it('deleteChat remove do estado local após sucesso da API', async () => {
    const store = useAiChatStore()

    store.chats = makeChats(2)

    const target = store.chats[0]

    mockApi.mockResolvedValue(undefined)

    await store.deleteChat(target.id)

    expect(store.chats).toHaveLength(1)
    expect(store.chats[0].id).not.toBe(target.id)
    expect(mockApi).toHaveBeenCalledWith(`/ai/chat-history/${target.id}`, { method: 'DELETE' })
  })

  it('renameChat atualiza o título local com o retorno da API', async () => {
    const store = useAiChatStore()

    store.chats = makeChats(1)

    const target = store.chats[0]

    mockApi.mockResolvedValue({ title: 'Novo nome' })

    await store.renameChat(target.id, 'Novo nome')

    expect(store.chats[0].title).toBe('Novo nome')
    expect(mockApi).toHaveBeenCalledWith(`/ai/chat-history/${target.id}`, { method: 'PATCH', body: { title: 'Novo nome' } })
  })
})
