import { $api } from '@/utils/api'
import type { CredentialEntry, CredentialListResponse } from 'contracts/security/credentials/types'
import { onMounted, ref } from 'vue'

/**
 * Loads the workspace credentials so gateway namespaces/routes can reference
 * them (credentialId) for upstream auth in PROXY mode. Only the id + key are
 * used by the UI — plaintext values never leave the gateway runtime.
 */
export function useGatewayCredentials() {
  const credentials = ref<CredentialEntry[]>([])
  const credentialsLoading = ref(false)

  async function fetchCredentials(): Promise<void> {
    credentialsLoading.value = true
    try {
      const res = await $api<CredentialListResponse>('/security/credentials')

      credentials.value = res.credentials
    }
    catch {
      credentials.value = []
    }
    finally {
      credentialsLoading.value = false
    }
  }

  onMounted(fetchCredentials)

  return { credentials, credentialsLoading, fetchCredentials }
}
