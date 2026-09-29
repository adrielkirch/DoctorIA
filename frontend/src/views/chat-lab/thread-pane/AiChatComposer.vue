<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

const props = defineProps<{
  disabled?: boolean
  isLoading?: boolean
}>()

const emit = defineEmits<{
  send: [content: string, attachments?: File[]]
  stop: []
}>()

const message = ref('')
const attachments = ref<File[]>([])
const textareaRef = ref<HTMLTextAreaElement>()
const fileInputRef = ref<HTMLInputElement>()

const canSend = computed(() => 
  !props.disabled && 
  !props.isLoading && 
  (message.value.trim() || attachments.value.length > 0)
)


const adjustTextareaHeight = async () => {
  await nextTick()
  if (!textareaRef.value) return
  
  textareaRef.value.style.height = 'auto'
  textareaRef.value.style.height = `${textareaRef.value.scrollHeight}px`
}

watch(message, adjustTextareaHeight)

const handleSend = () => {
  if (!canSend.value) return
  
  emit('send', message.value.trim(), attachments.value.length ? [...attachments.value] : undefined)
  
  message.value = ''
  attachments.value = []
  
  void adjustTextareaHeight()
}

const handleKeyDown = (event: KeyboardEvent) => {

  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSend()
  }
}

const handleFileSelect = (event: Event) => {
  const files = (event.target as HTMLInputElement).files
  if (files) {
    attachments.value.push(...Array.from(files))
  }
}

const removeAttachment = (index: number) => {
  attachments.value.splice(index, 1)
}

const handleStop = () => {
  emit('stop')
}


const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  const files = event.dataTransfer?.files
  if (files) {
    attachments.value.push(...Array.from(files))
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
}
</script>

<template>
  <div class="ai-chat-composer">
    <!-- Attachments preview -->
    <div 
      v-if="attachments.length"
      class="ai-chat-composer__attachments"
    >
      <VChip
        v-for="(file, index) in attachments"
        :key="`${file.name}-${index}`"
        size="small"
        closable
        @click:close="removeAttachment(index)"
      >
        <VIcon icon="bx-paperclip" start />
        {{ file.name }}
      </VChip>
    </div>

    <div class="ai-chat-composer__input-area">
      <!-- Attach button -->
      <VBtn
        variant="text"
        size="small"
        icon="bx-plus"
        class="ai-chat-composer__attach"
        @click="fileInputRef?.click()"
      />
      
      <!-- Message input -->
      <div 
        class="ai-chat-composer__input-wrapper"
        @drop="handleDrop"
        @dragover="handleDragOver"
      >
        <textarea
          ref="textareaRef"
          v-model="message"
          placeholder="Type a message..."
          :disabled="disabled"
          class="ai-chat-composer__textarea"
          rows="1"
          @keydown="handleKeyDown"
        />
      </div>

      <!-- Send/Stop button -->
      <VBtn
        v-if="isLoading"
        variant="text"
        size="small"
        icon="bx-stop"
        color="error"
        class="ai-chat-composer__send"
        @click="handleStop"
      />
      <VBtn
        v-else
        :disabled="!canSend"
        variant="text"
        size="small"
        icon="bx-send"
        color="primary"
        class="ai-chat-composer__send"
        @click="handleSend"
      />
    </div>

    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      multiple
      accept="image/*,.pdf,.doc,.docx,.txt,.md,.csv,.json"
      style="display: none"
      @change="handleFileSelect"
    />
  </div>
</template>

<style lang="scss" scoped>
.ai-chat-composer {
  padding: 1rem 1.5rem;
  background: rgb(var(--v-theme-surface));

  &__attachments {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-block-end: 1rem;
  }

  &__input-area {
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    padding: 0.5rem;
    border: 1px solid rgb(var(--v-theme-surface-variant));
    border-radius: 1.5rem;
    background: rgb(var(--v-theme-background));
    transition: border-color 0.2s ease;

    &:focus-within {
      border-color: rgb(var(--v-theme-primary));
    }
  }

  &__attach {
    flex-shrink: 0;
  }

  &__input-wrapper {
    flex: 1;
    min-inline-size: 0;
  }

  &__textarea {
    inline-size: 100%;
    max-block-size: 200px;
    padding: 0;
    border: none;
    outline: none;
    background: transparent;
    color: rgb(var(--v-theme-on-background));
    font-family: inherit;
    font-size: 0.875rem;
    line-height: 1.5;
    resize: none;

    &::placeholder {
      color: rgb(var(--v-theme-on-surface-variant));
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  &__send {
    flex-shrink: 0;
  }
}
</style>
