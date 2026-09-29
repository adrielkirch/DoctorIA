<script setup lang="ts">
import type { GatewayRoute, HttpMethod } from 'contracts/types/gateway';
import { computed, ref, watch } from 'vue';
import { GATEWAY_HTTP_METHODS, GATEWAY_ROUTE_ROLES } from './constants';
import { useGatewayCredentials } from './useGatewayCredentials';

const props = defineProps<{
  modelValue: boolean
  route?: GatewayRoute | null
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  submit: [payload: Partial<GatewayRoute>]
}>()

const { credentials, credentialsLoading } = useGatewayCredentials()

const method = ref<HttpMethod>('GET')
const path = ref('')
const mode = ref<'MOCK' | 'PROXY'>('MOCK')
const mockPayload = ref('{\n  \n}')
const mockStatusCode = ref(200)
const mockLatencyMs = ref(0)
const upstreamUrl = ref('')
const credentialId = ref<number | string>('')
const authHeader = ref('')
const authScheme = ref('')
const requestTransform = ref('')
const responseTransform = ref('')
const requestSchemaText = ref('')
const responseSchemaText = ref('')
const rateLimitLimit = ref<number | null>(null)
const rateLimitWindowSec = ref<number | null>(null)
const description = ref('')
const isPublic = ref(false)
const requiredRole = ref<'ALL' | 'USER' | 'ADMIN'>('USER')

const payloadError = ref('')
const schemaError = ref('')
const isMock = computed(() => mode.value === 'MOCK')

watch(
  () => props.route,
  r => {
    method.value = r?.method ?? 'GET'
    path.value = r?.path ?? ''
    mode.value = r?.mode ?? 'MOCK'
    mockPayload.value = r?.mockPayload ?? '{\n  \n}'
    mockStatusCode.value = r?.mockStatusCode ?? 200
    mockLatencyMs.value = r?.mockLatencyMs ?? 0
    upstreamUrl.value = r?.upstreamUrl ?? ''
    credentialId.value = r?.credentialId ?? ''
    authHeader.value = r?.authHeader ?? ''
    authScheme.value = r?.authScheme ?? ''
    requestTransform.value = r?.requestTransform ?? ''
    responseTransform.value = r?.responseTransform ?? ''
    requestSchemaText.value = r?.requestSchema ? JSON.stringify(r.requestSchema, null, 2) : ''
    responseSchemaText.value = r?.responseSchema ? JSON.stringify(r.responseSchema, null, 2) : ''
    rateLimitLimit.value = r?.rateLimit?.limit ?? null
    rateLimitWindowSec.value = r?.rateLimit?.windowSec ?? null
    description.value = r?.description ?? ''
    isPublic.value = r?.isPublic ?? false
    requiredRole.value = r?.requiredRole ?? 'USER'
    payloadError.value = ''
  },
)

function parseSchema(text: string): object | undefined {
  const trimmed = text.trim()
  if (!trimmed)
    return undefined
  const parsed = JSON.parse(trimmed)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
    throw new Error("must be a JSON Schema object")

  return parsed
}

function validatePayload() {
  if (!isMock.value) {
    payloadError.value = ''
    schemaError.value = ''

    return true
  }
  try {
    JSON.parse(mockPayload.value)
    payloadError.value = ''

    return true
  }
  catch {
    payloadError.value = "Must be valid JSON"

    return false
  }
}

function validateSchemas() {
  schemaError.value = ''
  try {
    parseSchema(requestSchemaText.value)
    parseSchema(responseSchemaText.value)
  }
  catch (err: unknown) {
    schemaError.value = (err as Error).message

    return false
  }

  return true
}

function handleSubmit() {
  if (!path.value.trim() || !method.value)
    return
  if (!validatePayload() || !validateSchemas())
    return
  emit('submit', {
    method: method.value,
    path: path.value.trim(),
    mode: mode.value,
    mockPayload: isMock.value ? mockPayload.value : undefined,
    mockStatusCode: isMock.value ? mockStatusCode.value : undefined,
    mockLatencyMs: isMock.value ? mockLatencyMs.value : undefined,
    upstreamUrl: !isMock.value ? upstreamUrl.value : undefined,
    credentialId: credentialId.value ? String(credentialId.value) : undefined,
    authHeader: authHeader.value.trim() || undefined,
    authScheme: authScheme.value.trim() || undefined,
    requestTransform: requestTransform.value.trim() || undefined,
    responseTransform: responseTransform.value.trim() || undefined,
    requestSchema: parseSchema(requestSchemaText.value),
    responseSchema: parseSchema(responseSchemaText.value),
    rateLimit: rateLimitLimit.value && rateLimitWindowSec.value
      ? { limit: rateLimitLimit.value, windowSec: rateLimitWindowSec.value }
      : null,
    description: description.value.trim(),
    isPublic: isPublic.value,
    requiredRole: isPublic.value ? 'ALL' : requiredRole.value,
  })
  emit('update:modelValue', false)
}
</script>

