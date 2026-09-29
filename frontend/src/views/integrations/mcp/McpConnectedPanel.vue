<script setup lang="ts">
import McpConnectionCard from '@/views/integrations/mcp/McpConnectionCard.vue'
import { mcpEnumLabel, mcpErrorMessage } from '@/views/integrations/mcp/mcpErrorKey'
import { useMcpStore } from '@/views/integrations/mcp/useMcpStore'
import type { McpConnection } from 'contracts/integrations/mcp/types'
import { computed, onMounted } from 'vue'

const emit = defineEmits<{ manage: [connection: McpConnection] }>()
const store = useMcpStore()

const statusItems = computed(() => [
  { title: "All", value: '' },
  ...store.availableConnectionStatuses.map(value => ({
    title: mcpEnumLabel('pages.mcp.connectionStatus', value),
    value,
  })),
])

const healthItems = computed(() => [
  { title: "All", value: '' },
  ...store.availableConnectionHealthStates.map(value => ({
    title: mcpEnumLabel('pages.mcp.healthStatus', value),
    value,
  })),
])

onMounted(() => store.fetchConnectedServers())
</script>

<template>
  <div>
    <div class="d-flex align-center flex-wrap gap-3 mb-4">
      <VSelect v-model="store.selectedConnectionStatus" :items="statusItems" item-title="title" item-value="value"
        label="Status" density="compact" hide-details clearable :style="{ maxInlineSize: '180px' }"
        @update:model-value="store.fetchConnectedServers()" />
      <VSelect v-model="store.selectedConnectionHealth" :items="healthItems" item-title="title" item-value="value"
        label="Health" density="compact" hide-details clearable :style="{ maxInlineSize: '160px' }"
        @update:model-value="store.fetchConnectedServers()" />
    </div>
    <VProgressLinear v-if="store.isLoading" indeterminate color="primary" class="mb-4" />
    <VRow v-if="store.connections.length > 0">
      <VCol v-for="connection in store.connections" :key="connection.id" cols="12" sm="6" md="4" lg="3">
        <McpConnectionCard :connection="connection" @manage="emit('manage', $event)" />
      </VCol>
    </VRow>
    <div v-else-if="!store.isLoading" class="d-flex flex-column align-center justify-center py-16 text-medium-emphasis">
      <VIcon icon="bx-link" size="64" class="mb-4 opacity-40" />
      <p class="text-body-1">
        {{ "No connections yet" }}
      </p>
      <p class="text-caption">
        {{ "Connect a provider from the MCP Store tab" }}
      </p>
    </div>
    <VAlert v-if="store.errorMessage" type="error" variant="tonal" class="mt-4">
      {{ mcpErrorMessage(store.errorMessage) }}
    </VAlert>
  </div>
</template>
