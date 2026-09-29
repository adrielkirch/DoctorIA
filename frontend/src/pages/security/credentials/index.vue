<script setup lang="ts">
import { useAccessControlStore } from '@/stores/useAccessControlStore'
import CredentialsLists from '@/views/security/credentials/CredentialsLists.vue'
import VariableDrawer from '@/views/security/credentials/VariableDrawer.vue'
import type { CredentialFilter } from '@/views/security/credentials/useCredentialsStore'
import { useCredentialsStore } from '@/views/security/credentials/useCredentialsStore'
import type {
    CreateSecretPayload,
    CreateVariablePayload,
    VariableCredential,
} from 'contracts/security/credentials/types'
import { computed, onMounted, ref } from 'vue'

definePage({
  meta: {
    layoutWrapperClasses: 'layout-content-height-fixed',
    action: 'read',
    subject: 'security-credentials',
  },
})

const store = useCredentialsStore()



const accessControlStore = useAccessControlStore()

accessControlStore.ensureLoaded()

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref<'success' | 'error'>('error')
const drawerOpen = ref(false)
const selectedVariable = ref<VariableCredential | null>(null)
const isSaving = ref(false)
const deleteDialogOpen = ref(false)
const pendingSecretId = ref<number | null>(null)

const filterOptions = computed((): Array<{ label: string; value: CredentialFilter }> => [
  { label: "All", value: 'all' },
  { label: "Secret", value: 'secret' },
  { label: "Variable", value: 'variable' },
])

const hasSearch = computed(() => store.searchQuery.trim().length > 0)

onMounted(() => {
  store.fetchCredentials().catch(() => {
    snackbarText.value = "Failed to load credentials. Please try again."
    snackbarColor.value = 'error'
    snackbar.value = true
  })
})

function openCreateVariable(): void {
  selectedVariable.value = null
  drawerOpen.value = true
}

function openEditVariable(id: number): void {
  const current = store.credentials.find(item => item.id === id)
  if (!current || current.type !== 'VARIABLE')
    return

  selectedVariable.value = current
  drawerOpen.value = true
}

function requestDeleteSecret(id: number): void {
  pendingSecretId.value = id
  deleteDialogOpen.value = true
}

type DrawerCreatePayload = { credentialType: 'VARIABLE' | 'SECRET' } & (
  | CreateVariablePayload
  | CreateSecretPayload
)

async function handleVariableSubmit(
  payload: DrawerCreatePayload | (CreateVariablePayload & { id: number }),
): Promise<void> {
  isSaving.value = true
  try {
    if ('id' in payload) {
      await store.updateVariable(payload)
      snackbarText.value = "Variable updated successfully."
    }
    else if (payload.credentialType === 'SECRET') {
      await store.createSecret({
        key: payload.key,
        value: payload.value,
        description: payload.description,
      })
      snackbarText.value = "Secret created successfully."
    }
    else {
      await store.createVariable({
        key: payload.key,
        value: payload.value,
        description: payload.description,
      })
      snackbarText.value = "Default created successfully."
    }

    snackbarColor.value = 'success'
    snackbar.value = true
    drawerOpen.value = false
  }
  catch {
    snackbarText.value = "Unable to save variable. Please try again."
    snackbarColor.value = 'error'
    snackbar.value = true
  }
  finally {
    isSaving.value = false
  }
}

async function confirmDeleteSecret(): Promise<void> {
  if (pendingSecretId.value === null)
    return

  isSaving.value = true
  try {
    await store.deleteSecret(pendingSecretId.value)
    snackbarText.value = "Secret deleted successfully."
    snackbarColor.value = 'success'
    snackbar.value = true
  }
  catch {
    snackbarText.value = "Unable to delete secret. Please try again."
    snackbarColor.value = 'error'
    snackbar.value = true
  }
  finally {
    isSaving.value = false
    deleteDialogOpen.value = false
    pendingSecretId.value = null
  }
}
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6">
      <h1 class="text-h4 font-weight-bold">
        {{ "Credentials" }}
      </h1>
      <div class="d-flex align-center gap-2">
        <VBtn
          v-if="accessControlStore.can('credentials.manage')"
          color="primary"
          prepend-icon="bx-plus"
          @click="openCreateVariable"
        >
          {{ "Add Credential" }}
        </VBtn>
      </div>
    </div>

    <div class="d-flex align-center flex-wrap gap-3 mb-6">
      <VTextField
        v-model="store.searchQuery"
        placeholder="Search credentials"
        prepend-inner-icon="bx-search"
        density="compact"
        hide-details
        clearable
        :style="{ maxInlineSize: '320px' }"
      />

      <div class="d-flex gap-2">
        <VChip
          v-for="item in filterOptions"
          :key="item.value"
          :color="store.activeFilter === item.value ? 'primary' : undefined"
          :variant="store.activeFilter === item.value ? 'flat' : 'outlined'"
          @click="store.activeFilter = item.value"
        >
          {{ item.label }}
        </VChip>
      </div>
    </div>

    <VProgressLinear
      v-show="store.isLoading"
      indeterminate
      color="primary"
      class="mb-4"
    />

    <CredentialsLists
      :variables="store.variables"
      :secrets="store.secrets"
      :is-loading="store.isLoading"
      :has-search="hasSearch"
      :active-filter="store.activeFilter"
      @edit-variable="openEditVariable"
      @delete-secret="requestDeleteSecret"
    />

    <VariableDrawer
      v-model="drawerOpen"
      :variable="selectedVariable"
      :is-saving="isSaving"
      @submit="handleVariableSubmit"
    />

    <VDialog
      v-model="deleteDialogOpen"
      max-width="420"
    >
      <VCard>
        <VCardTitle class="pt-4 px-4 text-h6">
          {{ "Delete Secret" }}
        </VCardTitle>
        <VCardText>
          {{ "Delete this secret? This action cannot be undone." }}
        </VCardText>
        <VCardActions class="px-4 pb-4">
          <VSpacer />
          <VBtn
            variant="text"
            :disabled="isSaving"
            @click="deleteDialogOpen = false"
          >
            {{ "Cancel" }}
          </VBtn>
          <VBtn
            color="error"
            :loading="isSaving"
            @click="confirmDeleteSecret"
          >
            {{ "Confirm Delete" }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar
      v-model="snackbar"
      :color="snackbarColor"
      :timeout="3000"
    >
      {{ snackbarText }}
    </VSnackbar>
  </div>
</template>
