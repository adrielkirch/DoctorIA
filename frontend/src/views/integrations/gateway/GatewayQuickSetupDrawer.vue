<script setup lang="ts">
import type { GatewayNamespace } from 'contracts/types/gateway';
import { computed, ref } from 'vue';
import { gatewayErrorMessage } from './gatewayErrorKey';
import { useGatewayStore } from './useGatewayStore';

const props = defineProps<{
  modelValue: boolean
  namespaces: GatewayNamespace[]
  defaultNamespaceId?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  provisioned: []
}>()

const store = useGatewayStore()
const rawInput = ref('')
const selectedNamespaceId = ref(props.defaultNamespaceId ?? '')
const provisionError = ref('')
const provisionSuccess = ref(false)

const hasApproved = computed(() =>
  store.extractionProposals.some(p => p.approvalStatus === 'approved'),
)

const approvedCount = computed(() =>
  store.extractionProposals.filter(p => p.approvalStatus === 'approved').length,
)

const steps = computed(() => [
  { title: "Paste docs", icon: 'bx-paste' },
  { title: "Review", icon: 'bx-list-check' },
  { title: "Provision", icon: 'bx-rocket' },
])

const activeStep = computed(() => {
  if (store.extractionProposals.length === 0)
    return 1
  if (hasApproved.value)
    return 3

  return 2
})

const exampleInputs = computed(() => [
  {
    label: "OpenAPI",
    value: `openapi: 3.0.0
info:
  title: Shipping API
  version: 1.0.0
paths:
  /v1/quotes:
    post:
      summary: Create a shipping quote
  /v1/shipments/{id}:
    get:
      summary: Get shipment status`,
  },
  {
    label: "cURL",
    value: `curl -X POST https://api.example.com/v1/orders \\
  -H "Content-Type: application/json" \\
  -d '{"amount": 1990, "currency": "BRL"}'`,
  },
  {
    label: "Plain text",
    value: `POST /v1/payments - Create a payment
GET /v1/payments/:id - Fetch payment details
DELETE /v1/payments/:id - Cancel a payment`,
  },
])

function applyExample(value: string) {
  rawInput.value = value
}

async function handleExtract() {
  if (!rawInput.value.trim())
    return
  provisionSuccess.value = false
  provisionError.value = ''
  await store.submitExtraction(
    rawInput.value,
    selectedNamespaceId.value || undefined,
  )
}

