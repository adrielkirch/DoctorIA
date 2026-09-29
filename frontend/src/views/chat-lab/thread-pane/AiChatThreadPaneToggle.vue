<script setup lang="ts">
import { ref } from 'vue'
import ChatInterface from '@/views/ai/assistant/ChatInterface.vue'
import AiChatThreadPaneDemo from './AiChatThreadPaneDemo.vue'

const useThreadPane = ref(false)
</script>

<template>
  <div class="ai-chat-thread-pane-toggle">
    <!-- Development Toggle -->
    <div class="ai-chat-thread-pane-toggle__controls">
      <VSwitch
        v-model="useThreadPane"
        :label="useThreadPane ? 'Thread Pane (Phase 4)' : 'Current Interface'"
        color="primary"
        hide-details
      />
    </div>

    <!-- Interface Selection -->
    <div class="ai-chat-thread-pane-toggle__content">
      <AiChatThreadPaneDemo v-if="useThreadPane" />
      <ChatInterface v-else />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ai-chat-thread-pane-toggle {
  display: flex;
  flex-direction: column;
  block-size: 100vh;

  &__controls {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 1000;
    padding: 0.5rem 1rem;
    background: rgb(var(--v-theme-surface));
    border: 1px solid rgb(var(--v-theme-surface-variant));
    border-radius: 0.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &__content {
    flex: 1;
  }
}
</style>