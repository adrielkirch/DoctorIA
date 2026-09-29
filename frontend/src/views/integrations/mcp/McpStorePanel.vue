<script setup lang="ts">
import McpCard from '@/views/integrations/mcp/McpCard.vue'
import McpPublishProviderDialog from '@/views/integrations/mcp/McpPublishProviderDialog.vue'
import { mcpEnumLabel, mcpErrorMessage } from '@/views/integrations/mcp/mcpErrorKey'
import { useMcpStore } from '@/views/integrations/mcp/useMcpStore'
import type { McpProviderDefinition } from 'contracts/integrations/mcp/types'
import { computed, onMounted, ref } from 'vue'

const emit = defineEmits<{ connect: [provider: McpProviderDefinition] }>()
const store = useMcpStore()
const publishOpen = ref(false)

const categoryItems = computed(() => [
  { title: "All", value: '' },
  ...store.availableCategories.map(value => ({ title: value, value })),
])

const trustTierItems = computed(() => [
  { title: "All", value: '' },
  ...store.availableTrustTiers.map(value => ({
    title: mcpEnumLabel('pages.mcp.trust', value),
    value,
  })),
])

let debounceTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput() {
  if (debounceTimer)
    clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => store.fetchStoreCatalog(), 300)
}

onMounted(() => store.fetchStoreCatalog())
</script>

<template>
  <div>
    <div class="d-flex align-center flex-wrap gap-3 mb-4">
      <VTextField v-model="store.searchQuery" placeholder="Search providers…" prepend-inner-icon="bx-search"
        density="compact" hide-details clearable :style="{ maxInlineSize: '220px' }" @input="onSearchInput"
        @click:clear="store.fetchStoreCatalog()" />
      <VSelect v-model="store.selectedCategory" :items="categoryItems" item-title="title" item-value="value"
        label="Category" density="compact" hide-details clearable :style="{ maxInlineSize: '180px' }"
        @update:model-value="store.fetchStoreCatalog()" />
      <VSelect v-model="store.selectedTrustTier" :items="trustTierItems" item-title="title" item-value="value"
        label="Trust tier" density="compact" hide-details clearable :style="{ maxInlineSize: '160px' }"
        @update:model-value="store.fetchStoreCatalog()" />
      <VSpacer />
      <VBtn v-if="store.canPublish" color="secondary" variant="tonal" prepend-icon="bx-plus-circle"
        @click="publishOpen = true">
        {{ "Publish provider" }}
      </VBtn>
    </div>
    <VProgressLinear v-if="store.isLoading" indeterminate color="primary" class="mb-4" />
    <VRow v-if="store.providers.length > 0">
      <VCol v-for="provider in store.providers" :key="provider.id" cols="12" sm="6" md="4" lg="3">
        <McpCard :provider="provider" :can-connect="store.canConnect" @connect="emit('connect', $event)" />
      </VCol>
    </VRow>
    <div v-else-if="!store.isLoading" class="d-flex flex-column align-center justify-center py-16 text-medium-emphasis">
      <VIcon icon="bx-server" size="64" class="mb-4 opacity-40" />
      <p class="text-body-1">
        {{ "No providers found" }}
      </p>
      <p class="text-caption">
        {{ "Try adjusting your search or filters" }}
      </p>
    </div>
    <VAlert v-if="store.errorMessage" type="error" variant="tonal" class="mt-4">
      {{ mcpErrorMessage(store.errorMessage) }}
    </VAlert>
    <McpPublishProviderDialog v-model="publishOpen" @published="store.fetchStoreCatalog()" />
  </div>
</template>
