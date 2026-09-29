<script setup lang="ts">
import type { GatewayWebhook, GatewayWebhookStatus } from 'contracts/types/gateway';
import { WEBHOOK_EVENTS } from 'contracts/types/gateway';
import { ref, watch } from 'vue';

const props = defineProps<{
  modelValue: boolean
  webhook: GatewayWebhook | null
  saving?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [payload: {
    name: string
    targetUrl: string
    events: string[]
    status: GatewayWebhookStatus
    rateLimit: { limit: number; windowSec: number } | null
    ipAllowlist: string[]
    timeoutMs: number
    regenerateSecret: boolean
  }]
}>()

const form = ref({
  name: '',
  targetUrl: '',
  events: [] as string[],
  status: 'active' as GatewayWebhookStatus,
  rateLimitEnabled: false,
  rateLimit: 60,
  rateWindow: 60,
  ipAllowlist: '',
  timeoutMs: 10_000,
  regenerateSecret: false,
})

const errors = ref<Record<string, string | undefined>>({})

function resetForm() {
  form.value = {
    name: props.webhook?.name ?? '',
    targetUrl: props.webhook?.targetUrl ?? '',
    events: props.webhook?.events.length ? [...props.webhook.events] : ['route.invoked'],
    status: props.webhook?.status ?? 'active',
    rateLimitEnabled: !!props.webhook?.rateLimit,
    rateLimit: props.webhook?.rateLimit?.limit ?? 60,
    rateWindow: props.webhook?.rateLimit?.windowSec ?? 60,
    ipAllowlist: props.webhook?.ipAllowlist?.join('\n') ?? '',
    timeoutMs: props.webhook?.timeoutMs ?? 10_000,
    regenerateSecret: false,
  }
  errors.value = {}
}

watch(() => props.modelValue, (open) => {
  if (open)
    resetForm()
})

function validate(): boolean {
  const next: Record<string, string | undefined> = {}

  if (!form.value.name.trim())
    next.name = "This field is required"

  const url = form.value.targetUrl.trim()
  if (!url)
    next.targetUrl = "This field is required"
  else if (!url.startsWith('/') && !/^https?:\/\//i.test(url))
    next.targetUrl = "Must start with http(s) or /"

  if (form.value.events.length === 0)
    next.events = "This field is required"

  if (form.value.rateLimitEnabled && (form.value.rateLimit < 1 || form.value.rateWindow < 1))
    next.rateLimit = "Rate limit values must be positive"

  errors.value = next

  return Object.keys(next).length === 0
}

function handleSubmit() {
  if (!validate())
    return

  emit('submit', {
    name: form.value.name.trim(),
    targetUrl: form.value.targetUrl.trim(),
    events: form.value.events,
    status: form.value.status,
    rateLimit: form.value.rateLimitEnabled
      ? { limit: Math.floor(form.value.rateLimit), windowSec: Math.floor(form.value.rateWindow) }
      : null,
    ipAllowlist: form.value.ipAllowlist
      .split('\n')
      .map(ip => ip.trim())
      .filter(Boolean),
    timeoutMs: Math.max(form.value.timeoutMs, 1000),
    regenerateSecret: form.value.regenerateSecret,
  })
}
</script>

<template>
  <VDialog :model-value="modelValue" max-width="620" @update:model-value="emit('update:modelValue', $event)">
    <DialogCloseBtn @click="emit('update:modelValue', false)" />

    <VCard>
      <VCardTitle class="text-h6">
        {{ webhook ? "Edit Webhook" : "Create Webhook" }}
      </VCardTitle>

      <VCardText>
        <VAlert v-if="error" type="error" variant="tonal" density="compact" class="mb-4">
          {{ error }}
        </VAlert>

        <VForm @submit.prevent="handleSubmit">
          <VRow>
            <!-- Name -->
            <VCol cols="12">
              <AppTextField v-model="form.name" label="Name"
                :rules="[(value: unknown) => (typeof value === 'string' && value.trim().length > 0) || 'This field is required']"
                :error-messages="errors.name" autofocus />
            </VCol>

            <!-- Target URL -->
            <VCol cols="12">
              <AppTextField v-model="form.targetUrl" label="Target URL"
                placeholder="https://your-app.example.com/hook or /api/integrations/gateway/_upstream/echo"
                hint="Absolute https URL or a same-origin path (mock upstream echo)" :error-messages="errors.targetUrl"
                persistent-hint />
            </VCol>

            <!-- Events -->
            <VCol cols="12">
              <div class="text-subtitle-2 mb-2">
                {{ "Events" }}
              </div>
              <div class="d-flex flex-wrap gap-3">
                <VCheckbox v-for="event in WEBHOOK_EVENTS" :key="event" :model-value="form.events" :value="event"
                  :label="event" @update:model-value="form.events = $event as string[]" />
              </div>
            </VCol>

            <!-- Status -->
            <VCol cols="12" class="d-flex align-center">
              <VSwitch v-model="form.status" true-value="active" false-value="inactive" color="success"
                label="Status" />
              <VChip size="small" :color="form.status === 'active' ? 'success' : 'secondary'" variant="tonal" label
                class="ms-3">
                {{ form.status === 'active' ? 'Active' : 'Inactive' }}
              </VChip>
            </VCol>

            <!-- Regenerate secret (edit only) -->
            <VCol v-if="webhook" cols="12">
              <VCheckbox v-model="form.regenerateSecret" label="Regenerate secret (previous one stops working)" />
            </VCol>

            <!-- Rate limit -->
            <VCol cols="12">
              <VCheckbox v-model="form.rateLimitEnabled" label="Rate Limit" />
              <VRow v-if="form.rateLimitEnabled">
                <VCol cols="6">
                  <AppTextField v-model.number="form.rateLimit" type="number" min="1" label="Requests / window" />
                </VCol>
                <VCol cols="6">
                  <AppTextField v-model.number="form.rateWindow" type="number" min="1" label="Window (seconds)" />
                </VCol>
              </VRow>
            </VCol>

            <!-- IP allowlist -->
            <VCol cols="12">
              <VTextarea v-model="form.ipAllowlist" label="IP allowlist (optional)"
                hint="One IP per line. Empty = allow all." rows="2" persistent-hint />
            </VCol>

            <!-- Timeout -->
            <VCol cols="12">
              <AppTextField v-model.number="form.timeoutMs" type="number" min="1000" step="1000" label="Timeout"
                suffix="ms" />
            </VCol>
          </VRow>
        </VForm>
      </VCardText>

      <VCardActions class="px-6 pb-4">
        <VSpacer />
        <VBtn variant="tonal" color="secondary" :disabled="saving" @click="emit('update:modelValue', false)">
          {{ "Cancel" }}
        </VBtn>
        <VBtn color="primary" :loading="saving" @click="handleSubmit">
          {{ webhook ? "Save" : "Create" }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
