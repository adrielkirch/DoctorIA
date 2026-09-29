import { $api } from '@/utils/api'
import type {
  AiChatMessageAttachment,
  AiChatMessageItem,
  AiChatMessagesListResponse,
  AiCreateChatResponse,
  AiSendMessageResponse,
} from 'contracts/ai/chat-history/types'
import { DEFAULT_MODEL_ID } from 'contracts/ai/models/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const STREAM_CHUNK = 24
const STREAM_DELAY = 24
const STREAM_START_DELAY = 60

export const useAiChatMessagesStore = defineStore('ai-chat-messages', () => {
  const messages = ref<AiChatMessageItem[]>([])
  const chatId = ref<string | null>(null)
  const isLoading = ref(false)
  const isSending = ref(false)
  const selectedModel = ref<string>(DEFAULT_MODEL_ID)
  const isStreaming = ref(false)
  const streamingMessageId = ref<string | null>(null)

  let streamTimer: ReturnType<typeof setTimeout> | null = null
  let streamStopped = false

  const lastMessage = computed(() => messages.value.at(-1))

  /**
   * Fase 3 — "digita" o conteúdo de uma resposta em pedaços (streaming fake).
   * A mutação do objeto da mensagem é reativa (`ref([])` reativa em profundidade).
   */
  function streamAssistantReply(messageId: string, fullContent: string): void {
    const message = messages.value.find(m => m.id === messageId)
    if (!message)
      return

    isStreaming.value = true
    streamingMessageId.value = messageId
    streamStopped = false

    let offset = 0

    const finish = (): void => {
      message.content = fullContent
      message.isStreaming = false
      isStreaming.value = false
      streamingMessageId.value = null
      streamTimer = null
    }

    const tick = (): void => {
      if (streamStopped)
        return

      message.content += fullContent.slice(offset, offset + STREAM_CHUNK)
      offset += STREAM_CHUNK

      if (offset >= fullContent.length) {
        finish()

        return
      }

      streamTimer = setTimeout(tick, STREAM_DELAY)
    }

    streamTimer = setTimeout(tick, STREAM_START_DELAY)
  }

  /** Para a geração: mantém o conteúdo parcial já digitado (como no ChatGPT). */
  function stopStreaming(): void {
    streamStopped = true
    if (streamTimer) {
      clearTimeout(streamTimer)
      streamTimer = null
    }

    const active = streamingMessageId.value
      ? messages.value.find(m => m.id === streamingMessageId.value)
      : null

    if (active)
      active.isStreaming = false

    isStreaming.value = false
    streamingMessageId.value = null
  }

  async function fetchMessages(targetChatId: string): Promise<void> {
    isLoading.value = true

    try {
      const response = await $api<AiChatMessagesListResponse>(`/ai/chat-history/${targetChatId}/messages`)

      messages.value = response.data
      chatId.value = targetChatId
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Envia uma mensagem: em chat existente anexa user+reply; sem chatId ativo
   * (novo chat) cria o chat via POST /ai/chat-history. A resposta aparece como
   * placeholder vazio e é "digitada" pelo streaming fake. Retorna o id do chat.
   */
  async function sendMessage(content: string, attachments?: AiChatMessageAttachment[]): Promise<string> {
    isSending.value = true

    try {
      if (!chatId.value) {
        const created = await $api<AiCreateChatResponse>('/ai/chat-history', {
          method: 'POST',
          body: { content, attachments },
        })

        chatId.value = created.chat.id

        const placeholder: AiChatMessageItem = { ...created.reply, content: '', isStreaming: true }

        messages.value = [created.message, placeholder]

        streamAssistantReply(placeholder.id, created.reply.content)

        return created.chat.id
      }

      const response = await $api<AiSendMessageResponse>(`/ai/chat-history/${chatId.value}/messages`, {
        method: 'POST',
        body: { content, attachments },
      })

      const placeholder: AiChatMessageItem = { ...response.reply, content: '', isStreaming: true }

      messages.value.push(response.message, placeholder)

      streamAssistantReply(placeholder.id, response.reply.content)

      return chatId.value
    }
    finally {
      isSending.value = false
    }
  }

  function setSelectedModel(modelId: string): void {
    selectedModel.value = modelId
  }

  function reset(): void {
    stopStreaming()
    messages.value = []
    chatId.value = null
    isLoading.value = false
    isSending.value = false
    isStreaming.value = false
    streamingMessageId.value = null
  }

  return {
    messages,
    chatId,
    isLoading,
    isSending,
    selectedModel,
    isStreaming,
    streamingMessageId,
    lastMessage,
    fetchMessages,
    sendMessage,
    setSelectedModel,
    stopStreaming,
    reset,
  }
})

export type AiChatMessagesStore = ReturnType<typeof useAiChatMessagesStore>
