<script setup lang="ts">
import { useSnackbar } from '@/composables/useSnackbar'
import { useAiChatMessagesStore } from '@/stores/useAiChatMessagesStore'
import { useAuthStore } from '@/stores/useAuthStore'
import type { AiChatMessageAttachment } from 'contracts/ai/chat-history/types'
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CapabilitiesPanel from './CapabilitiesPanel.vue'
import ChatInput from './ChatInput.vue'
import ChatMessage from './ChatMessage.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const store = useAiChatMessagesStore()
const snackbar = useSnackbar()

const MAX_ATTACHMENTS = 5

const selectedFiles = ref<File[]>([])
const showCapabilities = ref(false)

const CAPABILITY_NAMES: Record<string, string> = {
  knowledge: 'Knowledge',
  mcp: 'MCP',
  gateway: 'API Gateway',
}

function handleCapabilitySelect(type: string) {
  showCapabilities.value = false

  const name = CAPABILITY_NAMES[type]
  if (name)
    snackbar.info(`Selected resource: ${name}`)
}



const activeChatId = computed(() => {
  const param = route.params.chatId
  const query = route.query.chat
  const fromParam = typeof param === 'string' && param.length > 0 ? param : null
  const fromQuery = typeof query === 'string' && query.length > 0 ? query : null

  return fromParam ?? fromQuery
})

const customerName = computed(() => auth.user?.fullName?.trim() || "guest")
const isNewChat = computed(() => store.messages.length === 0)



function scrollToConversationEnd() {
  window.scrollTo?.({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
}

watch(activeChatId, async chatId => {
  if (chatId) {


    if (store.chatId === chatId)
      return

    try {
      await store.fetchMessages(chatId)
    }
    catch {
      store.reset()
      snackbar.error("Could not load the conversation. Try again.")
    }
  }
  else {
    store.reset()
  }



  await nextTick()
  scrollToConversationEnd()
}, { immediate: true })



watch(() => store.chatId, chatId => {
  if (chatId && activeChatId.value !== chatId)
    router.replace({ name: 'c-chatId', params: { chatId } })
})


watch(() => store.messages.length, async () => {
  await nextTick()
  scrollToConversationEnd()
})



watch(() => store.lastMessage?.content, async () => {
  if (!store.isStreaming)
    return

  await nextTick()
  scrollToConversationEnd()
})

async function handleSend(content: string) {
  if (store.isSending)
    return

  const attachments: AiChatMessageAttachment[] = selectedFiles.value.map(file => ({
    name: file.name,
    size: file.size,
    mimeType: file.type,
  }))

  selectedFiles.value = []

  try {
    await store.sendMessage(content, attachments.length > 0 ? attachments : undefined)
  }
  catch {
    snackbar.error("Could not send the message. Try again.")
  }
}

function handleFileSelect(files: File[]) {
  const remaining = MAX_ATTACHMENTS - selectedFiles.value.length

  if (remaining <= 0) {
    snackbar.warning("Up to 5 files per message.")

    return
  }

  selectedFiles.value.push(...files.slice(0, remaining))

  if (files.length > remaining)
    snackbar.warning("Up to 5 files per message.")
}

function removeFile(index: number) {
  selectedFiles.value.splice(index, 1)
}

function formatFileSize(bytes: number): string {
  if (bytes === 0)
    return '0 B'

  const k = 1024
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1)

  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${units[i]}`
}
</script>

<template>
  <div class="chat-interface">
    <!-- Corpo: boas-vindas (chat novo) ou mensagens. NÃO rola — a página rola -->
    <!-- (scroll único, ChatGPT) e o composer abaixo fica pinado via sticky. -->
    <main class="chat-interface__body">
      <div v-if="isNewChat" class="chat-interface__welcome">
        <div class="chat-interface__welcome-icon">
          <VIcon icon="bx-bot" size="36" />
        </div>
        <h1 class="text-subtitle-1 font-weight-medium mb-1 text-center">
          {{ ("Hi " + String(customerName) + ", what's on your mind?") }}
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0 text-center">
          {{ "I'm here to help you with any question or task. How can I be useful?" }}
        </p>
      </div>

      <div v-else class="chat-interface__messages">
        <ChatMessage v-for="message in store.messages" :key="message.id" :message="message"
          :is-streaming="store.isStreaming && message.id === store.streamingMessageId" />
      </div>
    </main>

    <!-- Composer no rodapé: input FLUTUANTE, o mais baixo possível (ChatGPT) -->
    <footer class="chat-interface__composer">
      <CapabilitiesPanel v-if="showCapabilities" @close="showCapabilities = false"
        @select-capability="handleCapabilitySelect" />

      <div v-if="selectedFiles.length > 0" class="chat-interface__files">
        <div v-for="(file, index) in selectedFiles" :key="`${file.name}-${index}`" class="chat-interface__file">
          <VIcon icon="bx-paperclip" size="13" />
          <span class="chat-interface__file-name">{{ file.name }}</span>
          <span class="text-medium-emphasis">{{ formatFileSize(file.size) }}</span>
          <button class="chat-interface__file-remove" type="button" aria-label="Remove file" @click="removeFile(index)">
            <VIcon icon="bx-x" size="14" />
          </button>
        </div>
      </div>

      <ChatInput :disabled="store.isSending" :streaming="store.isStreaming" @send="handleSend"
        @stop="store.stopStreaming" @file-select="handleFileSelect"
        @toggle-capabilities="showCapabilities = !showCapabilities" />
    </footer>
  </div>
</template>

<style lang="scss" scoped>
.chat-interface {
  display: flex;
  flex-direction: column;




  min-height: 100dvh;
  color: rgb(var(--v-theme-on-surface));

  &__body {
    flex: 1;

    padding-inline: 0.875rem;
  }

  &__welcome {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: center;
    justify-content: center;
    block-size: 100%;
    padding: 2rem;
  }

  &__welcome-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    inline-size: 56px;
    block-size: 56px;
    margin-block-end: 0.625rem;
    border-radius: 0.875rem;
    background-color: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
  }

  &__messages {
    max-inline-size: 880px;
    margin-inline: auto;
    padding-block: 0.25rem 1rem;
  }

  &__composer {
    flex-shrink: 0;


    position: sticky;
    inset-block-end: 0;

    padding-block-end: 0.25rem;
    background:
      linear-gradient(180deg, transparent 0%, rgb(var(--v-theme-background)) 18%),
      rgb(var(--v-theme-background));
  }

  &__files {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
    max-inline-size: 880px;
    margin-inline: auto;
    margin-block-end: 0.375rem;
  }

  &__file {
    display: flex;
    gap: 0.375rem;
    align-items: center;
    max-inline-size: 260px;
    padding: 0.25rem 0.5625rem;
    border: 1px solid rgb(var(--v-border-color));
    border-radius: 999px;
    background-color: rgb(var(--v-theme-surface));
  }

  &__file-name {
    overflow: hidden;
    font-size: 0.85rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__file-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: none;
    background: transparent;
    color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
    cursor: pointer;

    &:hover {
      color: rgb(var(--v-theme-error));
    }
  }
}
</style>
