<script setup lang="ts">
import McpCapabilityGrantDialog from '@/views/integrations/mcp/McpCapabilityGrantDialog.vue'
import McpConnectDialog from '@/views/integrations/mcp/McpConnectDialog.vue'
import McpConnectedPanel from '@/views/integrations/mcp/McpConnectedPanel.vue'
import McpStorePanel from '@/views/integrations/mcp/McpStorePanel.vue'
import { mcpErrorMessage } from '@/views/integrations/mcp/mcpErrorKey'
import { useMcpStore } from '@/views/integrations/mcp/useMcpStore'
import type { McpConnection, McpProviderDefinition } from 'contracts/integrations/mcp/types'

const store = useMcpStore()
const activeTab = ref<'store' | 'connected'>('store')
const connectDialogOpen = ref(false)
const selectedProvider = ref<McpProviderDefinition | null>(null)
const grantDialogOpen = ref(false)
const selectedConnection = ref<McpConnection | null>(null)
const selectedConnectionCapabilities = ref<string[]>([])

function openConnectDialog(provider: McpProviderDefinition) {
  selectedProvider.value = provider
  connectDialogOpen.value = true
}
function onConnected() {
  connectDialogOpen.value = false
  activeTab.value = 'connected'
  store.fetchConnectedServers()
}
function onSearchInput() {
  activeTab.value === 'store'
    ? store.fetchStoreCatalog()
    : store.fetchConnectedServers()
}
function onManage(connection: McpConnection) {
  const provider = store.providers.find(
    p => p.slug === connection.providerSlug,
  )

  selectedConnection.value = connection
  selectedConnectionCapabilities.value = provider?.capabilities ?? []
  grantDialogOpen.value = true
}
function onGranted() {
  store.fetchConnectedServers()
}
</script>

<template>
  <div>
    <div class="d-flex align-center flex-wrap gap-3 mb-6">
      <div class="d-flex align-center gap-2 flex-grow-1">
        <VIcon icon="bx-server" color="primary" size="28" />
        <h1 class="text-h5 font-weight-bold mb-0">
          {{ "MCP Integration Hub" }}
        </h1>
      </div>
      <!-- pill toggle: no scroll, no VBtnToggle quirks -->
      <div class="mcp-tab-toggle">
        <button class="mcp-tab-btn" :class="{ active: activeTab === 'store' }" @click="activeTab = 'store'">
          <VIcon icon="bx-store" size="16" class="me-1" />{{ "Store" }}
        </button>
        <button class="mcp-tab-btn" :class="{ active: activeTab === 'connected' }" @click="activeTab = 'connected'">
          <VIcon icon="bx-link" size="16" class="me-1" />{{ "Connected" }}
        </button>
      </div>
    </div>
    <VAlert v-if="store.errorMessage" type="error" variant="tonal" closable class="mb-4"
      @click:close="store.errorMessage = null">
      {{ mcpErrorMessage(store.errorMessage) }}
    </VAlert>
    <McpStorePanel v-if="activeTab === 'store'" @connect="openConnectDialog" />
    <McpConnectedPanel v-else @manage="onManage" />
    <McpConnectDialog v-model="connectDialogOpen" :provider="selectedProvider" @connected="onConnected" />
    <McpCapabilityGrantDialog v-model="grantDialogOpen" :connection="selectedConnection"
      :provider-capabilities="selectedConnectionCapabilities" :existing-grant="null" @granted="onGranted" />
  </div>
</template>

<style scoped>
.mcp-tab-toggle {
  display: inline-flex;
  background: rgb(var(--v-theme-surface-variant));
  border-radius: 999px;
  padding: 3px;
  gap: 2px;
}

.mcp-tab-btn {
  display: inline-flex;
  align-items: center;
  padding: 6px 18px;
  border-radius: 999px;
  border: none;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  background: transparent;
  color: rgb(var(--v-theme-on-surface-variant));
  transition: background 0.15s, color 0.15s, box-shadow 0.15s;
  white-space: nowrap;
  line-height: 1.4;
}

.mcp-tab-btn.active {
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
}
</style>
