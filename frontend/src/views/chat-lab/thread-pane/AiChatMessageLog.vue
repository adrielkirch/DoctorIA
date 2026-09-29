<script setup lang="ts">
import type { AiChatMessageItem as AiChatMessageItemType } from 'contracts/ai/chat-history/types';
import { nextTick, onMounted, ref } from 'vue';
import { PerfectScrollbar } from 'vue3-perfect-scrollbar';
import AiChatMessageItem from './AiChatMessageItem.vue';

const props = defineProps<{
  messages: AiChatMessageItemType[]
  isLoading?: boolean
}>()

const emit = defineEmits<{
  regenerate: [messageId: string]
}>()

const scrollRef = ref<InstanceType<typeof PerfectScrollbar>>()
const isUserNearBottom = ref(true)


const handleScroll = (evt: Event) => {
  const el = evt.target as HTMLElement
  const threshold = 100 // 100px do final
  
  isUserNearBottom.value = 
    el.scrollHeight - el.scrollTop - el.clientHeight < threshold
}

const scrollToBottom = async (force = false) => {
  if (!scrollRef.value || (!force && !isUserNearBottom.value)) 
    return
    
  await nextTick()
  const container = scrollRef.value.$el
  container.scrollTop = container.scrollHeight
}


onMounted(() => {
  void scrollToBottom(true)
})

defineExpose({
  scrollToBottom
})
</script>

<template>
  <PerfectScrollbar
    ref="scrollRef"
    tag="div"
    class="ai-chat-message-log"
    :options="{ 
      wheelPropagation: false,
      suppressScrollX: true 
    }"
    @ps-scroll-y="handleScroll"
  >
    <div class="ai-chat-message-log__content">
      <!-- Lista de mensagens -->
      <AiChatMessageItem
        v-for="message in messages"
        :key="message.id"
        :message="message"
        class="ai-chat-message-log__item"
        @regenerate="emit('regenerate', message.id)"
      />
      
      <!-- Loading indicator durante streaming -->
      <div 
        v-if="isLoading"
        class="ai-chat-message-log__loading"
      >
        <div class="ai-chat-message-log__loading-avatar">
          🤖
        </div>
        <div class="ai-chat-message-log__loading-text">
          <VProgressLinear
            indeterminate
            height="2"
            rounded
          />
          <span class="text-caption">Thinking...</span>
        </div>
      </div>
    </div>
  </PerfectScrollbar>
</template>

<style lang="scss" scoped>
.ai-chat-message-log {
  block-size: 100%;
  
  &__content {
    padding: 1rem;
    min-block-size: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
  }

  &__item {
    margin-block-end: 1.5rem;
    
    &:last-child {
      margin-block-end: 0;
    }
  }

  &__loading {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem 0;
  }

  &__loading-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    inline-size: 2rem;
    block-size: 2rem;
    border-radius: 50%;
    background: rgb(var(--v-theme-surface-variant), 0.5);
    font-size: 1rem;
    flex-shrink: 0;
  }

  &__loading-text {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    inline-size: 8rem;
  }
}
</style>
