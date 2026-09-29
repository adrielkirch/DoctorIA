<script setup lang="ts">
import { mcpEnumLabel } from '@/views/integrations/mcp/mcpErrorKey';
import type { McpConnection } from 'contracts/integrations/mcp/types';

defineProps<{ connection: McpConnection }>()
defineEmits<{ manage: [connection: McpConnection] }>()

const statusColor: Record<string, string> = {
  active: 'success',
  failed: 'error',
  validating: 'warning',
  paused: 'secondary',
  draft: 'default',
  retired: 'default',
}

const healthColor: Record<string, string> = {
  healthy: 'success',
  degraded: 'warning',
  unreachable: 'error',
}

const healthIcon: Record<string, string> = {
  healthy: 'bx-check-circle',
  degraded: 'bx-error',
  unreachable: 'bx-x-circle',
}
</script>

<template>
  <VCard class="mcp-connection-card h-100" variant="outlined">
    <VCardText class="pa-4">
      <div class="d-flex align-center justify-space-between mb-2">
        <span class="text-body-1 font-weight-semibold text-truncate">{{
          connection.displayName
        }}</span>
        <VChip :color="statusColor[connection.status] ?? 'default'" size="x-small" label>
          {{ mcpEnumLabel('pages.mcp.connectionStatus', connection.status) }}
        </VChip>
      </div>
      <p class="text-caption text-medium-emphasis mb-2">
        {{ connection.providerSlug }}
      </p>
      <div class="d-flex align-center gap-1 mb-3">
        <VIcon :icon="healthIcon[connection.healthStatus] ?? 'bx-minus-circle'"
          :color="healthColor[connection.healthStatus] ?? 'default'" size="14" />
        <span class="text-caption">{{ mcpEnumLabel('pages.mcp.healthStatus', connection.healthStatus) }}</span>
      </div>
      <VBtn block size="small" variant="tonal" color="secondary" prepend-icon="bx-cog"
        @click="$emit('manage', connection)">
        {{ "Manage" }}
      </VBtn>
    </VCardText>
  </VCard>
</template>
