<script setup lang="ts">
import { useAiChatMessagesStore } from '@/stores/useAiChatMessagesStore'
import { useAuthStore } from '@/stores/useAuthStore'
import type { AiChatMessageItem } from 'contracts/ai/chat-history/types'
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import AiChatThreadPane from './AiChatThreadPane.vue'
import AiChatWelcome from './AiChatWelcome.vue'


interface AiChatThread {
  id: string
  title: string
  model: string
  messages: AiChatMessageItem[]
  isLoading: boolean
  canSend: boolean
}

const route = useRoute()
const chatStore = useAiChatMessagesStore()
const auth = useAuthStore()


const activeChatId = computed(() => 
  Array.isArray(route.query.chat) 
    ? route.query.chat[0] 
    : route.query.chat || null
)


const activeThread = computed((): AiChatThread | null => {
  if (!chatStore.chatId || !activeChatId.value) {
    return null
  }

  return {
    id: chatStore.chatId,
    title: `Chat ${chatStore.chatId.slice(0, 8)}`, // Título simplificado
    model: chatStore.selectedModel || 'gpt-4-turbo',
    messages: chatStore.messages,
    isLoading: chatStore.isSending || chatStore.isStreaming,
    canSend: !chatStore.isSending && !chatStore.isLoading
  }
})


watch(activeChatId, (chatId) => {
  if (chatId && chatId !== chatStore.chatId) {
    void chatStore.fetchMessages(chatId)
  } else if (!chatId) {
    chatStore.reset()
  }
}, { immediate: true })

const handleStartChat = async (message: string) => {

  const chatId = await chatStore.sendMessage(message)
  

  window.history.replaceState(null, '', `?chat=${chatId}`)
}
</script>

<template>
  <div class="ai-chat-thread-pane-demo">
    <!-- Thread Pane: conversa ativa -->
    <AiChatThreadPane 
      v-if="activeThread"
      :thread="activeThread"
    />
    
    <!-- Welcome: novo chat ou sem seleção -->
    <AiChatWelcome 
      v-else
      @start-chat="handleStartChat"
    />
  </div>
</template>

<style lang="scss" scoped>
.ai-chat-thread-pane-demo {
  display: flex;
  flex-direction: column;
  block-size: 100vh;
  inline-size: 100%;
  background: rgb(var(--v-theme-background));
}
</style>
