<script setup lang="ts">
import { useAuthStore } from '@/stores/useAuthStore';
import { computed } from 'vue';

const emit = defineEmits<{
  startChat: [message: string]
}>()

const auth = useAuthStore()

const customerName = computed(() => 
  auth.user?.fullName?.trim() || "guest"
)

const handleStartChat = (message: string) => {
  emit('startChat', message)
}
</script>

<template>
  <div class="ai-chat-welcome">
    <div class="ai-chat-welcome__content">
      <div class="ai-chat-welcome__icon">
        <VIcon
          icon="bx-bot"
          size="36"
        />
      </div>
      
      <h1 class="ai-chat-welcome__title">
        {{ ("Hi " + String(customerName) + ", what's on your mind?") }}
      </h1>
      
      <p class="ai-chat-welcome__subtitle">
        {{ "I'm here to help you with any question or task. How can I be useful?" }}
      </p>

      <!-- Quick start suggestions -->
      <div class="ai-chat-welcome__suggestions">
        <VBtn
          variant="outlined"
          size="small"
          @click="handleStartChat('Help me write a professional email')"
        >
          Write an email
        </VBtn>
        
        <VBtn
          variant="outlined"
          size="small"
          @click="handleStartChat('Explain this code to me')"
        >
          Explain code
        </VBtn>
        
        <VBtn
          variant="outlined"
          size="small" 
          @click="handleStartChat('Create a project plan')"
        >
          Make a plan
        </VBtn>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ai-chat-welcome {
  display: flex;
  align-items: center;
  justify-content: center;
  min-block-size: 100vh;
  padding: 2rem;

  &__content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    max-inline-size: 600px;
  }

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    inline-size: 56px;
    block-size: 56px;
    margin-block-end: 1rem;
    border-radius: 0.875rem;
    background-color: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
  }

  &__title {
    margin: 0 0 0.5rem;
    font-size: 1.5rem;
    font-weight: 600;
    color: rgb(var(--v-theme-on-surface));
  }

  &__subtitle {
    margin: 0 0 2rem;
    font-size: 1rem;







    color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
    line-height: 1.5;
  }

  &__suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: center;
  }
}
</style>
