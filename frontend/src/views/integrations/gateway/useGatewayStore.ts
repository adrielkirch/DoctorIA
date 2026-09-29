import { useAccessControlStore } from '@/stores/useAccessControlStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { $api } from '@/utils/api'
import type { CreateWebhookPayload, GatewayWebhookCreateResponse, GatewayWebhookUpdateResponse, UpdateWebhookPayload } from 'contracts/integrations/gateway/types'
import type { ExtractionJob, ExtractionProposal, GatewayNamespace, GatewayNamespaceListResponse, GatewayRoute, GatewayRouteListResponse, GatewayWebhook, GatewayWebhookDelivery, GatewayWebhookDeliveryListResponse, GatewayWebhookListResponse, QuickSetupConfirmResponse, QuickSetupResponse } from 'contracts/types/gateway'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

export const useGatewayStore = defineStore('gateway', () => {

  const namespaces = ref<GatewayNamespace[]>([])
  const selectedNamespace = ref<GatewayNamespace | null>(null)
  const namespacesLoading = ref(false)
  const namespacesError = ref<string | null>(null)
  const namespaceSearch = ref('')
  const namespacesTotal = ref(0)
  const namespacesPage = ref(1)
  const namespacesPageSize = ref(20)


  const routes = ref<GatewayRoute[]>([])
  const routesLoading = ref(false)
  const routesError = ref<string | null>(null)
  const routesTotal = ref(0)
  const routesPage = ref(1)
  const routesPageSize = ref(20)
  const routeMethodFilter = ref('')
  const routeModeFilter = ref('')


  const extractionJob = ref<ExtractionJob | null>(null)
  const extractionProposals = ref<ExtractionProposal[]>([])
  const visibleProposals = ref<ExtractionProposal[]>([])
  const extractionLoading = ref(false)
  const extractionError = ref<string | null>(null)


  const invokerRoute = ref<GatewayRoute | null>(null)
  const invokerRequestBody = ref('')
  const invokerResponse = ref<unknown>(null)
  const invokerStatusCode = ref<number | null>(null)
  const invokerElapsedMs = ref<number | null>(null)
  const invokerLoading = ref(false)


  const webhooks = ref<GatewayWebhook[]>([])
  const webhooksLoading = ref(false)
  const webhooksError = ref<string | null>(null)
  const deliveries = ref<GatewayWebhookDelivery[]>([])
  const deliveriesLoading = ref(false)
  const deliveriesError = ref<string | null>(null)

  const auth = useAuthStore()
  watch(
    () => auth.currentTenantId,
    () => {
      selectedNamespace.value = null
      routes.value = []
      routesTotal.value = 0
      routesPage.value = 1
      routeMethodFilter.value = ''
      routeModeFilter.value = ''
      namespaceSearch.value = ''
      namespacesPage.value = 1
      namespacesTotal.value = 0
      namespacesError.value = null
      extractionJob.value = null
      extractionProposals.value = []
      visibleProposals.value = []
      extractionError.value = null
      invokerRoute.value = null
      invokerResponse.value = null
      invokerStatusCode.value = null
      invokerElapsedMs.value = null
      webhooks.value = []
      webhooksError.value = null
      deliveries.value = []
      deliveriesError.value = null
    },
  )


  const isNamespacesEmpty = computed(() => !namespacesLoading.value && namespaces.value.length === 0)
  const isRoutesEmpty = computed(() => !routesLoading.value && routes.value.length === 0)


  const gatewayTenantId = 'a3f8c2d1-7e4b-4a09-b6f3-2c1d9e5a0b47'

  const gatewayBaseUrl = computed(() =>
    `https://gw.doctoria.io/${gatewayTenantId}`,
  )

  const namespaceGatewayUrl = computed(() =>
    selectedNamespace.value
      ? `${gatewayBaseUrl.value}/api/gw/${selectedNamespace.value.slug}`
      : null,
  )

  const publicRouteCount = computed(() => routes.value.filter(r => r.isPublic).length)
  const privateRouteCount = computed(() => routes.value.filter(r => !r.isPublic).length)



  async function fetchNamespaces() {
    namespacesLoading.value = true
    namespacesError.value = null
    try {
      const params: Record<string, string | number> = { page: namespacesPage.value, itemsPerPage: namespacesPageSize.value }
      if (namespaceSearch.value)
        params.q = namespaceSearch.value
      const res = await $api<GatewayNamespaceListResponse>('/integrations/gateway/namespaces', { params })

      namespaces.value = res.namespaces
      namespacesTotal.value = res.totalNamespaces
    }
    catch (err: unknown) {
      namespacesError.value = (err as Error).message ?? 'Failed to load namespaces'
    }
    finally {
      namespacesLoading.value = false
    }
  }

  async function createNamespace(payload: { slug: string; displayName: string; description?: string; baseUrl?: string; credentialId?: string; authHeader?: string; authScheme?: string }) {
    const res = await $api<{ namespace: GatewayNamespace }>('/integrations/gateway/namespaces', { method: 'POST', body: payload })

    namespaces.value.push(res.namespace)

    return res.namespace
  }

  async function updateNamespace(id: string, payload: { displayName?: string; description?: string; baseUrl?: string; credentialId?: string; authHeader?: string; authScheme?: string }) {
    const res = await $api<{ namespace: GatewayNamespace }>(`/integrations/gateway/namespaces/${id}`, { method: 'PUT', body: payload })
    const idx = namespaces.value.findIndex(n => n.id === id)
    if (idx !== -1)
      namespaces.value[idx] = res.namespace
    if (selectedNamespace.value?.id === id)
      selectedNamespace.value = res.namespace

    return res.namespace
  }

  async function deleteNamespace(id: string) {
    await $api(`/integrations/gateway/namespaces/${id}`, { method: 'DELETE' })
    namespaces.value = namespaces.value.filter(n => n.id !== id)
    if (selectedNamespace.value?.id === id) {
      selectedNamespace.value = null
      routes.value = []
    }
  }

  function selectNamespace(ns: GatewayNamespace | null) {
    selectedNamespace.value = ns
    routes.value = []
    routesPage.value = 1
    if (ns)
      fetchRoutes(ns.id)
  }



  async function fetchRoutes(namespaceId: string) {
    routesLoading.value = true
    routesError.value = null
    try {
      const params: Record<string, string | number> = { page: routesPage.value, itemsPerPage: routesPageSize.value }
      if (routeMethodFilter.value)
        params.method = routeMethodFilter.value
      if (routeModeFilter.value)
        params.mode = routeModeFilter.value
      const res = await $api<GatewayRouteListResponse>(`/integrations/gateway/namespaces/${namespaceId}/routes`, { params })

      routes.value = res.routes
      routesTotal.value = res.totalRoutes
    }
    catch (err: unknown) {
      routesError.value = (err as Error).message ?? 'Failed to load routes'
    }
    finally {
      routesLoading.value = false
    }
  }

  async function createRoute(namespaceId: string, payload: Partial<GatewayRoute>) {
    const res = await $api<{ route: GatewayRoute }>(`/integrations/gateway/namespaces/${namespaceId}/routes`, { method: 'POST', body: payload })

    routes.value.push(res.route)

    const ns = namespaces.value.find(n => n.id === namespaceId)
    if (ns)
      ns.routeCount++

    return res.route
  }

  async function updateRoute(namespaceId: string, routeId: string, payload: Partial<GatewayRoute>) {
    const res = await $api<{ route: GatewayRoute }>(`/integrations/gateway/namespaces/${namespaceId}/routes/${routeId}`, { method: 'PUT', body: payload })
    const idx = routes.value.findIndex(r => r.id === routeId)
    if (idx !== -1)
      routes.value[idx] = res.route

    return res.route
  }

  async function deleteRoute(namespaceId: string, routeId: string) {
    await $api(`/integrations/gateway/namespaces/${namespaceId}/routes/${routeId}`, { method: 'DELETE' })
    routes.value = routes.value.filter(r => r.id !== routeId)

    const ns = namespaces.value.find(n => n.id === namespaceId)
    if (ns && ns.routeCount > 0)
      ns.routeCount--
  }



  async function submitExtraction(rawInput: string, targetNamespaceId?: string): Promise<void> {
    extractionLoading.value = true
    extractionError.value = null
    extractionJob.value = null
    extractionProposals.value = []
    visibleProposals.value = []
    try {
      const res = await $api<QuickSetupResponse>('/integrations/gateway/quick-setup', {
        method: 'POST',
        body: { rawInput, targetNamespaceId },
      })

      extractionJob.value = res.job
      extractionProposals.value = res.proposals


      res.proposals.forEach((_, i) => {
        setTimeout(() => {
          if (i < extractionProposals.value.length)
            visibleProposals.value = extractionProposals.value.slice(0, i + 1)
        }, i * 120)
      })
    }
    catch (err: unknown) {
      extractionError.value = (err as Error).message ?? 'Extraction failed'
    }
    finally {
      extractionLoading.value = false
    }
  }

  function approveProposal(id: string): void {
    const p = extractionProposals.value.find(p => p.id === id)
    if (p)
      p.approvalStatus = 'approved'
  }

  function rejectProposal(id: string): void {
    const p = extractionProposals.value.find(p => p.id === id)
    if (p)
      p.approvalStatus = 'rejected'
  }

  async function confirmProvisioning(namespaceId: string): Promise<QuickSetupConfirmResponse | null> {
    if (!extractionJob.value)
      return null
    const approvedIds = extractionProposals.value.filter(p => p.approvalStatus === 'approved').map(p => p.id)

    const res = await $api<QuickSetupConfirmResponse>(`/integrations/gateway/quick-setup/${extractionJob.value.id}/confirm`, {
      method: 'POST',
      body: { namespaceId, approvedProposalIds: approvedIds },
    })


    if (selectedNamespace.value?.id === namespaceId)
      await fetchRoutes(namespaceId)


    await fetchNamespaces()

    return res
  }



  async function invokeRoute(route: GatewayRoute, body?: string): Promise<void> {
    invokerLoading.value = true
    invokerRoute.value = route
    invokerResponse.value = null
    invokerStatusCode.value = null
    invokerElapsedMs.value = null

    const ns = selectedNamespace.value
    if (!ns) {
      invokerLoading.value = false

      return
    }
    const start = Date.now()
    try {
      const res = await $api.raw(`/gw/${ns.slug}${route.path}`, {
        method: route.method,
        body: body?.trim() ? body : undefined,
        ignoreResponseError: true,
      })

      invokerStatusCode.value = res.status
      invokerResponse.value = res._data
    }
    catch (err: unknown) {
      invokerResponse.value = { error: (err as Error).message ?? 'Request failed' }
    }
    finally {
      invokerElapsedMs.value = Date.now() - start
      invokerLoading.value = false
    }
  }
  function clearInvokerResponse(): void {
    invokerResponse.value = null
    invokerStatusCode.value = null
    invokerElapsedMs.value = null
  }



  async function fetchWebhooks(namespaceId: string) {
    webhooksLoading.value = true
    webhooksError.value = null
    try {
      const res = await $api<GatewayWebhookListResponse>(`/integrations/gateway/namespaces/${namespaceId}/webhooks`)

      webhooks.value = res.webhooks
    }
    catch (err: unknown) {
      webhooksError.value = (err as Error).message ?? 'Failed to load webhooks'
    }
    finally {
      webhooksLoading.value = false
    }
  }

  async function createWebhook(namespaceId: string, payload: CreateWebhookPayload): Promise<GatewayWebhookCreateResponse> {
    const res = await $api<GatewayWebhookCreateResponse>(`/integrations/gateway/namespaces/${namespaceId}/webhooks`, { method: 'POST', body: payload })

    webhooks.value.unshift(res.webhook)

    return res
  }

  async function updateWebhook(namespaceId: string, webhookId: string, payload: UpdateWebhookPayload): Promise<GatewayWebhookUpdateResponse> {
    const res = await $api<GatewayWebhookUpdateResponse>(`/integrations/gateway/namespaces/${namespaceId}/webhooks/${webhookId}`, { method: 'PUT', body: payload })

    const idx = webhooks.value.findIndex(w => w.id === webhookId)
    if (idx !== -1)
      webhooks.value[idx] = res.webhook

    return res
  }

  async function deleteWebhook(namespaceId: string, webhookId: string) {
    await $api(`/integrations/gateway/namespaces/${namespaceId}/webhooks/${webhookId}`, { method: 'DELETE' })
    webhooks.value = webhooks.value.filter(w => w.id !== webhookId)
    if (deliveries.value.some(d => d.webhookId === webhookId))
      deliveries.value = []
  }

  async function sendTestEvent(namespaceId: string, webhookId: string) {
    await $api(`/integrations/gateway/namespaces/${namespaceId}/webhooks/${webhookId}/test`, { method: 'POST' })
  }

  async function fetchDeliveries(namespaceId: string, webhookId: string) {
    deliveriesLoading.value = true
    deliveriesError.value = null
    try {
      const res = await $api<GatewayWebhookDeliveryListResponse>(`/integrations/gateway/namespaces/${namespaceId}/webhooks/${webhookId}/deliveries`)

      deliveries.value = res.deliveries
    }
    catch (err: unknown) {
      deliveriesError.value = (err as Error).message ?? 'Failed to load deliveries'
    }
    finally {
      deliveriesLoading.value = false
    }
  }

  async function retryDelivery(namespaceId: string, webhookId: string, deliveryId: string) {
    const res = await $api<{ delivery: GatewayWebhookDelivery }>(`/integrations/gateway/namespaces/${namespaceId}/webhooks/${webhookId}/deliveries/${deliveryId}/retry`, { method: 'POST' })

    const idx = deliveries.value.findIndex(d => d.id === deliveryId)
    if (idx !== -1)
      deliveries.value[idx] = res.delivery
  }



  const accessControlStore = useAccessControlStore()
  accessControlStore.ensureLoaded()
  const canManageNamespace = computed(() => accessControlStore.can('gateway.manage'))
  const canDeleteRoute = computed(() => accessControlStore.can('gateway.manage'))

  return {

    namespaces,
    selectedNamespace,
    namespacesLoading,
    namespacesError,
    namespaceSearch,
    namespacesTotal,
    namespacesPage,
    namespacesPageSize,
    isNamespacesEmpty,


    routes,
    routesLoading,
    routesError,
    routesTotal,
    routesPage,
    routesPageSize,
    routeMethodFilter,
    routeModeFilter,
    isRoutesEmpty,


    extractionJob,
    extractionProposals,
    visibleProposals,
    extractionLoading,
    extractionError,


    invokerRoute,
    invokerRequestBody,
    invokerResponse,
    invokerStatusCode,
    invokerElapsedMs,
    invokerLoading,


    webhooks,
    webhooksLoading,
    webhooksError,
    deliveries,
    deliveriesLoading,
    deliveriesError,


    gatewayTenantId,
    gatewayBaseUrl,
    namespaceGatewayUrl,
    publicRouteCount,
    privateRouteCount,


    fetchNamespaces,
    createNamespace,
    updateNamespace,
    deleteNamespace,
    selectNamespace,
    fetchRoutes,
    createRoute,
    updateRoute,
    deleteRoute,
    submitExtraction,
    approveProposal,
    rejectProposal,
    confirmProvisioning,
    invokeRoute,
    clearInvokerResponse,
    fetchWebhooks,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    sendTestEvent,
    fetchDeliveries,
    retryDelivery,
    canManageNamespace,
    canDeleteRoute,
  }
})

export type GatewayStore = ReturnType<typeof useGatewayStore>
