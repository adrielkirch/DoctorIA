<script setup lang="ts">
import { useAiChatMessagesStore } from '@/stores/useAiChatMessagesStore'
import type { AiChatMessageItem } from 'contracts/ai/chat-history/types'
import { nextTick, ref, watch } from 'vue'
import AiChatComposer from './AiChatComposer.vue'
import AiChatMessageLog from './AiChatMessageLog.vue'
import AiChatThreadHeader from './AiChatThreadHeader.vue'

interface AiChatThread {
  id: string
  title: string
  model: string
  messages: AiChatMessageItem[]
  isLoading: boolean
  canSend: boolean
}

const props = defineProps<{
  thread: AiChatThread
}>()

const messagesStore = useAiChatMessagesStore()
const messageLogRef = ref<InstanceType<typeof AiChatMessageLog>>()


watch(() => props.thread.messages.length, async () => {
  await nextTick()
  messageLogRef.value?.scrollToBottom()
})

const handleSendMessage = async (content: string, attachments?: File[]) => {
  const attachmentData = attachments?.map(f => ({
    name: f.name,
    size: f.size,
    mimeType: f.type,
  }))


  await messagesStore.sendMessage(content, attachmentData)
}

const handleRegenerateResponse = (messageId: string) => {

  console.log('Regenerate message:', messageId)
}

const handleStopGeneration = () => {
  messagesStore.stopStreaming()
}

const handleDelegateToHuman = async (agentId: string, message: string) => {

  console.log('Delegating to human agent:', { agentId, message, chatId: props.thread.id })
  



}

const handleSocialShare = (platform: string, url: string) => {
  console.log('Shared to social platform:', { platform, url, chatId: props.thread.id })
}
</script>

<template>
  <div class="ai-chat-thread-pane">
    <!-- Header: avatar + título + ações do thread -->
    <AiChatThreadHeader 
      :thread="thread"
      class="ai-chat-thread-pane__header"
      @regenerate="handleRegenerateResponse"
      @stop="handleStopGeneration"
      @delegate-to-human="handleDelegateToHuman"
      @social-share="handleSocialShare"
    />

    <!-- Log: lista scrollável de mensagens -->
    <AiChatMessageLog
      ref="messageLogRef" 
      :messages="thread.messages"
      :is-loading="thread.isLoading"
      class="ai-chat-thread-pane__log"
      @regenerate="handleRegenerateResponse"
    />

    <!-- Composer: input + attachments + send -->
    <AiChatComposer
      :disabled="!thread.canSend"
      :is-loading="thread.isLoading"
      class="ai-chat-thread-pane__composer"
      @send="handleSendMessage"
      @stop="handleStopGeneration"
    />
  </div>
</template>

<style lang="scss" scoped>
.ai-chat-thread-pane {
  display: flex;
  flex-direction: column;
  block-size: 100%;
  inline-size: 100%;

  &__header {
    flex-shrink: 0;
    border-block-end: 1px solid rgb(var(--v-theme-surface-variant));
  }

  &__log {
    flex: 1;
    min-block-size: 0; // Allow flex shrink
    overflow: hidden;
  }

  &__composer {
    flex-shrink: 0;
    border-block-start: 1px solid rgb(var(--v-theme-surface-variant));
  }
}
</style>
