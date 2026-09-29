<script setup lang="ts">
import { mcpErrorMessage } from '@/views/integrations/mcp/mcpErrorKey';
import { useMcpStore } from '@/views/integrations/mcp/useMcpStore';
import type { McpCapabilityGrant, McpConnection } from 'contracts/integrations/mcp/types';

const props = defineProps<{
  modelValue: boolean
  connection: McpConnection | null
  providerCapabilities: string[]
  existingGrant: McpCapabilityGrant | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  granted: []
}>()

const store = useMcpStore()
const principalType = ref<'role' | 'agent'>('role')
const principalId = ref('')
const selectedCapabilities = ref<string[]>([])
const submitErrorKey = ref<string | null>(null)
const isSubmitting = ref(false)

watch(
  () => [props.existingGrant, props.providerCapabilities] as const,
  ([grant, caps]) => {
    selectedCapabilities.value = grant
      ? [...grant.allowedCapabilities]
      : [...caps]
    principalType.value = grant ? grant.principalType : 'role'
    principalId.value = grant ? grant.principalId : ''
    submitErrorKey.value = null
  },
  { immediate: true },
)

async function submit() {
  if (!props.connection || !principalId.value.trim())
    return
  isSubmitting.value = true
  submitErrorKey.value = null
  try {
    await store.updateCapabilityGrants(props.connection.id, {
      principalType: principalType.value,
      principalId: principalId.value.trim(),
      allowedCapabilities: selectedCapabilities.value,
    })
    emit('granted')
    emit('update:modelValue', false)
  }
  catch (error) {
    submitErrorKey.value = mcpErrorMessage(error)
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <VDialog :model-value="modelValue" max-width="600" persistent
    @update:model-value="$emit('update:modelValue', $event)">
    <VCard v-if="connection">
      <VCardTitle class="d-flex align-center gap-2 pa-4">
        <VIcon icon="bx-shield-quarter" />{{ ("Capability Grants — " + String(connection.displayName)) }}
      </VCardTitle>
      <VDivider />
      <VCardText class="pa-4">
        <div class="d-flex gap-3 mb-4">
          <VSelect v-model="principalType" :items="['role', 'agent']" label="Principal type" density="compact"
            hide-details class="flex-grow-1" />
          <VTextField v-model="principalId" label="Principal ID" density="compact" hide-details class="flex-grow-1" />
        </div>
        <p class="text-body-2 font-weight-semibold mb-2">
          {{ "Allowed capabilities" }}
          <span class="text-caption text-medium-emphasis ms-1">{{ "(deny-by-default)" }}</span>
        </p>
        <VCheckbox v-for="cap in providerCapabilities" :key="cap" v-model="selectedCapabilities" :value="cap"
          :label="cap" density="compact" hide-details class="mb-1" />
        <VAlert v-if="submitErrorKey" type="error" variant="tonal" class="mt-4">
          {{ submitErrorKey }}
        </VAlert>
      </VCardText>
      <VDivider />
      <VCardActions class="pa-4">
        <VSpacer />
        <VBtn variant="text" @click="$emit('update:modelValue', false)">
          {{ "Cancel" }}
        </VBtn>
        <VBtn color="primary" :loading="isSubmitting" @click="submit">
          {{ "Save grants" }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