<template>
  <VDialog :model-value="props.modelValue" max-width="560" scrollable
    @update:model-value="emit('update:modelValue', $event)">
    <VCard :title="props.route ? 'Edit Route' : 'New Route'">
      <VCardText class="d-flex flex-column gap-4 pt-4">
        <!-- Method + Path row -->
        <div class="d-flex gap-3 align-start">
          <VSelect v-model="method" :items="GATEWAY_HTTP_METHODS" label="Method" :style="{ maxInlineSize: '130px' }"
            :disabled="!!props.route" density="compact" />
          <VTextField v-model="path" label="Path" placeholder="/v1/payments" :disabled="!!props.route" :rules="[
            (value) => !!value || 'This field is required',
            (value) => value.startsWith('/') || 'Must start with /',
          ]" density="compact" class="flex-grow-1" />
        </div>

        <!-- Mode toggle -->
        <div>
          <div class="text-caption text-medium-emphasis mb-1">
            {{ "Mode" }}
          </div>
          <VBtnToggle v-model="mode" mandatory density="compact" color="primary">
            <VBtn value="MOCK">
              MOCK
            </VBtn>
            <VBtn value="PROXY">
              PROXY
            </VBtn>
          </VBtnToggle>
        </div>

        <!-- MOCK fields -->
        <template v-if="isMock">
          <VTextarea v-model="mockPayload" label="Response Payload (JSON)" :error-messages="payloadError" rows="5"
            font-family="monospace" @blur="validatePayload" />
          <div class="d-flex gap-3">
            <VTextField v-model.number="mockStatusCode" label="Status Code" type="number" min="100" max="599"
              :style="{ maxInlineSize: '130px' }" density="compact" />
            <VTextField v-model.number="mockLatencyMs" label="Latency (ms)" type="number" min="0" max="10000"
              hint="0–10000ms" density="compact" />
          </div>
        </template>

        <!-- PROXY fields -->
        <template v-else>
          <VTextField v-model="upstreamUrl" label="Upstream URL"
            placeholder="https://api.example.com/v1/payments or /api/integrations/gateway/_upstream/..."
            hint="Optional if the namespace has a Base URL. Use :param tokens to map path params." persistent-hint />

          <div class="border rounded pa-3 d-flex flex-column gap-3">
            <div class="text-caption text-medium-emphasis font-weight-medium">
              {{ "Upstream Authentication" }}
            </div>
            <VSelect v-model="credentialId" :items="credentials" item-title="key" item-value="id" label="Credential"
              clearable density="compact" :loading="credentialsLoading"
              hint="Injected by the gateway when proxying; never exposed to end users" persistent-hint />
            <div class="d-flex gap-3">
              <VTextField v-model="authHeader" label="Auth header" placeholder="Authorization"
                hint="Defaults to Authorization" persistent-hint density="compact" />
              <VTextField v-model="authScheme" label="Auth scheme" placeholder="Bearer" hint="Empty = raw value"
                persistent-hint density="compact" />
            </div>
          </div>

          <div class="border rounded pa-3 d-flex flex-column gap-3">
            <div class="text-caption text-medium-emphasis font-weight-medium">
              {{ "Transformations (JSONata)" }}
            </div>
            <VTextarea v-model="requestTransform" label="Request transform"
              placeholder="{&quot;customer&quot;: $.name, &quot;total&quot;: $.amount}" rows="2" density="compact"
              font-family="monospace"
              hint="Applied to the client body before forwarding. Env: $params, $query, $headers" persistent-hint />
            <VTextarea v-model="responseTransform" label="Response transform"
              placeholder="{&quot;id&quot;: $.id, &quot;name&quot;: $.name}" rows="2" density="compact"
              font-family="monospace" hint="Normalizes the upstream body for the client contract" persistent-hint />
            <VTextarea v-model="requestSchemaText" label="Request Schema (JSON Schema)"
              placeholder="{&quot;type&quot;: &quot;object&quot;, &quot;required&quot;: [&quot;name&quot;], &quot;properties&quot;: {&quot;name&quot;: {&quot;type&quot;: &quot;string&quot;}}}"
              rows="3" density="compact" font-family="monospace"
              hint="Optional — tells agents (LangGraph/Claude) how to build the body" persistent-hint />
            <VTextarea v-model="responseSchemaText" label="Response Schema (JSON Schema)"
              placeholder="{&quot;type&quot;: &quot;object&quot;, &quot;properties&quot;: {&quot;id&quot;: {&quot;type&quot;: &quot;integer&quot;}}}"
              rows="3" density="compact" font-family="monospace"
              hint="Optional — inferred from the mock payload when left empty" persistent-hint />
            <VAlert v-if="schemaError" type="error" density="compact">
              {{ schemaError }}
            </VAlert>
          </div>

          <div class="border rounded pa-3 d-flex flex-column gap-3">
            <div class="text-caption text-medium-emphasis font-weight-medium">
              {{ "Rate Limit" }}
            </div>
            <div class="d-flex gap-3">
              <VTextField v-model.number="rateLimitLimit" label="Requests / window" type="number" min="1"
                density="compact" placeholder="e.g. 100" />
              <VTextField v-model.number="rateLimitWindowSec" label="Window (seconds)" type="number" min="1"
                density="compact" placeholder="e.g. 60" />
            </div>
          </div>
        </template>

        <VTextField v-model="description" label="Description" placeholder="Optional description" />

        <!-- Access control -->
        <div class="border rounded pa-3 d-flex flex-column gap-3">
          <div class="text-caption text-medium-emphasis font-weight-medium">
            {{ "Access Control" }}
          </div>
          <VSwitch v-model="isPublic" label="Public route (bypasses JWT validation entirely)" color="success"
            density="compact" hide-details />
          <VSelect v-model="requiredRole" :items="GATEWAY_ROUTE_ROLES" label="Required Role" :disabled="isPublic"
            density="compact" hint="ALL = any valid JWT. USER/ADMIN = specific role required. Public = no JWT needed."
            persistent-hint />
        </div>
      </VCardText>

      <VCardActions class="px-6 pb-4">
        <VSpacer />
        <VBtn variant="text" @click="emit('update:modelValue', false)">
          {{ "Cancel" }}
        </VBtn>
        <VBtn color="primary" :disabled="!path || !method" @click="handleSubmit">
          {{ props.route ? "Save" : "Create" }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
