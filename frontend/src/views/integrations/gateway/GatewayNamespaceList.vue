<script setup lang="ts">
import type { GatewayNamespace } from 'contracts/types/gateway';
import { computed } from 'vue';
import { useGatewayCredentials } from './useGatewayCredentials';

const props = defineProps<{
  namespaces: GatewayNamespace[]
  selectedId: string | null
  loading: boolean
  canManage?: boolean
}>()

const emit = defineEmits<{
  select: [ns: GatewayNamespace]
  edit: [ns: GatewayNamespace]
  delete: [ns: GatewayNamespace]
}>()

const { credentials } = useGatewayCredentials()

const credentialById = computed(() => {
  const map = new Map<number, string>()

  credentials.value.forEach(c => map.set(c.id, c.key))

  return map
})

function credentialKey(ns: GatewayNamespace): string | null {
  if (!ns.credentialId)
    return null

  return credentialById.value.get(Number(ns.credentialId)) ?? null
}
</script>

<template>
  <div>
    <div
      v-for="ns in props.namespaces"
      :key="ns.id"
      class="mb-3"
    >
      <VCard
        :variant="props.selectedId === ns.id ? 'tonal' : 'outlined'"
        :color="props.selectedId === ns.id ? 'primary' : undefined"
        class="cursor-pointer"
        @click="emit('select', ns)"
      >
        <VCardItem>
          <VCardTitle class="text-body-1 font-weight-semibold">
            {{ ns.displayName }}
          </VCardTitle>
          <VCardSubtitle class="text-caption font-mono">
            /{{ ns.slug }}
          </VCardSubtitle>
          <VCardSubtitle
            v-if="ns.baseUrl"
            class="text-caption text-medium-emphasis"
          >
            {{ ns.baseUrl }}
          </VCardSubtitle>
          <VCardSubtitle
            v-if="credentialKey(ns)"
            class="text-caption text-warning"
          >
            <VIcon
              icon="bx-lock-alt"
              size="12"
              class="me-1"
            />
            {{ credentialKey(ns) }}
          </VCardSubtitle>

          <template #append>
            <VChip
              size="small"
              color="primary"
              variant="tonal"
              label
            >
              {{ (String(ns.routeCount) + " routes") }}
            </VChip>
          </template>
        </VCardItem>

        <VCardText
          v-if="ns.description"
          class="text-body-2 text-medium-emphasis pt-0"
        >
          {{ ns.description }}
        </VCardText>

        <VCardActions @click.stop>
          <VSpacer />
          <template v-if="props.canManage !== false">
            <VBtn
              size="small"
              variant="text"
              icon="bx-edit"
              @click="emit('edit', ns)"
            />
            <VBtn
              size="small"
              variant="text"
              icon="bx-trash"
              color="error"
              @click="emit('delete', ns)"
            />
          </template>
        </VCardActions>
      </VCard>
    </div>

    <div
      v-if="!loading && namespaces.length === 0"
      class="text-center py-8 text-medium-emphasis"
    >
      <VIcon
        icon="bx-transfer-alt"
        size="40"
        class="mb-2 opacity-40"
      />
      <div class="text-body-2">
        {{ "No namespaces yet. Create one to get started." }}
      </div>
    </div>

    <div
      v-if="loading"
      class="d-flex flex-column gap-3"
    >
      <VSkeletonLoader
        v-for="i in 3"
        :key="i"
        type="card"
        height="90"
      />
    </div>
  </div>
</template>
