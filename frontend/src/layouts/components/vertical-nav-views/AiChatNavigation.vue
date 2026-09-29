<script setup lang="ts">
import { useSnackbar } from "@/composables/useSnackbar";
import { useAiChatStore } from "@/stores/useAiChatStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { copyToClipboard } from "@/utils/shareUtils";
import { computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { PerfectScrollbar } from "vue3-perfect-scrollbar";
import AiChatListItem from "./AiChatListItem.vue";

const props = defineProps<{
  /** Forward do estado de scroll da sidebar (elevação do header). */
  updateIsVerticalNavScrolled?: (val: boolean) => void;
}>();

const chatStore = useAiChatStore();
const auth = useAuthStore();
const router = useRouter();
const snackbar = useSnackbar();

const chats = computed(() => chatStore.chats);


const handleScroll = (evt: Event) => {
  const el = evt.target as HTMLElement;

  props.updateIsVerticalNavScrolled?.(el.scrollTop > 0);

  if (el.scrollHeight - el.scrollTop - el.clientHeight < 100)
    chatStore.fetchChats();
};


const handleOpen = (chatId: string) => {
  router.push({ name: "c-chatId", params: { chatId } });
};


const handleNewChat = () => {
  router.push({ name: "ai-assistant", query: {} });
};

const handleShare = async (chatId: string) => {
  try {
    const shareUrl = await chatStore.shareChat(chatId);
    const ok = await copyToClipboard(shareUrl);
    if (ok) snackbar.success("Chat link copied to clipboard!");
    else snackbar.error("Could not copy the link. Try again.");
  } catch {
    snackbar.error("Could not generate a share link. Try again.");
  }
};

const handleDelete = async (chatId: string) => {
  try {
    await chatStore.deleteChat(chatId);
  } catch {
    snackbar.error("Could not delete the chat. Try again.");
  }
};

const handleRename = async (chatId: string, newName: string) => {
  try {
    await chatStore.renameChat(chatId, newName);
  } catch {
    snackbar.error("Could not rename the chat. Try again.");
  }
};

onMounted(() => {
  if (chatStore.chats.length === 0) chatStore.fetchChats();
});



watch(
  () => auth.currentTenantId,
  () => {
    chatStore.fetchChats(true);
  },
);
</script>

<template>
  <PerfectScrollbar
    tag="div"
    class="chat-navigation"
    :options="{ wheelPropagation: false }"
    @ps-scroll-y="handleScroll"
  >
    <!-- ℹ️ Ações de navegação (Novo chat) — alinhadas num container. -->
    <div class="chat-navigation__actions">
      <button
        type="button"
        class="chat-navigation__action"
        @click="handleNewChat"
      >
        <VIcon icon="bx-edit" size="14" />
        <span>{{ "New chat" }}</span>
      </button>
    </div>

    <div class="chat-navigation__header">
      <h3>{{ "Chat history" }}</h3>
    </div>

    <div class="chat-navigation__list">
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

    <div v-if="chatStore.isLoading" class="chat-navigation__loading">
      <VProgressCircular indeterminate size="24" />
    </div>
  </PerfectScrollbar>
</template>

<style lang="scss" scoped>
.chat-navigation {
  block-size: 100%;


  padding-block: 0.375rem;
  padding-inline: 0.625rem;


  &__actions {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    margin-block-end: 0.5rem;
  }



  &__action {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    border: none;
    border-radius: 0.375rem;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-family: inherit;
    font-size: 0.85rem;
    font-weight: 500;
    gap: 0.625rem;
    inline-size: 100%;
    line-height: 1.25;
    padding-block: 0.25rem;
    padding-inline: 0.5rem;
    text-align: start;
    transition: background-color 0.2s ease;

    &:hover {
      background: rgb(var(--v-theme-surface-variant), 0.3);
    }
  }

  &__header {
    padding-block: 0.375rem 0.5rem;
    padding-inline: 0.5rem;

    h3 {
      margin: 0;



      color: rgb(var(--v-theme-on-surface));
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      opacity: 0.5;
    }
  }


  &__list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  &__loading {
    display: flex;
    justify-content: center;
    padding: 0.375rem;
  }
}
</style>
