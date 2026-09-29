<script setup lang="ts">
import { computed } from 'vue'
import { GATEWAY_METHOD_COLORS } from './constants'
import { useGatewayStore } from './useGatewayStore'

const store = useGatewayStore()

const showBodyInput = computed(() =>
  ['POST', 'PUT', 'PATCH'].includes(store.invokerRoute?.method ?? ''),
)

const statusColor = computed(() => {
  const s = store.invokerStatusCode
  if (!s)
    return 'default'
  if (s < 300)
    return 'success'
  if (s < 400)
    return 'info'
  if (s < 500)
    return 'warning'

  return 'error'
})

const formattedResponse = computed(() => {
  if (!store.invokerResponse)
    return ''
  try {
    return JSON.stringify(store.invokerResponse, null, 2)
  }
  catch {
    return String(store.invokerResponse)
  }
})
</script>

<template>
  <VCard
    variant="outlined"
    class="mt-4"
  >
    <VCardItem>
      <VCardTitle class="text-subtitle-2">
          {{ "Route Invoker" }}
      </VCardTitle>
    </VCardItem>

    <VCardText class="d-flex flex-column gap-3 pt-0">
      <!-- Route selector -->
      <VSelect
        :model-value="store.invokerRoute"
        :items="store.routes.filter((r) => r.enabled)"
        :item-title="(r) => `${r.method} ${r.path}`"
        return-object
        label="Select route to invoke"
        density="compact"
        clearable
        @update:model-value="
          (v) => {
            store.invokerRoute = v;
            store.clearInvokerResponse();
          }
        "
      >
        <template #item="{ props: itemProps, item }">
          <VListItem v-bind="itemProps">
            <template #prepend>
              <VChip
                :color="
                  GATEWAY_METHOD_COLORS[
                    item.raw.method as keyof typeof GATEWAY_METHOD_COLORS
                  ]
                "
                size="x-small"
                label
                variant="tonal"
                class="me-2"
              >
                {{ item.raw.method }}
              </VChip>
            </template>
          </VListItem>
        </template>
      </VSelect>

      <!-- Request body (shown for POST/PUT/PATCH) -->
      <VTextarea
        v-if="showBodyInput"
        v-model="store.invokerRequestBody"
        label="Request body (JSON)"
        placeholder="{&quot;key&quot;: &quot;value&quot;}"
        rows="3"
        density="compact"
        font-family="monospace"
      />

      <div class="d-flex gap-2 align-center">
        <VBtn
          color="primary"
          size="small"
          :disabled="!store.invokerRoute"
          :loading="store.invokerLoading"
          prepend-icon="bx-send"
          @click="
            store.invokeRoute(store.invokerRoute!, store.invokerRequestBody)
          "
        >
          {{ "Invoke" }}
        </VBtn>
        <VBtn
          v-if="store.invokerResponse !== null"
          size="small"
          variant="text"
          color="secondary"
          @click="store.clearInvokerResponse"
        >
          {{ "Clear" }}
        </VBtn>
      </div>

      <!-- Response panel -->
      <template v-if="store.invokerResponse !== null || store.invokerLoading">
        <VDivider />

        <div class="d-flex align-center gap-3 flex-wrap">
          <VChip
            v-if="store.invokerStatusCode"
            :color="statusColor"
            size="small"
            label
            variant="tonal"
            class="font-weight-bold"
          >
            {{ store.invokerStatusCode }}
          </VChip>
          <span
            v-if="store.invokerElapsedMs !== null"
            class="text-caption text-medium-emphasis"
          >
            {{ store.invokerElapsedMs }}ms
          </span>
        </div>

        <pre
          v-if="formattedResponse"
          class="response-pre text-caption font-mono rounded pa-3"
        >{{ formattedResponse }}</pre>
      </template>
    </VCardText>
  </VCard>
</template>

<style scoped>
.response-pre {
  overflow: auto;
  background: rgba(var(--v-theme-on-surface), 0.04);
  max-block-size: 300px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
