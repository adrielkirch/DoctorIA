import { $api } from '@/utils/api'
import type {
  CreateSecretPayload,
  CreateVariablePayload,
  CredentialEntry,
  CredentialListResponse,
  SecretCredential,
  UpdateVariablePayload,
  VariableCredential,
} from 'contracts/security/credentials/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type CredentialFilter = 'all' | 'secret' | 'variable'

function isVariable(credential: CredentialEntry): credential is VariableCredential {
  return credential.type === 'VARIABLE'
}

function isSecret(credential: CredentialEntry): credential is SecretCredential {
  return credential.type === 'SECRET'
}

export const useCredentialsStore = defineStore('credentials', () => {
  const credentials = ref<CredentialEntry[]>([])
  const searchQuery = ref('')
  const activeFilter = ref<CredentialFilter>('all')
  const isLoading = ref(false)
  const revision = ref(0)

  const pagination = ref({
    page: 1,
    itemsPerPage: 25,
    total: 0,
    totalPages: 1,
  })

  const indexedCredentials = computed(() => credentials.value.map(entry => ({
    entry,
    searchIndex: `${entry.key} ${entry.description ?? ''}`.toLowerCase(),
  })))

  const filteredCredentials = computed(() => {
    const q = searchQuery.value.trim().toLowerCase()

    return indexedCredentials.value
      .filter(({ entry, searchIndex }) => {
        const matchesFilter = activeFilter.value === 'all'
        || (activeFilter.value === 'secret' && isSecret(entry))
        || (activeFilter.value === 'variable' && isVariable(entry))

        if (!matchesFilter)
          return false

        if (!q)
          return true

        return searchIndex.includes(q)
      })
      .map(item => item.entry)
  })

  const variables = computed(() => filteredCredentials.value.filter(isVariable))
  const secrets = computed(() => filteredCredentials.value.filter(isSecret))

  async function fetchCredentials(page = pagination.value.page, itemsPerPage = pagination.value.itemsPerPage): Promise<void> {
    isLoading.value = true
    try {
      const response = await $api<CredentialListResponse>('/security/credentials', {
        query: { page, itemsPerPage },
      })

      credentials.value = response.credentials
      pagination.value.page = response.page
      pagination.value.itemsPerPage = itemsPerPage
      pagination.value.total = response.totalCredentials
      pagination.value.totalPages = response.totalPages
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Carrega TODAS as credenciais do tenant (page size máximo da API).
   * O wizard de Inboxes precisa do conjunto completo para resolver o status de
   * cada referência — a listagem paginada padrão mostraria falsos "pendente".
   */
  async function fetchAllCredentials(): Promise<void> {
    await fetchCredentials(1, 100)
  }

  async function createVariable(payload: CreateVariablePayload): Promise<VariableCredential> {
    isLoading.value = true
    try {
      const response = await $api<{ credential: VariableCredential }>('/security/credentials/variables', {
        method: 'POST',
        body: payload,
      })

      credentials.value.push(response.credential)
      pagination.value.total += 1

      return response.credential
    }
    finally {
      isLoading.value = false
    }
  }

  async function createSecret(payload: CreateSecretPayload): Promise<SecretCredential> {
    isLoading.value = true
    try {
      const response = await $api<{ credential: SecretCredential }>('/security/credentials/secrets', {
        method: 'POST',
        body: payload,
      })

      credentials.value.push(response.credential)
      pagination.value.total += 1
      revision.value += 1

      return response.credential
    }
    finally {
      isLoading.value = false
    }
  }

  async function updateVariable(payload: UpdateVariablePayload): Promise<VariableCredential> {
    isLoading.value = true
    try {
      const response = await $api<{ credential: VariableCredential }>(`/security/credentials/variables/${payload.id}`, {
        method: 'PUT',
        body: payload,
      })

      const index = credentials.value.findIndex(item => item.id === payload.id)
      if (index !== -1) {
        credentials.value[index] = response.credential
        revision.value += 1
      }

      return response.credential
    }
    finally {
      isLoading.value = false
    }
  }

  async function deleteSecret(id: number): Promise<void> {
    isLoading.value = true
    try {
      await $api(`/security/credentials/secrets/${id}`, {
        method: 'DELETE',
      })

      const index = credentials.value.findIndex(item => item.id === id)
      if (index !== -1) {
        credentials.value.splice(index, 1)
        revision.value += 1
      }

      pagination.value.total = Math.max(0, pagination.value.total - 1)
    }
    finally {
      isLoading.value = false
    }
  }

  return {
    credentials,
    searchQuery,
    activeFilter,
    isLoading,
    revision,
    pagination,
    filteredCredentials,
    variables,
    secrets,
    fetchCredentials,
    fetchAllCredentials,
    createVariable,
    createSecret,
    updateVariable,
    deleteSecret,
  }
})

export type CredentialsStore = ReturnType<typeof useCredentialsStore>
