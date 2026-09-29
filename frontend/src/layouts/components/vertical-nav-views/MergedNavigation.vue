<script setup lang="ts">
import { useSnackbar } from '@/composables/useSnackbar'
import { useAiChatStore } from '@/stores/useAiChatStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { copyToClipboard } from '@/utils/shareUtils'
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'
import AiChatListItem from './AiChatListItem.vue'

const props = defineProps<{
  /** Forward do estado de scroll da sidebar (elevação do header). */
  updateIsVerticalNavScrolled?: (val: boolean) => void
}>()

const chatStore = useAiChatStore()
const auth = useAuthStore()
const router = useRouter()
const snackbar = useSnackbar()

const chats = computed(() => chatStore.chats)


const handleScroll = (evt: Event) => {
  const el = evt.target as HTMLElement

  props.updateIsVerticalNavScrolled?.(el.scrollTop > 0)

  if (el.scrollHeight - el.scrollTop - el.clientHeight < 100)
    chatStore.fetchChats()
}


const handleOpen = (chatId: string) => {
  router.push({ name: 'c-chatId', params: { chatId } })
}


const handleNewChat = () => {
  router.push({ name: 'ai-assistant', query: {} })
}

const handleShare = async (chatId: string) => {
  try {
    const shareUrl = await chatStore.shareChat(chatId)
    const ok = await copyToClipboard(shareUrl)
    if (ok)
      snackbar.success("Chat link copied to clipboard!")
    else
      snackbar.error("Could not copy the link. Try again.")
  }
  catch {
    snackbar.error("Could not generate a share link. Try again.")
  }
}

const handleDelete = async (chatId: string) => {
  try {
    await chatStore.deleteChat(chatId)
  }
  catch {
    snackbar.error("Could not delete the chat. Try again.")
  }
}

const handleRename = async (chatId: string, newName: string) => {
  try {
    await chatStore.renameChat(chatId, newName)
  }
  catch {
    snackbar.error("Could not rename the chat. Try again.")
  }
}

onMounted(() => {
  if (chatStore.chats.length === 0)
    chatStore.fetchChats()
})



watch(() => auth.currentTenantId, () => {
  chatStore.fetchChats(true)
})
</script>

<template>
  <PerfectScrollbar
    tag="div"
    class="merged-navigation"
    :options="{ wheelPropagation: false }"
    @ps-scroll-y="handleScroll"
  >
    <nav class="merged-navigation__links">
      <button
        type="button"
        class="merged-navigation__link"
        title="Start new chat"
        @click="handleNewChat"
      >
        <VIcon icon="bx-edit" size="14" />
        <span>{{ "New chat" }}</span>
      </button>

      <RouterLink
        :to="{ name: 'tenants' }"
        class="merged-navigation__link"
        active-class="merged-navigation__link--active"
        title="Home"
      >
        <VIcon icon="bx-home" size="14" />
        <span>{{ "Home" }}</span>
      </RouterLink>

      <RouterLink
        :to="{ name: 'ai-assistant' }"
        class="merged-navigation__link"
        active-class="merged-navigation__link--active"
        title="AI Assistant"
      >
        <VIcon icon="bx-message-dots" size="14" />
        <span>Assistant</span>
      </RouterLink>

      <RouterLink
        :to="{ name: 'ai-skills' }"
        class="merged-navigation__link"
        active-class="merged-navigation__link--active"
        title="Skills"
      >
        <VIcon icon="bx-code-alt" size="14" />
        <span>Skills</span>
      </RouterLink>

      <RouterLink
        :to="{ name: 'ai-knowledge' }"
        class="merged-navigation__link"
        active-class="merged-navigation__link--active"
        title="Knowledge Base"
      >
        <VIcon icon="bx-book-content" size="14" />
        <span>Knowledge</span>
      </RouterLink>

      <RouterLink
        :to="{ name: 'security-credentials' }"
        class="merged-navigation__link"
        active-class="merged-navigation__link--active"
        title="Credentials"
      >
        <VIcon icon="bx-key" size="14" />
        <span>Credentials</span>
      </RouterLink>
    </nav>

    <div class="chat-history">
      <h3 class="chat-history__title">
        {{ "Chat history" }}
      </h3>

      <div class="chat-list">
        <AiChatListItem
          v-for="chat in chats"
          :key="chat.id"
          :chat="chat"
          @open="handleOpen"
          @share="handleShare"
          @delete="handleDelete"
          @rename="handleRename"
        />
      </div>

      <div
        v-if="chatStore.isLoading"
        class="chat-loading"
      >
        <VProgressCircular
          indeterminate
          size="16"
          width="2"
          color="primary"
        />
      </div>
    </div>
  </PerfectScrollbar>
</template>

<style scoped lang="scss">
.merged-navigation {
  display: flex;
  overflow: hidden;
  flex-direction: column;
  block-size: 100%;
  padding-block: 0.375rem;
  padding-inline: 0.625rem;
}

.merged-navigation__links {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: 0.125rem;
  margin-block-end: 0.5rem;
}

.merged-navigation__link {
  display: flex;
  align-items: center;
  border: 0;
  border-radius: 0.375rem;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 500;
  gap: 0.625rem;
  line-height: 1.25;
  min-block-size: 1.75rem;
  padding-block: 0.25rem;
  padding-inline: 0.5rem;
  text-align: start;
  text-decoration: none;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: rgba(var(--v-theme-on-surface), 0.06);
  }

  &--active {
    background-color: rgba(var(--v-theme-on-surface), 0.08);
  }

  :deep(.v-icon) {
    flex-shrink: 0;
  }

  span {
    overflow: hidden;
    flex: 1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.chat-history {
  display: flex;
  overflow: hidden;
  flex: 1;
  flex-direction: column;
  min-block-size: 0;

  &__title {
    margin: 0;
    color: rgb(var(--v-theme-on-surface));
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    opacity: 0.5;
    padding-block: 0.375rem 0.5rem;
    padding-inline: 0.5rem;
  }
}

.chat-list {
  display: flex;
  overflow: hidden auto;
  flex: 1;
  flex-direction: column;
  padding: 0;
}

.chat-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  opacity: 0.6;
}
</style>
