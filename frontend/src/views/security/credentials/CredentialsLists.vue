<script setup lang="ts">
import CredentialRow from '@/views/security/credentials/CredentialRow.vue';
import type { SecretCredential, VariableCredential } from 'contracts/security/credentials/types';
import { computed } from 'vue';

const props = defineProps<{
  variables: VariableCredential[]
  secrets: SecretCredential[]
  isLoading: boolean
  hasSearch: boolean
  activeFilter: 'all' | 'secret' | 'variable'
}>()

const emit = defineEmits<{
  editVariable: [id: number]
  deleteSecret: [id: number]
}>()

const showVariables = computed(() => props.activeFilter === 'all' || props.activeFilter === 'variable')
const showSecrets = computed(() => props.activeFilter === 'all' || props.activeFilter === 'secret')
const showEmpty = computed(() => !props.isLoading && props.variables.length === 0 && props.secrets.length === 0)

const emptyStateText = computed(() => {
  if (props.hasSearch)
    return "No credentials match your search. Try a shorter keyword or clear search."

  if (props.activeFilter === 'secret')
    return "No secrets are available for this workspace yet."

  if (props.activeFilter === 'variable')
    return "No variables are available for this workspace yet."

  return "No credentials are available yet. Add a variable to get started."
})
</script>

<template>
  <div class="d-flex flex-column gap-6">
    <VCard v-if="showVariables">
      <VCardItem>
        <VCardTitle>{{ "Variables" }}</VCardTitle>
      </VCardItem>
      <VCardText>
        <VList v-if="variables.length" lines="two" density="comfortable">
          <CredentialRow v-for="item in variables" :key="item.id" :credential="item"
            @edit-variable="emit('editVariable', $event)" @delete-secret="emit('deleteSecret', $event)" />
        </VList>
        <VAlert v-else type="info" variant="tonal"
          :text="hasSearch ? 'No variables match your search.' : 'No variables available.'" />
      </VCardText>
    </VCard>

    <VCard v-if="showSecrets">
      <VCardItem>
        <VCardTitle>{{ "Secrets" }}</VCardTitle>
      </VCardItem>
      <VCardText>
        <VList v-if="secrets.length" lines="two" density="comfortable">
          <CredentialRow v-for="item in secrets" :key="item.id" :credential="item"
            @edit-variable="emit('editVariable', $event)" @delete-secret="emit('deleteSecret', $event)" />
        </VList>
        <VAlert v-else type="info" variant="tonal"
          :text="hasSearch ? 'No secrets match your search.' : 'No secrets available.'" />
      </VCardText>
    </VCard>

    <VAlert v-if="showEmpty" type="warning" variant="tonal" title="No credentials found" :text="emptyStateText" />
  </div>
</template>
