<script setup lang="ts">
import type { CreateWebhookPayload, UpdateWebhookPayload } from 'contracts/integrations/gateway/types'
import type { GatewayWebhook } from 'contracts/types/gateway'
import { onMounted, ref, watch } from 'vue'
import GatewayWebhookDeliveries from './GatewayWebhookDeliveries.vue'
import GatewayWebhookDialog from './GatewayWebhookDialog.vue'
import { useGatewayStore } from './useGatewayStore'

const store = useGatewayStore()

const props = defineProps<{
  namespaceId: string
}>()

const showDialog = ref(false)
const editingWebhook = ref<GatewayWebhook | null>(null)
const showDeliveries = ref(false)
const deliveriesWebhook = ref<GatewayWebhook | null>(null)
const saving = ref(false)
const actionError = ref<string | null>(null)
const createdSecret = ref<string | null>(null)

async function load() {
  await store.fetchWebhooks(props.namespaceId)
}

function openCreate() {
  editingWebhook.value = null
  createdSecret.value = null
  actionError.value = null
  showDialog.value = true
}

function openEdit(webhook: GatewayWebhook) {
  editingWebhook.value = webhook
  createdSecret.value = null
  actionError.value = null
  showDialog.value = true
}

async function handleSubmit(payload: CreateWebhookPayload & UpdateWebhookPayload) {
  saving.value = true
  actionError.value = null
  createdSecret.value = null
  try {
    if (editingWebhook.value) {
      const res = await store.updateWebhook(props.namespaceId, editingWebhook.value.id, payload)
      if (res.secret)
        createdSecret.value = res.secret
    }
    else {
      const res = await store.createWebhook(props.namespaceId, payload)
      createdSecret.value = res.secret
    }
    showDialog.value = false
  }
  catch (err: unknown) {
    actionError.value = (err as Error).message ?? "Something went wrong"
  }
  finally {
    saving.value = false
  }
}

async function handleDelete(webhook: GatewayWebhook) {
  if (!confirm(("Delete webhook \"" + String(webhook.name) + "\" and its delivery history?")))
    return
  actionError.value = null
  try {
    await store.deleteWebhook(props.namespaceId, webhook.id)
  }
  catch (err: unknown) {
    actionError.value = (err as Error).message ?? "Something went wrong"
  }
}

async function handleToggleStatus(webhook: GatewayWebhook, active: boolean) {
  try {
    await store.updateWebhook(props.namespaceId, webhook.id, { status: active ? 'active' : 'inactive' })
  }
  catch (err: unknown) {
    actionError.value = (err as Error).message ?? "Something went wrong"
  }
}

async function handleTest(webhook: GatewayWebhook) {
  actionError.value = null
  try {
    await store.sendTestEvent(props.namespaceId, webhook.id)
  }
  catch (err: unknown) {
    actionError.value = (err as Error).message ?? "Something went wrong"
  }
}

function openDeliveries(webhook: GatewayWebhook) {
  deliveriesWebhook.value = webhook
  showDeliveries.value = true
}

watch(() => props.namespaceId, () => {
  createdSecret.value = null
  void load()
})
onMounted(load)
</script>

<template>
  <VCard variant="outlined" class="mt-4">
    <VCardItem>
      <div class="d-flex align-center w-100">
        <div class="flex-grow-1">
          <VCardTitle class="text-subtitle-2">
            {{ "Webhooks" }}
          </VCardTitle>
          <VCardSubtitle>
            {{ "Deliver namespace events to your endpoints with HMAC signatures" }}
          </VCardSubtitle>
        </div>
        <VBtn size="small" color="primary" variant="tonal" prepend-icon="bx-plus" @click="openCreate">
          {{ "New Webhook" }}
        </VBtn>
      </div>
    </VCardItem>

    <VCardText class="pt-0">
      <VAlert v-if="actionError" type="error" variant="tonal" density="compact" class="mb-3">
        {{ actionError }}
      </VAlert>

      <VAlert v-if="createdSecret" type="success" variant="tonal" density="compact" class="mb-3">
        <div class="text-caption mb-1">
          {{ "Copy this secret now — it will never be shown again:" }}
        </div>
        <code class="font-mono">{{ createdSecret }}</code>
      </VAlert>

      <div v-if="store.webhooksLoading">
        <div class="text-center py-6 text-medium-emphasis">
          {{ "Loading" }}…
        </div>
      </div>

      <div v-else-if="store.webhooks.length" class="d-flex flex-column gap-2">
        <VCard v-for="webhook in store.webhooks" :key="webhook.id" variant="outlined" class="pa-2">
          <div class="d-flex align-center gap-2 flex-wrap px-1">
            <div class="flex-grow-1">
              <div class="d-flex align-center gap-2">
                <span class="text-body-2 font-weight-medium">{{ webhook.name }}</span>
                <VChip size="x-small" :color="webhook.status === 'active' ? 'success' : 'secondary'" variant="tonal"
                  label>
                  {{ webhook.status === 'active' ? 'Active' : 'Inactive' }}
                </VChip>
              </div>
              <div class="d-flex align-center gap-2 flex-wrap mt-1">
                <code class="text-caption text-medium-emphasis font-mono">{{ webhook.targetUrl }}</code>
                <VChip v-for="event in webhook.events" :key="event" size="x-small" variant="tonal" color="info" label>
                  {{ event }}
                </VChip>
                <code class="text-caption text-medium-emphasis font-mono">{{ webhook.maskedSecret }}</code>
              </div>
            </div>

            <VSwitch :model-value="webhook.status === 'active'" color="success" density="compact" hide-details
              @update:model-value="handleToggleStatus(webhook, $event as boolean)" />

            <VBtn size="x-small" variant="text" icon="bx-history" title="Deliveries" @click="openDeliveries(webhook)" />
            <VBtn size="x-small" variant="text" icon="bx-broadcast" title="Send test event"
              @click="handleTest(webhook)" />
            <VBtn size="x-small" variant="text" icon="bx-pencil" title="Edit" @click="openEdit(webhook)" />
            <VBtn size="x-small" variant="text" icon="bx-trash" title="Delete" @click="handleDelete(webhook)" />
          </div>
        </VCard>
      </div>

      <div v-else class="text-caption text-medium-emphasis text-center py-6">
        {{ "No webhooks yet. Create one to receive events when routes are called." }}
      </div>
    </VCardText>
  </VCard>

  <GatewayWebhookDialog v-model="showDialog" :webhook="editingWebhook" :saving="saving" :error="actionError"
    @submit="handleSubmit" />

  <GatewayWebhookDeliveries v-model="showDeliveries" :namespace-id="props.namespaceId" :webhook="deliveriesWebhook" />
</template>