async function handleProvision() {
  if (!selectedNamespaceId.value) {
    provisionError.value = "Select a namespace first"

    return
  }
  provisionError.value = ''
  try {
    const result = await store.confirmProvisioning(selectedNamespaceId.value)
    if (result) {
      provisionSuccess.value = true
      emit('provisioned')
      setTimeout(() => emit('update:modelValue', false), 1500)
    }
  }
  catch (err: unknown) {
    provisionError.value = gatewayErrorMessage(err)
  }
}

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <VNavigationDrawer :model-value="props.modelValue" location="right" width="520" temporary
    @update:model-value="emit('update:modelValue', $event)">
    <div class="d-flex flex-column h-100 qs-drawer">
      <!-- Header -->
      <div class="d-flex align-center gap-2 px-4 py-3 border-b">
        <VIcon icon="bx-brain" color="primary" />
        <span class="text-h6 flex-grow-1">{{ "AI Quick Setup" }}</span>
        <VChip size="x-small" color="primary" variant="tonal" label>
          {{ "Beta" }}
        </VChip>
        <VBtn icon="bx-x" variant="text" size="small" @click="close" />
      </div>

      <!-- Scrollable body -->
      <div class="flex-grow-1 overflow-y-auto pa-4">
        <!-- Stepper -->
        <div class="mb-4">
          <div class="text-body-1 font-weight-semibold">
            {{ "From docs to routes in minutes" }}
          </div>
          <div class="text-caption text-medium-emphasis mb-3">
            {{ "Our AI extracts endpoints, methods and schemas from your documentation." }}
          </div>

          <div class="d-flex align-center">
            <template v-for="(step, i) in steps" :key="step.title">
              <div class="qs-drawer__step d-flex flex-column align-center">
                <VAvatar size="30" :color="activeStep >= i + 1 ? 'primary' : undefined"
                  :variant="activeStep >= i + 1 ? 'flat' : 'tonal'">
                  <VIcon :icon="step.icon" size="16" :color="activeStep >= i + 1 ? 'white' : 'medium-emphasis'" />
                </VAvatar>
                <span class="qs-drawer__step-title text-caption mt-1"
                  :class="{ 'qs-drawer__step-title--active': activeStep >= i + 1 }">
                  {{ step.title }}
                </span>
              </div>
              <div v-if="i < steps.length - 1" class="qs-drawer__step-line flex-grow-1 mx-2"
                :class="{ 'qs-drawer__step-line--active': activeStep > i + 1 }" />
            </template>
          </div>
        </div>

        <!-- Input area -->
        <VTextarea v-model="rawInput" label="Paste documentation"
          placeholder="Paste cURL commands, OpenAPI YAML/JSON, or plain text describing API endpoints..." rows="6"
          auto-grow :disabled="store.extractionLoading" class="mb-2" />

        <div class="d-flex align-center gap-2 flex-wrap mb-3">
          <span class="text-caption text-medium-emphasis">
            {{ "Try an example:" }}
          </span>
          <VChip v-for="example in exampleInputs" :key="example.label" size="x-small" variant="tonal" color="primary"
            @click="applyExample(example.value)">
            {{ example.label }}
          </VChip>
        </div>

        <VBtn color="primary" :loading="store.extractionLoading" :disabled="!rawInput.trim()" block
          prepend-icon="bx-bot" @click="handleExtract">
          {{ "Extract Routes" }}
        </VBtn>

        <!-- AI processing feedback -->
        <div v-if="store.extractionLoading" class="mt-4">
          <div class="d-flex align-center gap-2 mb-2">
            <VIcon icon="bx-loader-alt" size="18" color="primary" class="qs-drawer__spin" />
            <span class="text-body-2 font-weight-medium">
              {{ "AI is analyzing your documentation…" }}
            </span>
          </div>
          <VSkeletonLoader v-for="i in 2" :key="i" type="list-item-two-line" class="mb-2" />
        </div>

        <VAlert v-if="store.extractionError" type="error" class="mt-3" density="compact">
          {{ gatewayErrorMessage(store.extractionError) }}
        </VAlert>

        <!-- Proposals -->
        <div v-if="store.visibleProposals.length > 0" class="mt-4">
          <div class="d-flex align-center mb-2">
            <span class="text-body-2 font-weight-semibold">
              {{ "Extracted Routes" }}
            </span>
            <VChip size="x-small" class="ms-2" color="primary" variant="tonal">
              {{ store.visibleProposals.length }} /
              {{ store.extractionProposals.length }}
            </VChip>
          </div>

          <TransitionGroup name="proposal" tag="div" class="d-flex flex-column gap-2">
            <VCard v-for="proposal in store.visibleProposals" :key="proposal.id" variant="outlined" :color="proposal.approvalStatus === 'approved'
                ? 'success'
                : proposal.approvalStatus === 'rejected'
                  ? 'error'
                  : undefined
              " class="pa-3">
              <div class="d-flex align-center gap-2 mb-1">
                <VChip size="x-small" :color="proposal.method === 'GET'
                    ? 'success'
                    : proposal.method === 'POST'
                      ? 'primary'
                      : proposal.method === 'DELETE'
                        ? 'error'
                        : 'warning'
                  " label variant="tonal">
                  {{ proposal.method }}
                </VChip>
                <span class="font-mono text-body-2">{{ proposal.path || "(path needed)" }}</span>

                <VSpacer />

                <VIcon v-if="proposal.unresolvedReason" icon="bx-error" color="warning" size="16"
                  :title="proposal.unresolvedReason" />
                <VIcon v-else-if="proposal.approvalStatus === 'approved'" icon="bx-check" color="success" size="16" />
              </div>

              <div v-if="proposal.description" class="text-caption text-medium-emphasis mb-1">
                {{ proposal.description }}
              </div>

              <div v-if="proposal.unresolvedReason" class="text-caption text-warning mb-2">
                {{ proposal.unresolvedReason }}
              </div>

              <div class="d-flex justify-end gap-1 mt-2">
                <VBtn size="x-small" variant="tonal" color="error" :disabled="proposal.approvalStatus === 'rejected'"
                  @click="store.rejectProposal(proposal.id)">
                  {{ "Reject" }}
                </VBtn>
                <VBtn size="x-small" variant="tonal" color="success" :disabled="!!proposal.unresolvedReason
                  || proposal.approvalStatus === 'approved'
                  " @click="store.approveProposal(proposal.id)">
                  {{ "Approve" }}
                </VBtn>
              </div>
            </VCard>
          </TransitionGroup>
        </div>
      </div>

      <!-- Footer -->
      <div v-if="store.extractionProposals.length > 0" class="pa-4 border-t qs-drawer__footer">
        <VSelect v-model="selectedNamespaceId" :items="props.namespaces" item-title="displayName" item-value="id"
          label="Provision into namespace" density="compact" class="mb-3" />

        <VAlert v-if="provisionError" type="error" density="compact" class="mb-3">
          {{ provisionError }}
        </VAlert>

        <VAlert v-if="provisionSuccess" type="success" density="compact" class="mb-3">
          {{ "Routes provisioned successfully!" }}
        </VAlert>

        <VBtn color="primary" block :disabled="!hasApproved || !selectedNamespaceId" @click="handleProvision">
          <VIcon icon="bx-rocket" size="18" class="me-2" />
          {{ ("Provision " + String(approvedCount) + " routes") }}
        </VBtn>
      </div>
    </div>
  </VNavigationDrawer>
</template>

<style scoped>
.qs-drawer__step-title {
  color: rgb(var(--v-theme-on-surface-variant));
}

.qs-drawer__step-title--active {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.qs-drawer__step-line {
  block-size: 2px;
  border-radius: 2px;
  background: rgba(var(--v-theme-primary), 0.15);
  margin-block-start: 14px;
  transition: background 0.3s ease;
}

.qs-drawer__step-line--active {
  background: rgb(var(--v-theme-primary));
}

.qs-drawer__footer {
  background: rgb(var(--v-theme-surface));
}

.qs-drawer__spin {
  animation: qs-drawer-spin 1s linear infinite;
}

@keyframes qs-drawer-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.proposal-enter-active {
  transition: all 0.25s ease;
}

.proposal-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
