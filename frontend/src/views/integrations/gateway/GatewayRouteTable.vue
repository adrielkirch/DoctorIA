<script setup lang="ts">
import type { GatewayRoute } from 'contracts/types/gateway';
import { computed } from 'vue';
import {
    GATEWAY_METHOD_COLORS,
    GATEWAY_MODE_COLORS,
    GATEWAY_ROLE_COLORS,
} from './constants';

const props = defineProps<{
  routes: GatewayRoute[]
  loading: boolean
  canManage?: boolean
}>()

const emit = defineEmits<{
  edit: [route: GatewayRoute]
  delete: [route: GatewayRoute]
}>()

const headers = computed(() => [
  { title: "Method", key: 'method', width: '100px' },
  { title: "Path", key: 'path' },
  { title: "Mode", key: 'mode', width: '90px' },
  { title: "Status", key: 'mockStatusCode', width: '80px' },
  { title: "Latency", key: 'mockLatencyMs', width: '90px' },
  { title: "Role", key: 'requiredRole', width: '90px' },
  { title: "Enabled", key: 'enabled', width: '80px' },
  { title: '', key: 'actions', sortable: false, width: '80px' },
])
</script>

<template>
  <VDataTable
    :headers="headers"
    :items="props.routes"
    :loading="props.loading"
    item-value="id"
    density="compact"
    hide-default-footer
  >
    <!-- Method chip -->
    <template #item.method="{ item }">
      <VChip
        :color="
          GATEWAY_METHOD_COLORS[
            item.method as keyof typeof GATEWAY_METHOD_COLORS
          ] || 'default'
        "
        size="small"
        label
        variant="tonal"
      >
        {{ item.method }}
      </VChip>
    </template>

    <!-- Path with monospace font -->
    <template #item.path="{ item }">
      <span class="font-mono text-body-2">{{ item.path }}</span>
      <VIcon
        v-if="item.isPublic"
        icon="bx-globe"
        size="14"
        color="success"
        class="ms-1"
        title="Public — no JWT required"
      />
    </template>

    <!-- Mode badge -->
    <template #item.mode="{ item }">
      <VChip
        :color="
          GATEWAY_MODE_COLORS[item.mode as keyof typeof GATEWAY_MODE_COLORS]
            || 'default'
        "
        size="x-small"
        label
        variant="tonal"
      >
        {{ item.mode }}
      </VChip>
      <VIcon
        v-if="item.mode === 'PROXY' && item.credentialId"
        icon="bx-lock-alt"
        size="14"
        color="warning"
        class="ms-1"
        title="PROXY with upstream credential"
      />
    </template>

    <!-- Status code -->
    <template #item.mockStatusCode="{ item }">
      <span
        :class="item.mockStatusCode >= 400 ? 'text-error' : 'text-success'"
        class="text-body-2 font-weight-medium"
      >
        {{ item.mode === "MOCK" ? item.mockStatusCode : "—" }}
      </span>
    </template>

    <!-- Latency -->
    <template #item.mockLatencyMs="{ item }">
      <span class="text-body-2 text-medium-emphasis">
        {{
          item.mode === "MOCK" && item.mockLatencyMs > 0
            ? `${item.mockLatencyMs}ms`
            : "—"
        }}
      </span>
    </template>

    <!-- Role chip -->
    <template #item.requiredRole="{ item }">
      <VChip
        :color="
          GATEWAY_ROLE_COLORS[
            item.requiredRole as keyof typeof GATEWAY_ROLE_COLORS
          ] || 'default'
        "
        size="x-small"
        label
        variant="tonal"
      >
        {{ item.requiredRole }}
      </VChip>
    </template>

    <!-- Enabled toggle (display only) -->
    <template #item.enabled="{ item }">
      <VIcon
        :icon="item.enabled ? 'bx-check-circle' : 'bx-x-circle'"
        :color="item.enabled ? 'success' : 'secondary'"
        size="18"
      />
    </template>

    <!-- Row actions -->
    <template #item.actions="{ item }">
      <div
        v-if="props.canManage !== false"
        class="d-flex gap-1"
      >
        <VBtn
          size="x-small"
          variant="text"
          icon="bx-edit"
          @click="emit('edit', item)"
        />
        <VBtn
          size="x-small"
          variant="text"
          icon="bx-trash"
          color="error"
          @click="emit('delete', item)"
        />
      </div>
    </template>

    <!-- No data -->
    <template #no-data>
      <div class="text-center py-8 text-medium-emphasis">
        <VIcon
          icon="bx-list-ul"
          size="36"
          class="mb-2 opacity-40"
        />
        <div class="text-body-2">
          {{ "No routes registered in this namespace." }}
        </div>
      </div>
    </template>
  </VDataTable>
</template>
