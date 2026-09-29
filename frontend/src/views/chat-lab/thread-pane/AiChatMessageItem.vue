<script setup lang="ts">
import { useSnackbar } from "@/composables/useSnackbar";
import { copyToClipboard } from "@/utils/shareUtils";
import MarkdownRenderer from "@/views/ai/assistant/MarkdownRenderer.vue";
import type { AiChatMessageItem } from "contracts/ai/chat-history/types";
import { computed } from "vue";

const props = defineProps<{
  message: AiChatMessageItem;
}>();

const emit = defineEmits<{
  regenerate: [messageId: string];
}>();

const snackbar = useSnackbar();

const isUser = computed(() => props.message.role === "user");
const isAssistant = computed(() => props.message.role === "assistant");

const handleCopy = async () => {
  const success = await copyToClipboard(props.message.content);
  if (success) snackbar.success('Message copied to clipboard');
  else snackbar.error('Unable to copy message');
};

const handleRegenerate = () => {
  emit("regenerate", props.message.id);
};
</script>

<template>
  <div class="ai-chat-message-item" :class="{
    'ai-chat-message-item--user': isUser,
    'ai-chat-message-item--assistant': isAssistant,
  }">
    <!-- Avatar -->
    <div class="ai-chat-message-item__avatar">
      <VIcon v-if="isUser" icon="bx-user" size="18" />
      <span v-else class="ai-chat-message-item__ai-avatar"> 🤖 </span>
    </div>

    <!-- Content -->
    <div class="ai-chat-message-item__content">
      <!-- Message text -->
      <div class="ai-chat-message-item__text">
        <template v-if="isUser">
          {{ message.content }}
        </template>
        <MarkdownRenderer v-else :content="message.content" :streaming="message.isStreaming || false" />
      </div>

      <!-- Attachments (se houver) -->
      <div v-if="message.attachments?.length" class="ai-chat-message-item__attachments">
        <VChip v-for="attachment in message.attachments" :key="attachment.name" size="small" variant="outlined">
          <VIcon icon="bx-paperclip" start />
          {{ attachment.name }}
        </VChip>
      </div>

      <!-- Actions (hover) -->
      <div class="ai-chat-message-item__actions">
        <VBtn variant="text" size="x-small" icon="bx-copy" @click="handleCopy" />

        <VBtn v-if="isAssistant" variant="text" size="x-small" icon="bx-refresh" @click="handleRegenerate" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ai-chat-message-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;

  &__avatar {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgb(var(--v-theme-surface-variant), 0.5);
    block-size: 2rem;
    inline-size: 2rem;
  }

  &__ai-avatar {
    font-size: 1rem;
    line-height: 1;
  }

  &__content {
    position: relative;
    flex: 1;
    min-inline-size: 0;
  }

  &__text {
    font-size: 0.875rem;
    line-height: 1.5;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  &__attachments {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-block-start: 0.75rem;
  }

  &__actions {
    position: absolute;
    display: flex;
    padding: 0.25rem;
    border: 1px solid rgb(var(--v-theme-surface-variant));
    border-radius: 0.5rem;
    background: rgb(var(--v-theme-surface));
    gap: 0.25rem;
    inset-block-start: 0;
    inset-inline-end: 0;
    opacity: 0;
    transform: translateY(-100%);
    transition: opacity 0.2s ease;
  }

  &:hover &__actions {
    opacity: 1;
  }


  &--user {
    flex-direction: row-reverse;

    .ai-chat-message-item__content {
      border-radius: 1rem 0.25rem 1rem 1rem;
      background: rgb(var(--v-theme-primary), 0.1);
      padding-block: 0.75rem;
      padding-inline: 1rem;
    }

    .ai-chat-message-item__actions {
      inset-inline: 0 auto;
    }
  }


  &--assistant .ai-chat-message-item__content {
    border-radius: 0.25rem 1rem 1rem;
    background: rgb(var(--v-theme-surface-variant), 0.3);
    padding-block: 0.75rem;
    padding-inline: 1rem;
  }
}
</style>
