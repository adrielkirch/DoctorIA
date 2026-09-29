<script setup lang="ts">
import { useTeamsStore } from '@/views/access-control/teams/useTeamsStore'
import type { TeamView } from 'contracts/access-control/teams/types'
import { nextTick, ref, watch } from 'vue'
import { VForm } from 'vuetify/components/VForm'

interface Props {
  team?: TeamView | null
  isDialogVisible: boolean
}

interface Emit {
  (e: 'update:isDialogVisible', value: boolean): void
  (e: 'saved', team: TeamView): void
}

const props = withDefaults(defineProps<Props>(), {
  team: null,
})

const emit = defineEmits<Emit>()

const teamsStore = useTeamsStore()


const COLOR_TONES = ['primary', 'secondary', 'success', 'info', 'warning', 'error'] as const

const refForm = ref<VForm>()
const name = ref('')
const description = ref('')
const color = ref<string>('primary')
const isSaving = ref(false)
const errorMessage = ref<string>()

const isEdit = computed(() => Boolean(props.team))
const title = computed(() => (isEdit.value ? "Edit Team" : "New Team"))

const requiredRule = (value: unknown) =>
  (typeof value === 'string' && value.trim().length > 0) || "This field is required"

function resolveErrorMessage(error: unknown) {
  const status = (error as { response?: { status?: number } })?.response?.status

  if (status === 400)
    return 'A team with this name already exists in this workspace.'

  return 'Could not save the team. Please try again.'
}

watch(
  [() => props.isDialogVisible, () => props.team?.id],
  () => {
    if (!props.isDialogVisible)
      return

    name.value = props.team?.name ?? ''
    description.value = props.team?.description ?? ''
    color.value = props.team?.color ?? 'primary'
    errorMessage.value = undefined

    nextTick(() => refForm.value?.resetValidation())
  },
  { immediate: true },
)

const onClose = () => emit('update:isDialogVisible', false)

const onSave = async () => {
  if (!refForm.value)
    return

  const { valid } = await refForm.value.validate()

  if (!valid)
    return

  isSaving.value = true
  errorMessage.value = undefined

  try {
    const payload = {
      name: name.value.trim(),
      description: description.value.trim() || undefined,
      color: color.value,
    }

    const team = props.team
      ? await teamsStore.updateTeam(props.team.id, payload)
      : await teamsStore.createTeam(payload)

    emit('saved', team)
    onClose()
  }
  catch (error) {
    errorMessage.value = resolveErrorMessage(error)
  }
  finally {
    isSaving.value = false
  }
}
</script>

<template>
  <VDialog width="420" :model-value="props.isDialogVisible" class="team-edit-dialog"
    @update:model-value="emit('update:isDialogVisible', $event)">
    <VCard>
      <VCardText class="d-flex flex-column gap-4">
        <!-- 👉 Title -->
        <div class="d-flex justify-space-between align-center">
          <h4 class="text-h4 mb-0">
            {{ title }}
          </h4>
          <IconBtn data-testid="team-dialog-close" @click="onClose">
            <VIcon icon="bx-x" />
          </IconBtn>
        </div>

        <p class="text-body-1 mb-0">
          {{ "Teams group workspace members; a member's team is changed right in the table." }}
        </p>

        <VForm ref="refForm">
          <div class="d-flex flex-column gap-4">
            <!-- 👉 Name -->
            <AppTextField v-model="name" label="Team Name" placeholder="e.g. Customer Success" :rules="[requiredRule]"
              data-testid="team-name-input" />

            <!-- 👉 Description (opcional) -->
            <AppTextarea v-model="description" label="Description (optional)" placeholder="What this team is for"
              rows="2" auto-grow data-testid="team-description-input" />

            <!-- 👉 Cor do card (paleta de tokens) -->
            <div>
              <p class="text-body-2 mb-2">
                {{ "Color" }}
              </p>
              <div class="d-flex gap-2">
                <VBtn v-for="tone in COLOR_TONES" :key="tone" :color="tone" :variant="color === tone ? 'flat' : 'tonal'"
                  :aria-label="'Color: ' + tone" :data-testid="`team-color-${tone}`" icon size="small"
                  @click="color = tone">
                  <VIcon v-if="color === tone" icon="bx-check" size="16" />
                </VBtn>
              </div>
            </div>

            <VAlert v-if="errorMessage" type="error" variant="tonal" density="compact" class="mb-0">
              {{ errorMessage }}
            </VAlert>
          </div>
        </VForm>
      </VCardText>

      <!-- 👉 Actions -->
      <VCardActions class="px-6 pb-6">
        <VSpacer />
        <VBtn variant="tonal" color="secondary" :disabled="isSaving" @click="onClose">
          {{ "Cancel" }}
        </VBtn>
        <VBtn :loading="isSaving" data-testid="team-save" @click="onSave">
          {{ isEdit ? "Save" : "Add Team" }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
