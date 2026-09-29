<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  modelValue: boolean
  entryTitle: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
}>()

const isDeleting = ref(false)

async function handleConfirm() {
  isDeleting.value = true
  try {
    emit('confirm')
  }
  finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <VDialog :model-value="modelValue" max-width="440" @update:model-value="emit('update:modelValue', $event)">
    <VCard>
      <VCardTitle class="text-h6 pa-4">
        {{ "Delete knowledge entry?" }}
      </VCardTitle>

      <VCardText class="px-4 pb-2 text-medium-emphasis">
        Delete <strong class="text-on-surface">{{ entryTitle }}</strong>? This cannot be undone.
      </VCardText>

      <VCardActions class="pa-4 pt-2 gap-2 justify-end">
        <VBtn variant="tonal" color="secondary" :disabled="isDeleting" @click="emit('update:modelValue', false)">
          {{ "Cancel" }}
        </VBtn>

        <VBtn color="error" :loading="isDeleting" @click="handleConfirm">
          {{ "Delete" }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
