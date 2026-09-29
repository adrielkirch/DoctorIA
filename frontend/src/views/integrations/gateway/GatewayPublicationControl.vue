<script setup lang="ts">
import type { GatewayEnvironment, GatewayEnvironmentTarget, GatewayRelease } from '@/types/gatewayPublication';
import { computed, ref } from 'vue';

const props = withDefaults(defineProps<{
  environments: GatewayEnvironmentTarget[]
  releases: GatewayRelease[]
  selectedEnvironment: GatewayEnvironment
  canPublish: boolean
  canRollback: boolean
  isLoading?: boolean
  isPublishing?: boolean
  error?: string | null
}>(), {
  isLoading: false,
  isPublishing: false,
  error: null,
})

const emit = defineEmits<{
  selectEnvironment: [environment: GatewayEnvironment]
  createRelease: []
  publish: [releaseId: string]
  unpublish: [reason: string]
  rollback: [releaseId: string]
  retry: []
}>()

const environmentLabels: Record<string, string> = {
  sandbox: 'SANDBOX',
  production: 'PRODUCTION',
}
const targetStatusLabels: Record<string, string> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  offline: 'Offline',
}
const releaseStatusLabels: Record<string, string> = {
  draft: 'Candidate',
  queued: 'Queued',
  publishing: 'Publishing',
  published: 'Published',
  superseded: 'Superseded',
  rolled_back: 'Rolled back',
  failed: 'Failed',
}

const publishDialogOpen = ref(false)
const rollbackDialogOpen = ref(false)
const unpublishDialogOpen = ref(false)
const selectedRelease = ref<GatewayRelease | null>(null)
const unpublishReason = ref('')

const selectedTarget = computed(() => props.environments.find(environment => environment.environment === props.selectedEnvironment))
const productionTarget = computed(() => props.environments.find(environment => environment.environment === 'production'))
const activeRelease = computed(() => props.releases.find(release => release.id === productionTarget.value?.activeReleaseId))
const candidateReleases = computed(() => props.releases.filter(release => release.status === 'draft' || release.status === 'failed'))
const publishedReleases = computed(() => props.releases.filter(release => release.status === 'published' || release.status === 'rolled_back' || release.status === 'superseded'))

