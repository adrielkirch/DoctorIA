<script setup lang="ts">
import { mcpErrorMessage } from '@/views/integrations/mcp/mcpErrorKey';
import { useMcpStore } from '@/views/integrations/mcp/useMcpStore';
import type { McpProviderDefinition } from 'contracts/integrations/mcp/types';

const props = defineProps<{
  modelValue: boolean
  provider: McpProviderDefinition | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  connected: []
}>()

const store = useMcpStore()
const displayName = ref('')
const secrets = ref<Record<string, string>>({})
const selectedCapabilities = ref<string[]>([])
const submitErrorKey = ref<string | null>(null)
const isSubmitting = ref(false)

watch(
  () => props.provider,
  provider => {
    if (!provider)
      return
    displayName.value = (String(provider.displayName) + " Connection")
    secrets.value = Object.fromEntries(
      provider.requiredSecrets.map(k => [k, '']),
    )
    selectedCapabilities.value = [...provider.capabilities]
    submitErrorKey.value = null
  },
  { immediate: true },
)

async function submit() {
  if (!props.provider || !displayName.value.trim())
    return
  isSubmitting.value = true
  submitErrorKey.value = null
  try {
    await store.connectProvider({
      providerSlug: props.provider.slug,
      displayName: displayName.value.trim(),
      secrets: secrets.value,
      requestedCapabilities: selectedCapabilities.value,
    })
    emit('connected')
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
  <VDialog :model-value="modelValue" max-width="640" persistent
    @update:model-value="$emit('update:modelValue', $event)">
    <VCard v-if="provider">
      <VCardTitle class="d-flex align-center gap-2 pa-4">
        <VIcon icon="bx-plug" />{{ ("Connect " + String(provider.displayName)) }}
      </VCardTitle>
      <VDivider />
      <VCardText class="pa-4">
        <VTextField v-model="displayName" label="Connection name" density="compact" class="mb-4" />
        <template v-if="provider.requiredSecrets.length > 0">
          <p class="text-body-2 font-weight-semibold mb-2">
            {{ "Required secrets" }}
          </p>
          <VTextField v-for="key in provider.requiredSecrets" :key="key" v-model="secrets[key]" :label="key"
            type="password" density="compact" class="mb-3" />
        </template>
        <p class="text-body-2 font-weight-semibold mb-2">
          {{ "Capabilities to grant" }}
        </p>
        <VCheckbox v-for="cap in provider.capabilities" :key="cap" v-model="selectedCapabilities" :value="cap"
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
          {{ "Connect" }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
