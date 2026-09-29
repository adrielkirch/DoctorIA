import { $api } from '@/utils/api'
import type {
    AiChatHistoryListResponse,
    AiChatSummary,
    AiRenameChatResponse,
    AiShareChatResponse,
} from 'contracts/ai/chat-history/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const AI_CHAT_PAGE_SIZE = 18

export const useAiChatStore = defineStore('ai-chat-history', () => {
  const chats = ref<AiChatSummary[]>([])
  const currentPage = ref(0)
  const isLoading = ref(false)
  const hasMoreChats = ref(true)

  const totalChats = computed(() => chats.value.length)

  async function fetchChats(reset = false): Promise<AiChatSummary[]> {
    if (isLoading.value)
      return []
    if (!reset && !hasMoreChats.value)
      return []

    isLoading.value = true

    try {
      if (reset) {
        currentPage.value = 0
        chats.value = []
        hasMoreChats.value = true
      }

      const response = await $api<AiChatHistoryListResponse>('/ai/chat-history', {
        query: {
          page: String(currentPage.value),
          limit: String(AI_CHAT_PAGE_SIZE),
        },
      })

      chats.value.push(...response.data)
      currentPage.value++
      hasMoreChats.value = response.hasMore

      return response.data
    }
    catch (error) {
      console.error('[chat] Erro ao buscar histórico:', error)
      throw error
    }
    finally {
      isLoading.value = false
    }
  }

  async function shareChat(chatId: string): Promise<string> {
    const response = await $api<AiShareChatResponse>(`/ai/chat-history/${chatId}/share`, {
      method: 'POST',
    })

    const chat = chats.value.find(c => c.id === chatId)
    if (chat) {
      chat.isShared = true
      chat.shareUrl = response.shareUrl
    }

    return response.shareUrl
  }

  async function deleteChat(chatId: string): Promise<void> {
    await $api(`/ai/chat-history/${chatId}`, { method: 'DELETE' })
    chats.value = chats.value.filter(c => c.id !== chatId)
  }

  async function renameChat(chatId: string, newName: string): Promise<void> {
    const response = await $api<AiRenameChatResponse>(`/ai/chat-history/${chatId}`, {
      method: 'PATCH',
      body: { title: newName },
    })

    const chat = chats.value.find(c => c.id === chatId)
    if (chat)
      chat.title = response.title
  }

  return {
    chats,
    currentPage,
    isLoading,
    hasMoreChats,
    totalChats,
    fetchChats,
    shareChat,
    deleteChat,
    renameChat,
  }
})

export type AiChatStore = ReturnType<typeof useAiChatStore>
