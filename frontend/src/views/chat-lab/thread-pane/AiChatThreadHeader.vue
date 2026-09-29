<script setup lang="ts">
import type { AiChatMessageItem } from "contracts/ai/chat-history/types";
import { computed } from "vue";
import AiChatHumanFallback from "./AiChatHumanFallback.vue";
import AiChatSocialShare from "./AiChatSocialShare.vue";

interface AiChatThread {
  id: string;
  title: string;
  model: string;
  messages: AiChatMessageItem[];
  isLoading: boolean;
  canSend: boolean;
}

const props = defineProps<{
  thread: AiChatThread;
}>();

const emit = defineEmits<{
  regenerate: [messageId: string];
  stop: [];
  delegateToHuman: [agentId: string, message: string];
  socialShare: [platform: string, url: string];
}>();



const modelAvatar = computed(() => {
  const model = props.thread.model.toLowerCase();

  if (model.includes("gpt") || model.includes("openai")) return "🤖";
  if (model.includes("claude")) return "🧠";
  if (model.includes("gemini")) return "💎";
  if (model.includes("deepseek")) return "🔮";
  if (model.includes("kimi")) return "🌙";

  return "🤖"; // Default
});

const modelDisplayName = computed(() => {
  return (
    props.thread.model
      .replace(/^(gpt|claude|gemini|deepseek|kimi)-?/i, "")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase()) || props.thread.model
  );
});

const handleStopGeneration = () => {
  emit("stop");
};

const handleDelegateToHuman = (agentId: string, message: string) => {
  emit("delegateToHuman", agentId, message);
};

const handleSocialShare = (platform: string, url: string) => {
  emit("socialShare", platform, url);
};
</script>

<template>
  <header class="ai-chat-thread-header">
    <div class="ai-chat-thread-header__identity">
      <!-- Avatar do modelo AI -->
      <div class="ai-chat-thread-header__avatar">
        {{ modelAvatar }}
      </div>

      <div class="ai-chat-thread-header__info">
        <!-- Nome do modelo -->
        <h1 class="ai-chat-thread-header__title">
          {{ modelDisplayName }}
        </h1>

        <!-- Subtítulo: nome do thread -->
        <p class="ai-chat-thread-header__subtitle">
          {{ thread.title }}
        </p>
      </div>
    </div>

    <div class="ai-chat-thread-header__actions">
      <!-- Stop generation durante streaming -->
      <VBtn v-if="thread.isLoading" variant="outlined" size="small" color="error" @click="handleStopGeneration">
        <VIcon icon="bx-stop" />
        {{ "Stop" }}
      </VBtn>

      <!-- Human Fallback -->
      <AiChatHumanFallback :chat-id="thread.id" :context="thread.messages.slice(-1)[0]?.content" urgency="medium"
        @delegate="handleDelegateToHuman" />

      <!-- Social Share -->
      <AiChatSocialShare :chat-id="thread.id" :chat-title="thread.title" @shared="handleSocialShare" />

      <!-- More Actions Menu -->
      <VMenu location="bottom end">
        <template #activator="{ props: menuProps }">
          <VBtn v-bind="menuProps" variant="text" size="small" icon="bx-dots-vertical-rounded" />
        </template>

        <VList>
          <VListItem>
            <VListItemTitle>
              {{ "Export" }}
            </VListItemTitle>
          </VListItem>
          <VListItem>
            <VListItemTitle>
              {{ "Archive" }}
            </VListItemTitle>
          </VListItem>
        </VList>
      </VMenu>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.ai-chat-thread-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgb(var(--v-theme-surface));
  padding-block: 1rem;
  padding-inline: 1.5rem;

  &__identity {
    display: flex;
    align-items: center;
    gap: 0.875rem;
    min-inline-size: 0;
  }

  &__avatar {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgb(var(--v-theme-primary), 0.1);
    block-size: 2.5rem;
    font-size: 1.25rem;
    inline-size: 2.5rem;
  }

  &__info {
    min-inline-size: 0;
  }

  &__title {
    color: rgb(var(--v-theme-on-surface));
    font-size: 1rem;
    font-weight: 600;
    line-height: 1.25;
    margin-block: 0 0.125rem;
    margin-inline: 0;
  }

  &__subtitle {
    overflow: hidden;
    margin: 0;
    color: rgb(var(--v-theme-on-surface-variant));
    font-size: 0.875rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
}
</style>
