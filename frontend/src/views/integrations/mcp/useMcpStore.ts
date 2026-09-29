import { $api } from '@/utils/api'
import type { CapabilityGrantRequestPayload, ConnectRequestPayload, McpConnectedResponse, McpConnection, McpProviderDefinition, McpStoreResponse, PublishProviderRequestPayload, RevalidateRequestPayload } from 'contracts/integrations/mcp/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useMcpStore = defineStore('mcp', () => {
  const providers = ref<McpProviderDefinition[]>([])
  const connections = ref<McpConnection[]>([])
  const isLoading = ref(false)
  const errorMessage = ref<string | null>(null)
  const searchQuery = ref('')
  const selectedCategory = ref('')
  const selectedTrustTier = ref('')
  const selectedProviderStatus = ref('')
  const selectedConnectionStatus = ref('')
  const selectedConnectionHealth = ref('')
  const storePage = ref(1)
  const storePageSize = ref(20)
  const connectedPage = ref(1)
  const connectedPageSize = ref(20)
  const storeTotal = ref(0)
  const connectedTotal = ref(0)
  const storeTotalPages = ref(1)
  const connectedTotalPages = ref(1)


  const hasStoreMore = computed(() => storePage.value < storeTotalPages.value)
  const hasConnectedMore = computed(() => connectedPage.value < connectedTotalPages.value)
  const availableCategories = ref<string[]>([])
  const availableTrustTiers = ref<string[]>([])
  const availableProviderStatuses = ref<string[]>([])
  const availableConnectionStatuses = ref<string[]>([])
  const availableConnectionHealthStates = ref<string[]>([])
  const isEmptyStore = computed(() => !isLoading.value && providers.value.length === 0)
  const isEmptyConnected = computed(() => !isLoading.value && connections.value.length === 0)


  const actorRole = ref<string>('admin')
  const canConnect = computed(() => ['admin'].includes(actorRole.value))
  const canPublish = computed(() => ['admin', 'product-ops'].includes(actorRole.value))
  const canManageGrants = computed(() => ['admin'].includes(actorRole.value))

  async function fetchStoreCatalog(): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
      const params = new URLSearchParams()
      if (searchQuery.value.trim())
        params.set('q', searchQuery.value.trim())
      if (selectedCategory.value)
        params.set('category', selectedCategory.value)
      if (selectedTrustTier.value)
        params.set('trustTier', selectedTrustTier.value)
      if (selectedProviderStatus.value)
        params.set('status', selectedProviderStatus.value)
      params.set('page', String(storePage.value))
      params.set('itemsPerPage', String(storePageSize.value))

      const response = await $api<McpStoreResponse>(`/integrations/mcp/store?${params.toString()}`)

      providers.value = response.providers
      storeTotal.value = response.totalProviders
      storeTotalPages.value = response.totalPages
      availableCategories.value = response.filters.categories
      availableTrustTiers.value = response.filters.trustTiers
      availableProviderStatuses.value = response.filters.statuses
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to load MCP store'
    }
    finally {
      isLoading.value = false
    }
  }

  async function fetchConnectedServers(): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
      const params = new URLSearchParams()
      if (searchQuery.value.trim())
        params.set('q', searchQuery.value.trim())
      if (selectedConnectionStatus.value)
        params.set('status', selectedConnectionStatus.value)
      if (selectedConnectionHealth.value)
        params.set('health', selectedConnectionHealth.value)
      params.set('page', String(connectedPage.value))
      params.set('itemsPerPage', String(connectedPageSize.value))

      const response = await $api<McpConnectedResponse>(`/integrations/mcp/connected?${params.toString()}`)

      connections.value = response.connections
      connectedTotal.value = response.totalConnections
      connectedTotalPages.value = response.totalPages
      availableConnectionStatuses.value = response.filters.statuses
      availableConnectionHealthStates.value = response.filters.healthStates
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to load connected MCP records'
    }
    finally {
      isLoading.value = false
    }
  }

  async function fetchProviderDetails(slug: string): Promise<McpProviderDefinition | null> {
    try {
      const response = await $api<{ provider: McpProviderDefinition }>(`/integrations/mcp/providers/${slug}`)

      return response.provider
    }
    catch {
      return null
    }
  }

  async function connectProvider(payload: ConnectRequestPayload): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
      await $api('/integrations/mcp/connect', { method: 'POST', body: payload })
      await fetchConnectedServers()
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to connect provider'
    }
    finally {
      isLoading.value = false
    }
  }

  async function revalidateConnection(connectionId: string, payload: RevalidateRequestPayload = {}): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
      await $api(`/integrations/mcp/connections/${connectionId}/revalidate`, { method: 'POST', body: payload })
      await fetchConnectedServers()
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to revalidate connection'
    }
    finally {
      isLoading.value = false
    }
  }

  async function updateCapabilityGrants(connectionId: string, payload: CapabilityGrantRequestPayload): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
      await $api(`/integrations/mcp/connections/${connectionId}/capability-grants`, { method: 'PATCH', body: payload })
      await fetchConnectedServers()
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to update capability grants'
    }
    finally {
      isLoading.value = false
    }
  }

  async function publishProvider(payload: PublishProviderRequestPayload): Promise<void> {
    isLoading.value = true
    errorMessage.value = null
    try {
      await $api('/integrations/mcp/providers', { method: 'POST', body: payload })
      await fetchStoreCatalog()
    }
    catch (error) {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to publish provider'
    }
    finally {
      isLoading.value = false
    }
  }

  return {
    providers, connections, isLoading, errorMessage, searchQuery, selectedCategory, selectedTrustTier, selectedProviderStatus, selectedConnectionStatus, selectedConnectionHealth, storePage, storePageSize, connectedPage, connectedPageSize, storeTotal, connectedTotal, hasStoreMore, hasConnectedMore, availableCategories, availableTrustTiers, availableProviderStatuses, availableConnectionStatuses, availableConnectionHealthStates, isEmptyStore, isEmptyConnected, actorRole, canConnect, canPublish, canManageGrants, fetchStoreCatalog, fetchConnectedServers, fetchProviderDetails, connectProvider, revalidateConnection, updateCapabilityGrants, publishProvider,
  }
})

export type McpStore = ReturnType<typeof useMcpStore>
