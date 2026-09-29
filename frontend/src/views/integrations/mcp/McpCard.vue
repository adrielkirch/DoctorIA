<script setup lang="ts">
import { mcpEnumLabel } from '@/views/integrations/mcp/mcpErrorKey';
import type { McpProviderDefinition } from 'contracts/integrations/mcp/types';
import { computed } from 'vue';

const props = defineProps<{
  provider: McpProviderDefinition
  canConnect?: boolean
}>()

defineEmits<{ connect: [provider: McpProviderDefinition] }>()

const trustColor: Record<string, string> = {
  verified: 'success',
  community: 'info',
  internal: 'warning',
}

const trustIcon: Record<string, string> = {
  verified: 'bx-badge-check',
  community: 'bx-group',
  internal: 'bx-building',
}


const cardColor = computed(
  () => trustColor[props.provider.trustTier] ?? 'primary',
)
</script>

<template>
  <VCard class="mcp-card h-100" variant="outlined">
    <VCardText class="pa-4">
      <div class="d-flex align-center justify-space-between mb-2">
        <span class="text-body-1 font-weight-semibold text-truncate">{{
          provider.displayName
        }}</span>
        <VChip :color="trustColor[provider.trustTier] ?? 'default'" size="x-small" label>
          <VIcon :icon="trustIcon[provider.trustTier] ?? 'bx-shield'" size="10" class="me-1" />
          {{ mcpEnumLabel('pages.mcp.trust', provider.trustTier) }}
        </VChip>
      </div>
      <p class="text-caption text-medium-emphasis mb-3">
        {{ provider.category }}
      </p>
      <div class="d-flex flex-wrap gap-1 mb-3">
        <VChip v-for="cap in provider.capabilities.slice(0, 3)" :key="cap" size="x-small" variant="tonal"
          :color="cardColor">
          {{ cap }}
        </VChip>
        <VChip v-if="provider.capabilities.length > 3" size="x-small" variant="tonal" color="secondary">
          {{ ("+" + String(provider.capabilities.length - 3) + " more") }}
        </VChip>
      </div>
      <VBtn v-if="props.canConnect !== false" block size="small" :color="cardColor" variant="tonal"
        prepend-icon="bx-plug" @click="$emit('connect', provider)">
        {{ "Connect" }}
      </VBtn>
    </VCardText>
  </VCard>
</template>
