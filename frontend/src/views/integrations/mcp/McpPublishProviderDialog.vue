<script setup lang="ts">
import { MCP_TRUST_TIERS } from '@/views/integrations/mcp/constants';
import { mcpEnumLabel, mcpErrorMessage } from '@/views/integrations/mcp/mcpErrorKey';
import { useMcpStore } from '@/views/integrations/mcp/useMcpStore';
import { computed, ref } from 'vue';

defineProps<{ modelValue: boolean }>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  published: []
}>()

const store = useMcpStore()
const slug = ref('')
const displayName = ref('')
const category = ref('')
const trustTier = ref<'verified' | 'community' | 'internal'>('community')
const maintainer = ref('')
const docsUrl = ref('')
const capabilitiesRaw = ref('')
const requiredSecretsRaw = ref('')
const submitErrorKey = ref<string | null>(null)
const isSubmitting = ref(false)

const trustTierItems = computed(() =>
  MCP_TRUST_TIERS.map(value => ({
    title: mcpEnumLabel('pages.mcp.trust', value),
    value,
  })),
)

function reset() {
  slug.value = ''
  displayName.value = ''
  category.value = ''
  trustTier.value = 'community'
  maintainer.value = ''
  docsUrl.value = ''
  capabilitiesRaw.value = ''
  requiredSecretsRaw.value = ''
  submitErrorKey.value = null
}

async function submit() {
  submitErrorKey.value = null

  const capabilities = capabilitiesRaw.value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  const requiredSecrets = requiredSecretsRaw.value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  if (
    !slug.value.trim()
    || !displayName.value.trim()
    || !category.value.trim()
    || !maintainer.value.trim()
    || capabilities.length === 0
  ) {
    submitErrorKey.value = 'pages.mcp.publishRequired'

    return
  }
  isSubmitting.value = true
  try {
    await store.publishProvider({
      slug: slug.value.trim(),
      displayName: displayName.value.trim(),
      category: category.value.trim(),
      capabilities,
      requiredSecrets,
      trustTier: trustTier.value,
      maintainer: maintainer.value.trim(),
      docsUrl: docsUrl.value.trim() || undefined,
    })
    emit('published')
    emit('update:modelValue', false)
    reset()
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
  <VDialog :model-value="modelValue" max-width="640" persistent @update:model-value="
    $emit('update:modelValue', $event);
  reset();
  ">
    <VCard>
      <VCardTitle class="d-flex align-center gap-2 pa-4">
        <VIcon icon="bx-plus-circle" />{{ "Publish MCP Provider" }}
      </VCardTitle>
      <VDivider />
      <VCardText class="pa-4">
        <VRow dense>
          <VCol cols="6">
            <VTextField v-model="slug" label="Slug (kebab-case)" density="compact" />
          </VCol>
          <VCol cols="6">
            <VTextField v-model="displayName" label="Display name" density="compact" />
          </VCol>
          <VCol cols="6">
            <VTextField v-model="category" label="Category" density="compact" />
          </VCol>
          <VCol cols="6">
            <VSelect v-model="trustTier" :items="trustTierItems" item-title="title" item-value="value"
              label="Trust tier" density="compact" />
          </VCol>
          <VCol cols="12">
            <VTextField v-model="maintainer" label="Maintainer" density="compact" />
          </VCol>
          <VCol cols="12">
            <VTextField v-model="capabilitiesRaw" label="Capabilities (comma-separated)" density="compact"
              hint="e.g. payments.read, payments.write" persistent-hint />
          </VCol>
          <VCol cols="12">
            <VTextField v-model="requiredSecretsRaw" label="Required secrets (comma-separated)" density="compact" />
          </VCol>
          <VCol cols="12">
            <VTextField v-model="docsUrl" label="Docs URL (optional)" density="compact" />
          </VCol>
        </VRow>
        <VAlert v-if="submitErrorKey" type="error" variant="tonal" class="mt-3">
          {{ submitErrorKey }}
        </VAlert>
      </VCardText>
      <VDivider />
      <VCardActions class="pa-4">
        <VSpacer />
        <VBtn variant="text" @click="
          $emit('update:modelValue', false);
        reset();
        ">
          {{ "Cancel" }}
        </VBtn>
        <VBtn color="primary" :loading="isSubmitting" @click="submit">
          {{ "Publish" }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
