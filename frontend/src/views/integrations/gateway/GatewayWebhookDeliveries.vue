<script setup lang="ts">
import type { GatewayWebhook, GatewayWebhookDelivery } from 'contracts/types/gateway'
import { watch } from 'vue'
import { useGatewayStore } from './useGatewayStore'

const store = useGatewayStore()

const deliveryStatusLabels: Record<GatewayWebhookDelivery['status'], string> = {
  pending: 'Pending',
  delivered: 'Delivered',
  failed: 'Failed',
  dlq: 'DLQ',
}

const props = defineProps<{
  modelValue: boolean
  namespaceId: string
  webhook: GatewayWebhook | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const expandedDelivery = ref<string | null>(null)

watch(() => props.modelValue, (open) => {
  if (open && props.webhook)
    void store.fetchDeliveries(props.namespaceId, props.webhook.id)
})

function statusColor(status: GatewayWebhookDelivery['status']): string {
  if (status === 'delivered')
    return 'success'
  if (status === 'failed')
    return 'error'

  return 'info'
}

function togglePayload(delivery: GatewayWebhookDelivery): void {
  expandedDelivery.value = expandedDelivery.value === delivery.id ? null : delivery.id
}

function prettyPayload(payload: string): string {
  try {
    return JSON.stringify(JSON.parse(payload), null, 2)
  }
  catch {
    return payload
  }
}

async function handleRetry(delivery: GatewayWebhookDelivery) {
  if (!props.webhook)
    return
  await store.retryDelivery(props.namespaceId, props.webhook.id, delivery.id)
  await store.fetchDeliveries(props.namespaceId, props.webhook.id)
}
</script>

<template>
  <VDialog :model-value="modelValue" max-width="860" @update:model-value="emit('update:modelValue', $event)">
    <DialogCloseBtn @click="emit('update:modelValue', false)" />

    <VCard>
      <VCardTitle class="text-h6 d-flex align-center gap-2">
        <span>{{ "Deliveries" }}</span>
        <VChip v-if="webhook" size="small" variant="tonal" color="primary" label>
          {{ webhook.name }}
        </VChip>
      </VCardTitle>

      <VCardText>
        <VAlert v-if="store.deliveriesError" type="error" variant="tonal" density="compact" class="mb-4">
          {{ store.deliveriesError }}
        </VAlert>

        <div v-if="store.deliveriesLoading">
          <div class="text-center py-8 text-medium-emphasis">
            {{ "Loading" }}…
          </div>
        </div>

        <div v-else-if="store.deliveries.length" class="d-flex flex-column gap-3">
          <VCard v-for="delivery in store.deliveries" :key="delivery.id" variant="outlined" class="pa-3">
            <div class="d-flex align-center gap-2 flex-wrap">
              <VChip size="x-small" :color="statusColor(delivery.status)" variant="tonal" label>
                {{ deliveryStatusLabels[delivery.status] }}
              </VChip>

              <VChip v-if="delivery.isDeadLetter" size="x-small" color="error" variant="tonal" label>
                {{ "DLQ" }}
              </VChip>

              <span class="text-caption text-medium-emphasis font-mono flex-grow-1 text-truncate">
                {{ "Event" }}: {{ delivery.eventId }}
              </span>

              <span class="text-caption text-medium-emphasis">
                {{ (String(delivery.attempts.length) + "/" + String(delivery.maxAttempts)) }}
              </span>

              <VChip v-if="delivery.attempts.length" size="x-small" variant="outlined" label>
                HTTP {{ delivery.attempts[delivery.attempts.length - 1].httpStatus ?? '—' }}
              </VChip>

              <VChip v-if="delivery.attempts.length" size="x-small" variant="outlined" label>
                {{ delivery.attempts[delivery.attempts.length - 1].responseTimeMs ?? '—' }} ms
              </VChip>

              <VBtn v-if="delivery.status === 'failed'" size="x-small" color="primary" variant="tonal"
                prepend-icon="bx-refresh" @click="handleRetry(delivery)">
                {{ "Retry" }}
              </VBtn>

              <VBtn size="x-small" variant="text"
                :prepend-icon="expandedDelivery === delivery.id ? 'bx-chevron-up' : 'bx-chevron-down'"
                @click="togglePayload(delivery)">
                {{ "Payload" }}
              </VBtn>
            </div>

            <div v-if="delivery.attempts.length" class="d-flex flex-column gap-1 mt-2">
              <div v-for="att in delivery.attempts" :key="att.attempt"
                class="d-flex align-center gap-2 text-caption text-medium-emphasis">
                <span class="font-mono">{{ (String(att.attempt) + "/" + String(delivery.maxAttempts)) }}</span>
                <VChip size="x-small"
                  :color="att.httpStatus !== undefined && att.httpStatus < 400 ? 'success' : 'error'" variant="tonal"
                  label>
                  {{ att.httpStatus ?? '—' }}
                </VChip>
                <span class="font-mono">{{ att.responseTimeMs ?? '—' }} ms</span>
                <span v-if="att.error" class="font-mono text-error">{{ att.error }}</span>
              </div>
            </div>

            <pre v-if="expandedDelivery === delivery.id"
              class="webhook-payload-pre text-caption font-mono rounded pa-2 mt-2">{{ prettyPayload(delivery.payload) }}</pre>
          </VCard>
        </div>

        <div v-else class="text-center py-8 text-medium-emphasis">
          {{ "No deliveries yet. Invoke a route or send a test event." }}
        </div>
      </VCardText>
    </VCard>
  </VDialog>
</template>

<style scoped>
.webhook-payload-pre {
  max-block-size: 260px;
  overflow: auto;
  background: rgba(var(--v-theme-on-surface), 0.04);
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
