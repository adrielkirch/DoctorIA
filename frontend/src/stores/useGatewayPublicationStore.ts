import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { GatewayEnvironmentTarget, GatewayRelease } from '@/types/gatewayPublication'
import { $api } from '@/utils/api'

export const useGatewayPublicationStore = defineStore('gatewayPublication', () => {
  const environments = ref<GatewayEnvironmentTarget[]>([])
  const releases = ref<GatewayRelease[]>([])
  const isLoading = ref(false)
  const isPublishing = ref(false)
  const error = ref<string | null>(null)

  const productionEnvironment = computed(() => environments.value.find(e => e.environment === 'production'))
  const sandboxEnvironment = computed(() => environments.value.find(e => e.environment === 'sandbox'))

  const activeRelease = computed(() => {
    const activeId = productionEnvironment.value?.activeReleaseId

    return activeId ? releases.value.find(r => r.id === activeId) : null
  })

  const candidateReleases = computed(() => releases.value.filter(r => r.status === 'draft' || r.status === 'failed'))
  const publishedReleases = computed(() => releases.value.filter(r => r.status === 'published' || r.status === 'rolled_back' || r.status === 'superseded'))

  async function load() {
    isLoading.value = true
    error.value = null

    try {
      const [envRes, relRes] = await Promise.all([
        $api<{ environments: GatewayEnvironmentTarget[] }>('/integrations/gateway/environments'),
        $api<{ releases: GatewayRelease[] }>('/integrations/gateway/releases'),
      ])

      environments.value = envRes.environments
      releases.value = relRes.releases
    }
    catch (err: any) {
      error.value = err?.data?.message ?? err?.message ?? 'Failed to load publication data'
    }
    finally {
      isLoading.value = false
    }
  }

  async function createRelease(routeCount: number) {
    error.value = null

    try {
      const response = await $api<{ release: GatewayRelease }>('/integrations/gateway/releases', {
        method: 'POST',
        body: { routeCount },
      })

      releases.value.push(response.release)

      return response.release
    }
    catch (err: any) {
      error.value = err?.data?.message ?? err?.message ?? 'Failed to create release'
      throw err
    }
  }

  async function publish(releaseId: string) {
    isPublishing.value = true
    error.value = null

    try {
      const response = await $api<{ release: GatewayRelease }>(`/integrations/gateway/releases/${releaseId}/publish`, {
        method: 'POST',
      })

      const index = releases.value.findIndex(r => r.id === releaseId)
      if (index >= 0)
        releases.value[index] = response.release

      if (productionEnvironment.value)
        productionEnvironment.value.activeReleaseId = releaseId

      return response.release
    }
    catch (err: any) {
      error.value = err?.data?.message ?? err?.message ?? 'Failed to publish release'
      throw err
    }
    finally {
      isPublishing.value = false
    }
  }

  async function rollback(releaseId: string) {
    isPublishing.value = true
    error.value = null

    try {
      const response = await $api<{ release: GatewayRelease }>(`/integrations/gateway/releases/${releaseId}/rollback`, {
        method: 'POST',
      })

      const index = releases.value.findIndex(r => r.id === releaseId)
      if (index >= 0)
        releases.value[index] = response.release

      if (productionEnvironment.value)
        productionEnvironment.value.activeReleaseId = releaseId

      return response.release
    }
    catch (err: any) {
      error.value = err?.data?.message ?? err?.message ?? 'Failed to rollback release'
      throw err
    }
    finally {
      isPublishing.value = false
    }
  }

  async function unpublish(reason: string) {
    isPublishing.value = true
    error.value = null

    try {
      await $api('/integrations/gateway/environments/production/unpublish', {
        method: 'POST',
        body: { reason },
      })

      if (productionEnvironment.value) {
        productionEnvironment.value.activeReleaseId = undefined
        productionEnvironment.value.lastPublishedAt = undefined
      }
    }
    catch (err: any) {
      error.value = err?.data?.message ?? err?.message ?? 'Failed to unpublish'
      throw err
    }
    finally {
      isPublishing.value = false
    }
  }

  return {
    environments,
    releases,
    isLoading,
    isPublishing,
    error,
    productionEnvironment,
    sandboxEnvironment,
    activeRelease,
    candidateReleases,
    publishedReleases,
    load,
    createRelease,
    publish,
    rollback,
    unpublish,
  }
})
