<script setup lang="ts">
import type { CredentialEntry } from 'contracts/security/credentials/types';
import { computed } from 'vue';

const props = defineProps<{
  credential: CredentialEntry
}>()

const emit = defineEmits<{
  editVariable: [id: number]
  deleteSecret: [id: number]
}>()

const isSecret = computed(() => props.credential.type === 'SECRET')

function handleEditVariable(): void {
  if (props.credential.type === 'VARIABLE')
    emit('editVariable', props.credential.id)
}

function handleDeleteSecret(): void {
  if (props.credential.type === 'SECRET')
    emit('deleteSecret', props.credential.id)
}
</script>

<template>
  <VListItem class="px-0">
    <template #prepend>
      <VAvatar
        size="34"
        :color="credential.type === 'SECRET' ? 'warning' : 'primary'"
        variant="tonal"
      >
        <VIcon
          :icon="credential.type === 'SECRET' ? 'bx-lock-alt' : 'bx-slider-alt'"
          size="18"
        />
      </VAvatar>
    </template>

    <VListItemTitle class="d-flex align-center flex-wrap gap-2">
      <span class="font-weight-medium">{{ credential.key }}</span>
      <VChip
        size="x-small"
        :color="credential.type === 'SECRET' ? 'warning' : 'primary'"
        variant="tonal"
      >
        {{ credential.type === 'SECRET' ? "Secret" : "Variable" }}
      </VChip>
    </VListItemTitle>

    <VListItemSubtitle class="text-wrap">
      <span class="text-medium-emphasis">{{ credential.type === 'SECRET' ? credential.maskedValue : credential.value }}</span>
      <span
        v-if="credential.description"
        class="d-block mt-1"
      >{{ credential.description }}</span>
    </VListItemSubtitle>

    <template #append>
      <VBtn
        v-if="isSecret"
        size="small"
        color="error"
        variant="outlined"
        prepend-icon="bx-trash"
        @click="handleDeleteSecret"
      >
        {{ "Delete Secret" }}
      </VBtn>

      <VBtn
        v-else
        size="small"
        color="primary"
        variant="outlined"
        prepend-icon="bx-edit"
        @click="handleEditVariable"
      >
        {{ "Edit Variable" }}
      </VBtn>
    </template>
  </VListItem>
</template>
