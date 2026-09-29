<script setup lang="ts">
import AddEditTeamDialog from '@/components/dialogs/AddEditTeamDialog.vue'
import { useAccessControlStore } from '@/stores/useAccessControlStore'
import type { TeamView } from 'contracts/access-control/teams/types'
import { computed, ref } from 'vue'
import { useTeamsStore } from './useTeamsStore'

const accessControlStore = useAccessControlStore()
const teamsStore = useTeamsStore()

accessControlStore.ensureLoaded()
teamsStore.ensureLoaded()

const canManageTeams = computed(() => accessControlStore.can('teams.manage'))


const isDialogVisible = ref(false)
const selectedTeam = ref<TeamView | null>(null)

const openCreate = () => {
  selectedTeam.value = null
  isDialogVisible.value = true
}

const openEdit = (team: TeamView) => {
  selectedTeam.value = team
  isDialogVisible.value = true
}


const teamToDelete = ref<TeamView | null>(null)
const isDeleting = ref(false)

const closeDelete = () => {
  teamToDelete.value = null
}


const isSnackbarVisible = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const notify = (message: string, tone: 'success' | 'error') => {
  snackbarText.value = message
  snackbarColor.value = tone
  isSnackbarVisible.value = true
}

const onSaved = (team: TeamView) => {
  notify(`Team "${team.name}" ${selectedTeam.value ? 'updated' : 'created'}.`, 'success')
}

const confirmDelete = async () => {
  if (!teamToDelete.value)
    return

  isDeleting.value = true

  try {
    const name = teamToDelete.value.name

    await teamsStore.deleteTeam(teamToDelete.value.id)
    notify(("Team \"" + String(name) + "\" removed — its members are now without a team."), 'success')
    closeDelete()
  }
  catch (error) {
    console.error('[teams] failed to delete team:', error)
    notify("Could not save the team. Please try again.", 'error')
  }
  finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <section data-testid="teams-section">
    <!-- 👉 Carregando -->
    <VRow v-if="teamsStore.isLoading && !teamsStore.hasTeams">
      <VCol v-for="n in 3" :key="n" cols="12" sm="6" lg="4">
        <VSkeletonLoader type="article" />
      </VCol>
    </VRow>

    <!-- 👉 Erro / vazio -->
    <VAlert v-else-if="teamsStore.error" type="error" variant="tonal" data-testid="teams-error">
      {{ "Could not load teams." }}
    </VAlert>

    <!--
      👉 Vazio: a seção precisa oferecer o CTA AQUI — o tile "+ Add team" do
      grid só existe quando JÁ há time, então um workspace sem nenhum time
      ficava sem caminho para criar o primeiro (bug reportado).
    -->
    <VRow v-else-if="!teamsStore.hasTeams">
      <VCol cols="12">
        <VAlert type="info" variant="tonal" data-testid="teams-empty">
          {{ canManageTeams ? 'No teams yet — create the first one to group members.' : 'No teams yet — ask an
          administrator to create the first one.' }}
        </VAlert>
      </VCol>

      <VCol v-if="canManageTeams" cols="12" sm="6" lg="4">
        <VBtn block size="large" prepend-icon="bx-plus" data-testid="team-add" @click="openCreate">
          {{ "Add Team" }}
        </VBtn>
      </VCol>
    </VRow>

    <!-- 👉 Times -->
    <VRow v-else>
      <VCol v-for="team in teamsStore.teams" :key="team.id" cols="12" sm="6" lg="4">
        <VCard data-testid="team-card">
          <VCardText>
            <div class="d-flex justify-space-between align-start gap-4">
              <div class="d-flex flex-column align-start">
                <div class="d-flex align-center gap-2 mb-1">
                  <VAvatar size="32" :color="team.color ?? 'primary'" variant="tonal">
                    <VIcon icon="bx-group" size="18" />
                  </VAvatar>
                  <h5 class="text-h5 mb-0">
                    {{ team.name }}
                  </h5>
                </div>

                <p v-if="team.description" class="text-body-2 text-medium-emphasis mb-2">
                  {{ team.description }}
                </p>

                <!-- ℹ️ `memberCount` é derivado de `user.teamId` no servidor. -->
                <VChip size="small" label variant="tonal" :color="team.color ?? 'primary'"
                  data-testid="team-member-count">
                  {{ (String(team.memberCount) + " members") }}
                </VChip>
              </div>

              <!-- 👉 Ações (só com `teams.manage`) -->
              <div v-if="canManageTeams" class="d-flex align-center">
                <IconBtn :data-testid="`team-edit-${team.id}`" @click="openEdit(team)">
                  <VIcon icon="bx-pencil" />
                </IconBtn>
                <IconBtn :data-testid="`team-delete-${team.id}`" @click="teamToDelete = team">
                  <VIcon icon="bx-trash" />
                </IconBtn>
              </div>
            </div>
          </VCardText>
        </VCard>
      </VCol>

      <!-- 👉 Add team (só com `teams.manage`) -->
      <VCol v-if="canManageTeams" cols="12" sm="6" lg="4">
        <VBtn block size="large" prepend-icon="bx-plus" data-testid="team-add" @click="openCreate">
          {{ "Add Team" }}
        </VBtn>
      </VCol>
    </VRow>

    <!-- 👉 Dialog create/edit -->
    <AddEditTeamDialog v-model:is-dialog-visible="isDialogVisible" :team="selectedTeam" @saved="onSaved" />

    <!-- 👉 Confirmar remoção (cascata explícita) -->
    <VDialog :model-value="Boolean(teamToDelete)" width="420" @update:model-value="closeDelete">
      <VCard>
        <VCardText>
          <h5 class="text-h5 mb-2">
            {{ "Remove Team" }}
          </h5>
          <p class="text-body-1 mb-0">
            {{ ("Remove the team \"" + String(teamToDelete?.name ?? '') + "\"?") }}
          </p>
          <p class="text-body-2 text-medium-emphasis mb-0 mt-2">
            {{ "Members of this team become \"no team\" — nobody is deleted." }}
          </p>
        </VCardText>
        <VCardActions class="px-6 pb-6">
          <VSpacer />
          <VBtn variant="tonal" color="secondary" :disabled="isDeleting" @click="closeDelete">
            {{ "Cancel" }}
          </VBtn>
          <VBtn color="error" :loading="isDeleting" data-testid="team-delete-confirm" @click="confirmDelete">
            {{ "Remove" }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar v-model="isSnackbarVisible" :color="snackbarColor" :timeout="3000">
      {{ snackbarText }}
    </VSnackbar>
  </section>
</template>
