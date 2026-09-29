<script setup lang="ts">
import { useSnackbar } from '@/composables/useSnackbar'
import { useAccessControlStore } from '@/stores/useAccessControlStore'
import { useProfileConnectionsStore } from '@/stores/useProfileConnectionsStore'
import type { ConnectionProvider, ProfileConnectionProvider, ProfileConnectionsPayload } from '@/types/profileConnections'
import { computed, onMounted, ref } from 'vue'

const access = useAccessControlStore()
const store = useProfileConnectionsStore()
const snackbar = useSnackbar()

const isDialogOpen = ref(false)
const selectedProvider = ref<ProfileConnectionProvider | null>(null)
const selectedConnectionId = ref<string | null>(null)
const selectedScopes = ref<string[]>([])
const repositoryScope = ref<'all' | 'selected'>('all')
const isDisconnectDialogOpen = ref(false)

const canManage = computed(() => access.can('gateway.manage'))
const hasProviders = computed(() => store.providers.length > 0)

function connectionFor(provider: ConnectionProvider) {
  return store.connectionByProvider.get(provider)
}

function formatDate(value?: string) {
  if (!value)
    return "Not available"

  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value))
}

const healthLabels: Record<string, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  unreachable: 'Unreachable',
}

function openConnect(provider: ProfileConnectionProvider) {
  selectedProvider.value = provider
  selectedConnectionId.value = null
  selectedScopes.value = provider.availableScopes.slice(0, 2)
  repositoryScope.value = 'all'
  isDialogOpen.value = true
}

function openEdit(provider: ProfileConnectionProvider, connectionId: string) {
  const connection = store.connections.find(item => item.id === connectionId)
  if (!connection)
    return

  selectedProvider.value = provider
  selectedConnectionId.value = connectionId
  selectedScopes.value = [...connection.scopes]
  repositoryScope.value = connection.repositoryScope
  isDialogOpen.value = true
}

async function saveConnection() {
  if (!selectedProvider.value)
    return

  const payload: ProfileConnectionsPayload = {
    scopes: selectedScopes.value,
    repositoryScope: repositoryScope.value,
  }

  try {
    if (selectedConnectionId.value)
      await store.update(selectedConnectionId.value, payload)
    else
      await store.connect(selectedProvider.value.id, payload)

    isDialogOpen.value = false
    snackbar.success("Connection saved")
  }
  catch {
    snackbar.error("Unable to save the connection")
  }
}

async function validateConnection(connectionId: string) {
  try {
    await store.validate(connectionId)

    const connection = store.connections.find(item => item.id === connectionId)

    snackbar[connection?.health === 'healthy' ? 'success' : 'warning']("Connection validation finished")
  }
  catch {
    snackbar.error("Unable to validate the connection")
  }
}

function requestDisconnect(connectionId: string) {
  selectedConnectionId.value = connectionId
  isDisconnectDialogOpen.value = true
}

async function disconnectConnection() {
  if (!selectedConnectionId.value)
    return

  try {
    await store.disconnect(selectedConnectionId.value)
    isDisconnectDialogOpen.value = false
    snackbar.success("Provider disconnected")
  }
  catch {
    snackbar.error("Unable to disconnect the provider")
  }
}

onMounted(() => {
  store.load()
})
</script>