function formatDate(value?: string) {
  if (!value)
    return "Not available"

  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function openPublish(release: GatewayRelease) {
  selectedRelease.value = release
  publishDialogOpen.value = true
}

function confirmPublish() {
  if (!selectedRelease.value)
    return

  emit('publish', selectedRelease.value.id)
  publishDialogOpen.value = false
}

function openRollback(release: GatewayRelease) {
  selectedRelease.value = release
  rollbackDialogOpen.value = true
}

function confirmRollback() {
  if (!selectedRelease.value)
    return

  emit('rollback', selectedRelease.value.id)
  rollbackDialogOpen.value = false
}

function confirmUnpublish() {
  const reason = unpublishReason.value.trim()
  if (!reason)
    return

  emit('unpublish', reason)
  unpublishReason.value = ''
  unpublishDialogOpen.value = false
}
</script>

<template>
  <VCard class="gateway-publication-control" variant="outlined">
    <VCardItem>
      <VCardTitle class="d-flex align-center gap-2">
        <VIcon icon="bx-git-branch" color="primary" />
        {{ "Publication control" }}
      </VCardTitle>
      <VCardSubtitle>{{ "Promote Sandbox changes to production with safety and traceability." }}</VCardSubtitle>
      <template #append>
        <VChip size="small" variant="tonal" color="info" prepend-icon="bx-history">
          {{ "Auditable" }}
        </VChip>
      </template>
    </VCardItem>

    <VCardText>
      <VAlert v-if="props.error" type="error" variant="tonal" class="mb-4" closable @click:close="emit('retry')">
        {{ props.error }}
        <template #append>
          <VBtn variant="text" size="small" @click="emit('retry')">
            {{ "Retry" }}
          </VBtn>
        </template>
      </VAlert>

      <div class="gateway-publication-control__environment-switcher" role="tablist" aria-label="Gateway environment">
        <VBtn v-for="target in props.environments" :key="target.environment"
          :variant="props.selectedEnvironment === target.environment ? 'flat' : 'text'"
          :color="target.environment === 'production' ? 'warning' : 'primary'"
          class="gateway-publication-control__environment"
          :class="{ 'gateway-publication-control__environment--production': target.environment === 'production' }"
          role="tab" :aria-selected="props.selectedEnvironment === target.environment"
          @click="emit('selectEnvironment', target.environment)">
          <VIcon :icon="target.environment === 'production' ? 'bx-lock-alt' : 'bx-test-tube'" start />
          {{ environmentLabels[target.environment] ?? target.environment }}
        </VBtn>
      </div>

      <div v-if="props.isLoading" class="mt-4">
        <VSkeletonLoader type="article" />
      </div>

      <template v-else-if="selectedTarget">
        <div class="gateway-publication-control__target mt-4">
          <div>
            <p class="text-overline mb-1">
              {{ "Gateway ID" }}
            </p>
            <div class="d-flex align-center gap-2">
              <code class="gateway-publication-control__id">{{ selectedTarget.gatewayId }}</code>
              <VBtn icon="bx-copy" size="x-small" variant="text" aria-label="Copy Gateway ID" />
            </div>
          </div>
          <VChip
            :color="selectedTarget.status === 'healthy' ? 'success' : selectedTarget.status === 'degraded' ? 'warning' : 'error'"
            variant="tonal" size="small" prepend-icon="bx-pulse">
            {{ targetStatusLabels[selectedTarget.status] ?? selectedTarget.status }}
          </VChip>
        </div>

        <div class="gateway-publication-control__url mt-3">
          <span class="text-caption text-medium-emphasis">{{ "Base URL" }}</span>
          <code>{{ selectedTarget.baseUrl }}</code>
        </div>

        <VAlert v-if="props.selectedEnvironment === 'production'" type="warning" variant="tonal" density="compact"
          class="mt-4" icon="bx-shield-quarter">
          {{ "You are viewing production. Publications affect live traffic." }}
        </VAlert>

        <div class="gateway-publication-control__actions mt-4">
          <template v-if="props.selectedEnvironment === 'sandbox'">
            <VBtn v-if="props.canPublish" color="primary" prepend-icon="bx-git-pull-request"
              :loading="props.isPublishing" @click="emit('createRelease')">
              {{ "Create release" }}
            </VBtn>
            <span class="text-caption text-medium-emphasis">{{ "Edit and test safely in Sandbox." }}</span>
          </template>
          <template v-else>
            <VBtn v-if="props.canRollback && activeRelease" variant="tonal" color="warning" prepend-icon="bx-revision"
              @click="openRollback(activeRelease)">
              {{ "Rollback" }}
            </VBtn>
            <VBtn v-if="props.canRollback" variant="text" color="error" prepend-icon="bx-power-off"
              @click="unpublishDialogOpen = true">
              {{ "Unpublish" }}
            </VBtn>
          </template>
        </div>
      </template>

      <VDivider class="my-5" />

      <div class="d-flex align-center justify-space-between mb-3">
        <div>
          <h3 class="text-subtitle-1 font-weight-semibold">
            {{ "Gateway releases" }}
          </h3>
          <p class="text-caption text-medium-emphasis mb-0">
            {{ "Immutable history of candidates and publications." }}
          </p>
        </div>
        <VChip size="small" variant="tonal">
          {{ props.releases.length }}
        </VChip>
      </div>

      <div v-if="!props.releases.length" class="gateway-publication-control__empty">
        <VIcon icon="bx-package" size="28" class="text-disabled" />
        <span class="text-body-2 text-medium-emphasis">{{ "No releases created yet." }}</span>
      </div>

      <div v-else class="gateway-publication-control__releases">
        <VCard v-for="release in [...candidateReleases, ...publishedReleases]" :key="release.id" variant="tonal"
          class="gateway-publication-control__release">
          <div class="d-flex align-start gap-3">
            <VAvatar size="34"
              :color="release.status === 'published' ? 'success' : release.status === 'failed' ? 'error' : 'primary'"
              variant="tonal">
              <VIcon
                :icon="release.status === 'published' ? 'bx-check' : release.status === 'failed' ? 'bx-error' : 'bx-git-commit'"
                size="18" />
            </VAvatar>
            <div class="min-w-0 flex-grow-1">
              <div class="d-flex align-center gap-2 flex-wrap">
                <span class="text-body-2 font-weight-semibold">{{ release.version }}</span>
                <VChip size="x-small" variant="tonal"
                  :color="release.status === 'published' ? 'success' : release.status === 'failed' ? 'error' : 'primary'">
                  {{ releaseStatusLabels[release.status] ?? release.status }}
                </VChip>
                <VChip v-if="release.id === productionTarget?.activeReleaseId" size="x-small" color="success"
                  variant="flat">
                  {{ "Active in production" }}
                </VChip>
              </div>
              <p class="text-caption text-medium-emphasis mb-1">
                {{ release.routeCount }} {{ "routes" }} · {{ formatDate(release.createdAt) }}
              </p>
              <code class="text-caption">{{ release.checksum }}</code>
            </div>
            <div class="d-flex gap-1 flex-wrap justify-end">
              <VBtn v-if="release.status === 'draft' || release.status === 'failed'" :disabled="!props.canPublish"
                size="small" color="primary" prepend-icon="bx-rocket" @click="openPublish(release)">
                {{ "Publish" }}
              </VBtn>
              <VBtn v-if="release.status === 'published' && props.canRollback" size="small" variant="text"
                prepend-icon="bx-revision" @click="openRollback(release)">
                {{ "Rollback" }}
              </VBtn>
            </div>
          </div>
        </VCard>
      </div>
    </VCardText>

    <VDialog v-model="publishDialogOpen" max-width="520">
      <VCard v-if="selectedRelease">
        <VCardTitle>{{ "Publish to production" }}</VCardTitle>
        <VCardText>
          <VAlert type="warning" variant="tonal" icon="bx-shield-quarter" class="mb-4">
            {{ "This changes production traffic. Confirm the candidate before continuing." }}
          </VAlert>
          <dl class="gateway-publication-control__confirmation">
            <div>
              <dt>{{ "Version" }}</dt>
              <dd>{{ selectedRelease.version }}</dd>
            </div>
            <div>
              <dt>{{ "routes" }}</dt>
              <dd>{{ selectedRelease.routeCount }}</dd>
            </div>
            <div>
              <dt>{{ "Checksum" }}</dt>
              <dd>{{ selectedRelease.checksum }}</dd>
            </div>
          </dl>
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="publishDialogOpen = false">
            {{ "Cancel" }}
          </VBtn>
          <VBtn color="primary" prepend-icon="bx-rocket" :loading="props.isPublishing" @click="confirmPublish">
            {{ "Confirm publication" }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="rollbackDialogOpen" max-width="460">
      <VCard>
        <VCardTitle>{{ "Rollback release" }}</VCardTitle>
        <VCardText>Production will return to version {{ selectedRelease?.version }}. History will be preserved.
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="rollbackDialogOpen = false">
            {{ "Cancel" }}
          </VBtn>
          <VBtn color="warning" prepend-icon="bx-revision" @click="confirmRollback">
            {{ "Confirm rollback" }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VDialog v-model="unpublishDialogOpen" max-width="460">
      <VCard>
        <VCardTitle>{{ "Unpublish production" }}</VCardTitle>
        <VCardText>
          <p class="text-body-2">
            {{ "Production traffic will be disabled. Enter a reason to continue." }}
          </p>
          <VTextarea v-model="unpublishReason" label="Reason" variant="outlined" rows="3"
            placeholder="Describe the reason for this action..." />
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn variant="text" @click="unpublishDialogOpen = false">
            {{ "Cancel" }}
          </VBtn>
          <VBtn color="error" prepend-icon="bx-power-off" :disabled="!unpublishReason.trim()" @click="confirmUnpublish">
            {{ "Confirm unpublish" }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </VCard>
</template>

<style lang="scss" scoped>
.gateway-publication-control {
  border-color: rgba(var(--v-theme-on-surface), 0.12);

  &__environment-switcher {
    display: inline-flex;
    padding: 4px;
    border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
    border-radius: 10px;
    background: rgba(var(--v-theme-on-surface), 0.03);
    max-inline-size: 100%;
  }

  &__environment {
    border-radius: 7px;
    font-weight: 700;
    letter-spacing: 0.04em;
    min-inline-size: 150px;
  }

  &__environment--production {
    border-inline-start: 1px solid rgba(var(--v-theme-warning), 0.24);
  }

  &__target,
  &__url {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  &__id,
  &__url code {
    overflow: hidden;
    max-inline-size: 100%;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__url {
    border-radius: 8px;
    background: rgba(var(--v-theme-on-surface), 0.04);
    padding-block: 10px;
    padding-inline: 12px;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  &__release {
    padding: 12px;
    border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  }

  &__releases {
    display: grid;
    gap: 8px;
  }

  &__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px dashed rgba(var(--v-theme-on-surface), 0.16);
    border-radius: 8px;
    gap: 8px;
    min-block-size: 100px;
  }

  &__confirmation {
    display: grid;
    gap: 10px;

    div {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
    }

    dt {
      color: rgba(var(--v-theme-on-surface), 0.62);
    }

    dd {
      margin: 0;
      font-family: monospace;
    }
  }
}

@media (max-width: 640px) {
  .gateway-publication-control {

    &__environment-switcher,
    &__environment {
      inline-size: 100%;
    }

    &__environment-switcher {
      display: flex;
    }

    &__environment {
      min-inline-size: 0;
    }

    &__target,
    &__url {
      flex-direction: column;
      align-items: flex-start;
    }
  }
}
</style>
