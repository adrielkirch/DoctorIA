<script setup lang="ts">
import { copyToClipboard } from '@/utils/shareUtils';
import type { AiChatMessageItem } from 'contracts/ai/chat-history/types';
import { computed, ref } from 'vue';
import MarkdownRenderer from './MarkdownRenderer.vue';

const props = withDefaults(defineProps<{
  message: AiChatMessageItem
  isStreaming?: boolean
}>(), {
  isStreaming: false,
})

const isUser = computed(() => props.message.role === 'user')


const copySuccess = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | null = null

async function handleCopy() {
  if (copySuccess.value)
    return

  const ok = await copyToClipboard(props.message.content)

  if (!ok)
    return

  copySuccess.value = true

  if (copyTimer)
    clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copySuccess.value = false
  }, 2000)
}
</script>

<template>
  <div class="chat-message" :class="[
    `chat-message--${message.role}`,
    { 'chat-message--streaming': isStreaming },
  ]">
    <template v-if="isUser">
      <div class="chat-message__bubble">
        <span class="chat-message__content">{{ message.content }}</span>
      </div>
    </template>

    <template v-else>
      <!-- ℹ️ Assistente (Fase 3): markdown renderizado + streaming. -->
      <div class="chat-message__content">
        <MarkdownRenderer :content="message.content" :streaming="isStreaming" />

        <!-- ℹ️ Cursor de "digitação" durante o streaming (estilo ChatGPT). -->
        <span v-if="isStreaming" class="chat-message__cursor" aria-hidden="true" />
      </div>

      <!--
        ℹ️ Copiar SÓ na resposta do bot, ABAIXO do conteúdo; oculto durante
        o streaming (a resposta ainda está sendo gerada).
      -->
      <button v-if="!isStreaming" class="chat-message__copy" type="button"
        :class="{ 'chat-message__copy--done': copySuccess }" :title="copySuccess ? 'Copied!' : 'Copy'" aria-label="Copy"
        @click="handleCopy">
        <VIcon :icon="copySuccess ? 'bx-check' : 'bx-copy'" size="15" />
      </button>
    </template>

    <span v-if="message.attachments?.length" class="chat-message__attachments">
      <VIcon icon="bx-paperclip" size="14" />
      {{message.attachments.map(a => a.name).join(', ')}}
    </span>
  </div>
</template>

<style lang="scss" scoped>
.chat-message {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-block: 0.3125rem;


  &--user {
    align-items: flex-end;
  }

  &__bubble {
    display: inline-block;
    padding: 0.3125rem 0.625rem;
    border-radius: 0.4375rem;
    background-color: rgb(var(--v-theme-primary));
    color: rgb(var(--v-theme-on-primary));
  }

  &__content {

    white-space: normal;
    overflow-wrap: anywhere;
    font-size: 0.8125rem;
    line-height: 1.45;
  }

  &__cursor {
    display: inline-block;
    inline-size: 2px;
    block-size: 1.05em;
    margin-inline-start: 2px;
    vertical-align: text-bottom;
    border-radius: 1px;
    background-color: rgb(var(--v-theme-primary));
    animation: chat-message-blink 1s step-end infinite;
  }

  &__copy {
    display: flex;
    align-items: center;
    justify-content: center;
    inline-size: 1.25rem;
    block-size: 1.25rem;
    margin-block-start: 0.25rem;
    border: none;
    border-radius: 0.3125rem;
    background: transparent;
    color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s ease, background-color 0.2s ease, color 0.2s ease;

    &:hover {
      background-color: rgba(var(--v-theme-on-surface), 0.06);
      color: rgb(var(--v-theme-on-surface));
    }

    &--done {
      color: rgb(var(--v-theme-primary));
      opacity: 1;
    }
  }

  &:hover .chat-message__copy {
    opacity: 1;
  }

  &__attachments {
    display: flex;
    gap: 0.375rem;
    align-items: center;
    font-size: 0.6875rem;
    opacity: 0.9;
  }
}

@keyframes chat-message-blink {

  0%,
  45% {
    opacity: 1;
  }

  46%,
  100% {
    opacity: 0;
  }
}
</style>