<template>
  <section class="profile-connections">
    <div class="profile-connections__header">
      <div>
        <p class="text-overline text-primary mb-1">
          {{ "DEVELOPER TOOLS" }}
        </p>
        <h1 class="text-h5 font-weight-bold mb-1">
          {{ "Connections" }}
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          {{ "Connect your code repositories and keep workspace developer access in one place." }}
        </p>
      </div>
      <VBtn v-if="canManage" color="primary" prepend-icon="bx-plus"
        @click="store.providers[0] && openConnect(store.providers[0])">
        {{ "Connect provider" }}
      </VBtn>
    </div>

    <VAlert v-if="store.errorMessage" type="error" variant="tonal" class="mb-4" closable
      @click:close="store.errorMessage = ''">
      {{ "Unable to load connections" }}
      <template #append>
        <VBtn variant="text" size="small" @click="store.load">
          {{ "Retry" }}
        </VBtn>
      </template>
    </VAlert>

    <div v-if="store.isLoading" class="profile-connections__grid">
      <VSkeletonLoader v-for="item in 2" :key="item" type="article" class="profile-connections__skeleton" />
    </div>

    <VAlert v-else-if="!hasProviders" type="info" variant="tonal" icon="bx-plug">
      {{ "No connection providers are available." }}
    </VAlert>

    <div v-else class="profile-connections__grid">
      <VCard v-for="provider in store.providers" :key="provider.id" class="profile-connection-card" variant="outlined">
        <VCardItem>
          <template #prepend>
            <VAvatar :color="provider.id === 'github' ? 'grey-900' : 'warning'" variant="tonal" rounded="lg">
              <VIcon :icon="provider.icon" size="24" />
            </VAvatar>
          </template>
          <VCardTitle>{{ provider.name }}</VCardTitle>
          <VCardSubtitle>{{ provider.description }}</VCardSubtitle>
          <template #append>
            <VChip v-if="store.connectionByProvider.get(provider.id)"
              :color="store.connectionByProvider.get(provider.id)?.health === 'healthy' ? 'success' : 'warning'"
              size="small" variant="tonal">
              {{ healthLabels[store.connectionByProvider.get(provider.id)?.health ?? ''] ?? 'Unknown' }}
            </VChip>
            <VChip v-else size="small" variant="tonal">
              {{ "Not connected" }}
            </VChip>
          </template>
        </VCardItem>

        <VCardText>
          <template v-if="connectionFor(provider.id)">
            <div class="profile-connection-card__account">
              <VAvatar v-if="connectionFor(provider.id)?.avatarUrl" :image="connectionFor(provider.id)?.avatarUrl"
                size="38" />
              <VAvatar v-else color="primary" size="38">
                <VIcon icon="bx-user" />
              </VAvatar>
              <div>
                <p class="text-body-2 font-weight-medium mb-0">
                  {{ connectionFor(provider.id)?.accountName }}
                </p>
                <p class="text-caption text-medium-emphasis mb-0">
                  @{{ connectionFor(provider.id)?.accountLogin }}
                </p>
              </div>
            </div>
            <dl class="profile-connection-card__details">
              <div>
                <dt>{{ "Permissions" }}</dt>
                <dd>{{ connectionFor(provider.id)?.scopes.join(', ') }}</dd>
              </div>
              <div>
                <dt>{{ "Last validated" }}</dt>
                <dd>{{ formatDate(connectionFor(provider.id)?.lastValidatedAt) }}</dd>
              </div>
            </dl>
            <VAlert v-if="connectionFor(provider.id)?.lastError" type="warning" variant="tonal" density="compact"
              class="mt-3">
              {{ connectionFor(provider.id)?.lastError }}
            </VAlert>
          </template>
          <div v-else class="profile-connection-card__disconnected">
            <VIcon icon="bx-link-alt" size="22" class="text-disabled" />
            <span class="text-body-2 text-medium-emphasis">{{ "Not connected" }}</span>
          </div>
        </VCardText>

        <VCardActions class="profile-connection-card__actions">
          <template v-if="connectionFor(provider.id)">
            <VBtn v-if="canManage" variant="tonal" size="small" prepend-icon="bx-refresh"
              :loading="store.pendingAction === `validate:${connectionFor(provider.id)?.id}`"
              @click="connectionFor(provider.id) && validateConnection(connectionFor(provider.id)!.id)">
              {{ "Test connection" }}
            </VBtn>
            <VBtn v-if="canManage" variant="text" size="small" prepend-icon="bx-edit"
              @click="connectionFor(provider.id) && openEdit(provider, connectionFor(provider.id)!.id)">
              {{ "Edit" }}
            </VBtn>
            <VBtn v-if="canManage" variant="text" size="small" color="error" prepend-icon="bx-unlink"
              @click="connectionFor(provider.id) && requestDisconnect(connectionFor(provider.id)!.id)">
              {{ "Disconnect" }}
            </VBtn>
          </template>
          <VBtn v-else-if="canManage" color="primary" variant="tonal" prepend-icon="bx-link"
            @click="openConnect(provider)">
            {{ "Connect" }}
          </VBtn>
        </VCardActions>
      </VCard>
    </div>

    <VDialog v-model="isDialogOpen" max-width="520">
      <VCard v-if="selectedProvider">
        <VCardTitle class="d-flex align-center gap-3">
          <VIcon :icon="selectedProvider.icon" />
          {{ selectedConnectionId ? "Edit connection" : ("Connect " + String(selectedProvider.name)) }}
        </VCardTitle>
        <VCardText>
          <p class="text-body-2 text-medium-emphasis mb-4">
            {{ "This demo uses a fake authorization flow. No provider token is stored in the browser." }}
          </p>
          <VLabel class="mb-2">
            {{ "Permissions" }}
          </VLabel>
          <VCheckbox v-for="scope in selectedProvider.availableScopes" :key="scope" v-model="selectedScopes"
            :label="scope" :value="scope" hide-details density="compact" />
          <VSelect v-model="repositoryScope" class="mt-4" :items="[
            { title: 'All repositories', value: 'all' }, { title: 'Selected repositories', value: 'selected' },]"
            label="Repository access" variant="outlined" density="compact" />
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="isDialogOpen = false">
            {{ "Cancel" }}
          </VBtn>
          <VBtn color="primary" :loading="!!store.pendingAction" :disabled="!selectedScopes.length"
            @click="saveConnection">
            {{ "Save" }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="isDisconnectDialogOpen" max-width="420">
      <VCard>
        <VCardTitle>{{ "Disconnect provider" }}</VCardTitle>
        <VCardText>{{ "Are you sure you want to disconnect this provider?" }}</VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="isDisconnectDialogOpen = false">
            {{ "Cancel" }}
          </VBtn>
          <VBtn color="error" :loading="!!store.pendingAction" @click="disconnectConnection">
            {{ "Disconnect" }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </section>
</template>

<style lang="scss" scoped>
.profile-connections {
  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-block-end: 1.5rem;
  }

  &__grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  &__skeleton {
    min-block-size: 260px;
  }
}

.profile-connection-card {
  border-color: rgba(var(--v-theme-on-surface), 0.1);

  &__account,
  &__disconnected {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  &__disconnected {
    justify-content: center;
    border: 1px dashed rgba(var(--v-theme-on-surface), 0.16);
    border-radius: 8px;
    min-block-size: 82px;
  }

  &__details {
    display: grid;
    gap: 0.75rem;
    margin-block: 1.25rem 0;

    div {
      display: flex;
      justify-content: space-between;
      border-block-end: 1px solid rgba(var(--v-theme-on-surface), 0.08);
      gap: 1rem;
      padding-block-end: 0.5rem;
    }

    dt {
      color: rgba(var(--v-theme-on-surface), 0.62);
      font-size: 0.75rem;
    }

    dd {
      margin: 0;
      font-size: 0.75rem;
      overflow-wrap: anywhere;
      text-align: end;
    }
  }

  &__actions {
    flex-wrap: wrap;
    gap: 0.25rem;
    padding-block-start: 0;
  }
}

@media (max-width: 720px) {
  .profile-connections {
    &__header {
      flex-direction: column;
    }

    &__grid {
      grid-template-columns: 1fr;
    }
  }
}
</style>
