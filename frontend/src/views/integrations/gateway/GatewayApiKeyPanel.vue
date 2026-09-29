<script setup lang="ts">
import { $api } from "@/utils/api";
import type {
  GatewayApiKey,
  GatewayInvocationLog,
} from "contracts/types/gateway";
import { onMounted, ref, watch } from "vue";
import { gatewayErrorMessage } from "./gatewayErrorKey";

const props = defineProps<{
  namespaceId: string;
}>();

const apiKeys = ref<GatewayApiKey[]>([]);
const invocations = ref<GatewayInvocationLog[]>([]);
const loading = ref(false);
const newKeyName = ref("");
const createdKey = ref<string | null>(null);
const error = ref("");
const showToolSpecs = ref(false);
const toolSpecs = ref<unknown[]>([]);
const toolSpecsLoading = ref(false);

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const [keyRes, invRes] = await Promise.all([
      $api<{ apiKeys: GatewayApiKey[] }>(
        `/integrations/gateway/namespaces/${props.namespaceId}/api-keys`,
      ),
      $api<{ invocations: GatewayInvocationLog[] }>(
        `/integrations/gateway/namespaces/${props.namespaceId}/invocations?itemsPerPage=8`,
      ),
    ]);

    apiKeys.value = keyRes.apiKeys;
    invocations.value = invRes.invocations;
  } catch (err: unknown) {
    error.value = gatewayErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

async function createKey() {
  if (!newKeyName.value.trim()) return;
  error.value = "";
  createdKey.value = null;
  try {
    const res = await $api<{ apiKey: GatewayApiKey & { key: string } }>(
      `/integrations/gateway/namespaces/${props.namespaceId}/api-keys`,
      { method: "POST", body: { name: newKeyName.value } },
    );

    createdKey.value = res.apiKey.key;
    newKeyName.value = "";
    await load();
  } catch (err: unknown) {
    error.value = gatewayErrorMessage(err);
  }
}

async function revokeKey(key: GatewayApiKey) {
  if (!confirm(("Revoke API key \"" + String(key.name) + "\"?"))) return;
  error.value = "";
  try {
    await $api(
      `/integrations/gateway/namespaces/${props.namespaceId}/api-keys/${key.id}`,
      {
        method: "DELETE",
      },
    );
    await load();
  } catch (err: unknown) {
    error.value = gatewayErrorMessage(err);
  }
}

async function loadToolSpecs() {
  toolSpecsLoading.value = true;
  try {
    const res = await $api<{ tools: unknown[] }>(
      `/integrations/gateway/namespaces/${props.namespaceId}/tool-specs`,
    );

    toolSpecs.value = res.tools;
    showToolSpecs.value = true;
  } catch (err: unknown) {
    error.value = gatewayErrorMessage(err);
  } finally {
    toolSpecsLoading.value = false;
  }
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString();
}

watch(
  () => props.namespaceId,
  () => {
    createdKey.value = null;
    load();
  },
);
onMounted(load);
</script>

<template>
  <VCard variant="outlined" class="mt-4">
    <VCardItem>
      <div class="d-flex align-center w-100">
        <div class="flex-grow-1">
          <VCardTitle class="text-subtitle-2">
            {{ "Consumer API Keys" }}
          </VCardTitle>
          <VCardSubtitle>
            {{ "Clients call private routes with x-api-key: gwk_…" }}
          </VCardSubtitle>
        </div>
        <VBtn size="small" variant="tonal" color="info" prepend-icon="bx-bot" :loading="toolSpecsLoading"
          @click="loadToolSpecs">
          {{ "Agent Tool Specs" }}
        </VBtn>
      </div>
    </VCardItem>

    <VCardText class="d-flex flex-column gap-3 pt-0">
      <VAlert v-if="error" type="error" density="compact" closable @click:close="error = ''">
        {{ error }}
      </VAlert>

      <VAlert v-if="createdKey" type="success" density="compact" closable @click:close="createdKey = null">
        {{ "Key created — copy it now, it won't be shown again:" }}
        <code class="font-mono">{{ createdKey }}</code>
      </VAlert>

      <!-- Key list -->
      <div v-if="apiKeys.length" class="d-flex flex-column gap-2">
        <div v-for="key in apiKeys" :key="key.id" class="d-flex align-center gap-2 pa-2 border rounded">
          <VIcon icon="bx-key" size="16" color="warning" />
          <div class="flex-grow-1">
            <div class="text-body-2 font-weight-medium">
              {{ key.name }}
            </div>
            <code class="text-caption text-medium-emphasis font-mono">{{
              key.maskedKey
            }}</code>
          </div>
          <VChip v-if="key.lastUsedAt" size="x-small" variant="tonal" label>
            {{ formatTime(key.lastUsedAt) }}
          </VChip>
          <VBtn size="x-small" variant="text" icon="bx-trash" color="error" @click="revokeKey(key)" />
        </div>
      </div>

      <div v-else-if="!loading" class="text-caption text-medium-emphasis">
        {{ "No API keys yet. Create one below to let external clients call this namespace." }}
      </div>

      <!-- Create key -->
      <div class="d-flex gap-2 align-center">
        <VTextField v-model="newKeyName" label="Key name" placeholder="e.g. Production CRM" density="compact"
          hide-details class="flex-grow-1" @keyup.enter="createKey" />
        <VBtn color="primary" size="small" :disabled="!newKeyName.trim()" @click="createKey">
          {{ "Create Key" }}
        </VBtn>
      </div>

      <VDivider />

      <!-- Recent activity -->
      <div>
        <div class="text-caption text-medium-emphasis font-weight-medium mb-2">
          {{ "Recent Activity" }}
        </div>
        <div v-if="invocations.length" class="d-flex flex-column gap-1">
          <div v-for="inv in invocations" :key="inv.id" class="d-flex align-center gap-2 text-caption">
            <VChip size="x-small" label variant="tonal" :color="inv.status < 400
              ? 'success'
              : inv.status < 500
                ? 'warning'
                : 'error'
              ">
              {{ inv.status }}
            </VChip>
            <code class="font-mono flex-grow-1">{{ inv.method }} {{ inv.path }}</code>
            <span class="text-medium-emphasis">{{
              formatTime(inv.timestamp)
            }}</span>
          </div>
        </div>
        <div v-else class="text-caption text-medium-emphasis">
          {{ "No invocations yet." }}
        </div>
      </div>
    </VCardText>
  </VCard>

  <!-- Agent tool specs dialog -->
  <VDialog v-model="showToolSpecs" max-width="760">
    <VCard>
      <VCardTitle>
        {{ "Agent Tool Specs" }}
      </VCardTitle>
      <VCardText>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Each spec follows the MCP/Anthropic tool format — bind them with bind_tools so LangGraph builds the request
          body from inputSchema.
        </p>
        <div v-if="toolSpecs.length" class="d-flex flex-column gap-3">
          <VCard v-for="tool in toolSpecs" :key="(tool as any).name" variant="outlined" class="pa-3">
            <div class="d-flex align-center gap-2 mb-1">
              <code class="font-mono text-body-2 font-weight-medium">{{
                (tool as any).name
              }}</code>
              <VChip size="x-small" label variant="tonal">
                {{ (tool as any).method }}
              </VChip>
              <VChip size="x-small" label variant="tonal" color="info">
                {{ "auth:" }} {{ (tool as any).auth }}
              </VChip>
            </div>
            <div class="text-caption text-medium-emphasis mb-2">
              {{ (tool as any).description }}
            </div>
            <pre class="tool-spec-pre text-caption font-mono rounded pa-2">{{
              JSON.stringify(
                {
                  inputSchema: (tool as any).inputSchema,
                  responseSchema: (tool as any).responseSchema,
                },
                null,
                2,
              )
            }}</pre>
          </VCard>
        </div>
        <div v-else class="text-center py-8 text-medium-emphasis">
          {{ "No enabled routes in this namespace yet." }}
        </div>
      </VCardText>
      <VCardActions class="px-6 pb-4">
        <VSpacer />
        <VBtn variant="text" @click="showToolSpecs = false">
          {{ "Close" }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.tool-spec-pre {
  overflow: auto;
  background: rgba(var(--v-theme-on-surface), 0.04);
  max-block-size: 220px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
