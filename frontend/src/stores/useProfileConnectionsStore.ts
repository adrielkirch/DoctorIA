import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ConnectionProvider, ProfileConnection, ProfileConnectionProvider, ProfileConnectionsPayload } from '@/types/profileConnections'
import { $api } from '@/utils/api'

export const useProfileConnectionsStore = defineStore('profileConnections', () => {
  const providers = ref<ProfileConnectionProvider[]>([])
  const connections = ref<ProfileConnection[]>([])
  const isLoading = ref(false)
  const pendingAction = ref<string | null>(null)
  const errorMessage = ref('')

  const connectionByProvider = computed(() => new Map(connections.value.map(connection => [connection.provider, connection])))

  async function load() {
    if (isLoading.value)
      return

    isLoading.value = true
    errorMessage.value = ''

    try {
      const response = await $api<{ providers: ProfileConnectionProvider[]; connections: ProfileConnection[] }>('/profile/connections')

      providers.value = response.providers
      connections.value = response.connections
    }
    catch (error: any) {
      errorMessage.value = error?.data?.message ?? error?.message ?? 'Unable to load connections'
    }
    finally {
      isLoading.value = false
    }
  }

  async function connect(provider: ConnectionProvider, payload: ProfileConnectionsPayload) {
    pendingAction.value = `connect:${provider}`
    errorMessage.value = ''

    try {
      await $api<{ connection: ProfileConnection }>(`/profile/connections/${provider}/authorize`, {
        method: 'POST',
        body: payload,
      })
      await load()
    }
    catch (error: any) {
      errorMessage.value = error?.data?.message ?? error?.message ?? 'Unable to connect provider'
      throw error
    }
    finally {
      pendingAction.value = null
    }
  }

  async function validate(connectionId: string) {
    pendingAction.value = `validate:${connectionId}`

    try {
      const response = await $api<{ connection: ProfileConnection }>(`/profile/connections/${connectionId}/validate`, { method: 'POST' })
      const index = connections.value.findIndex(connection => connection.id === connectionId)
      if (index >= 0)
        connections.value[index] = response.connection
    }
    finally {
      pendingAction.value = null
    }
  }

  async function update(connectionId: string, payload: ProfileConnectionsPayload) {
    pendingAction.value = `update:${connectionId}`

    try {
      const response = await $api<{ connection: ProfileConnection }>(`/profile/connections/${connectionId}`, {
        method: 'PATCH',
        body: payload,
      })

      const index = connections.value.findIndex(connection => connection.id === connectionId)
      if (index >= 0)
        connections.value[index] = response.connection
    }
    finally {
      pendingAction.value = null
    }
  }

  async function disconnect(connectionId: string) {
    pendingAction.value = `disconnect:${connectionId}`

    try {
      await $api(`/profile/connections/${connectionId}`, { method: 'DELETE' })
      connections.value = connections.value.filter(connection => connection.id !== connectionId)
    }
    finally {
      pendingAction.value = null
    }
  }

  return {
    providers,
    connections,
    connectionByProvider,
    isLoading,
    pendingAction,
    errorMessage,
    load,
    connect,
    validate,
    update,
    disconnect,
  }
})
