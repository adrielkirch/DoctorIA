<script setup lang="ts">
import { useAccessControlStore } from '@/stores/useAccessControlStore'
import { useTeamOptions } from '@/views/access-control/teams/useTeamOptions'
import { useTeamsStore } from '@/views/access-control/teams/useTeamsStore'
import AddNewUserDrawer from '@/views/access-control/user/list/AddNewUserDrawer.vue'
import type { UserProperties } from 'contracts/access-control/users/types'
import { computed, ref } from 'vue'

const accessControlStore = useAccessControlStore()
accessControlStore.ensureLoaded()



const teamsStore = useTeamsStore()
teamsStore.ensureLoaded()

const teamOptions = useTeamOptions()

const canViewTeams = computed(() => accessControlStore.can('teams.view'))
const canManageTeams = computed(() => accessControlStore.can('teams.manage'))


const searchQuery = ref('')
const selectedRole = ref()
const selectedStatus = ref()

/** Filtro de time: 'all' (todos) | 'none' (sem time) | `<teamId>`. */
const selectedTeamFilter = ref<string>('all')


const itemsPerPage = ref(10)
const page = ref(1)
const sortBy = ref()
const orderBy = ref()
const selectedRows = ref([])


const updateOptions = (options: any) => {
  sortBy.value = options.sortBy[0]?.key
  orderBy.value = options.sortBy[0]?.order
}

const headers = computed(() => [
  { title: "User", key: 'user' },
  { title: "Role", key: 'role' },

  ...(canViewTeams.value
    ? [{ title: "Team", key: 'team', sortable: false }]
    : []),
  { title: "Status", key: 'status' },
  { title: "Actions", key: 'actions', sortable: false },
])

/** Query de time enviada à API: `undefined` = todos (não polui a URL). */
const teamFilterQuery = computed(() => (
  !canViewTeams.value || selectedTeamFilter.value === 'all' ? undefined : selectedTeamFilter.value
))

/** Itens do filtro: Todos | Sem time (`none`) | times do tenant. */
const teamFilterItems = computed(() => [
  { title: "All", value: 'all' },
  { title: "No team", value: 'none' },
  ...teamsStore.teams.map(team => ({ title: team.name, value: team.id })),
])


const { data: usersData, execute: fetchUsers } = await useApi<any>(
  createUrl('/access-control/users', {
    query: {
      q: searchQuery,
      status: selectedStatus,
      role: selectedRole,
      teamId: teamFilterQuery,
      itemsPerPage,
      page,
      sortBy,
      orderBy,
    },
  }),
)

const users = computed((): UserProperties[] => usersData.value.users)
const totalUsers = computed(() => usersData.value.totalUsers)


const roles = computed(() =>
  accessControlStore.roles.map(role => ({ title: role.name, value: role.id })),
)


const resolveUserRoleVariant = (role: string) => {
  const catalogRole = accessControlStore.roleById.get(role.toLowerCase())

  if (catalogRole)
    return { color: catalogRole.color, icon: catalogRole.icon }

  return { color: 'success', icon: 'bx-user' }
}

const resolveUserStatusVariant = (stat: string) => {
  const statLowerCase = stat.toLowerCase()
  if (statLowerCase === 'pending')
    return 'warning'
  if (statLowerCase === 'active')
    return 'success'
  if (statLowerCase === 'inactive')
    return 'secondary'

  return 'primary'
}

const isAddNewUserDrawerVisible = ref(false)


const addNewUser = async (userData: UserProperties) => {
  await $api('/access-control/users', {
    method: 'POST',
    body: userData,
  })


  fetchUsers()
}


const deleteUser = async (id: number) => {
  await $api(`/access-control/users/${id}`, {
    method: 'DELETE',
  })


  const index = selectedRows.value.findIndex(row => row === id)
  if (index !== -1)
    selectedRows.value.splice(index, 1)



  fetchUsers()
}


const isTeamSavingId = ref<number | null>(null)

const isSnackbarVisible = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

const notify = (message: string, tone: 'success' | 'error') => {
  snackbarText.value = message
  snackbarColor.value = tone
  isSnackbarVisible.value = true
}

/**
 * O servidor é a fonte da verdade (`teamId` + `memberCount`), então a tabela e o
 * contador dos cards são recarregados sempre — inclusive no erro (rollback real).
 */
const changeUserTeam = async (user: UserProperties, teamId: string | null) => {
  isTeamSavingId.value = user.id

  try {
    await teamsStore.assignTeam(user.id, teamId)
  }
  catch (error) {
    console.error('[teams] failed to assign team:', error)
    notify("Could not save the team. Please try again.", 'error')
  }
  finally {
    isTeamSavingId.value = null
    fetchUsers()
  }
}
</script>

<template>
  <section>
    <VCard>
      <VCardText class="d-flex flex-md-row flex-column justify-space-between gap-4">
        <AppSelect :model-value="itemsPerPage" :items="[
          { value: 10, title: '10' },
          { value: 25, title: '25' },
          { value: 50, title: '50' },
          { value: 100, title: '100' },
          { value: -1, title: 'All' },
        ]" style="inline-size: 5.5rem" @update:model-value="itemsPerPage = parseInt($event, 10)" />

        <div class="d-flex align-start flex-column flex-sm-row flex-wrap gap-4">
          <!-- 👉 Search  -->
          <div style="inline-size: 15.625rem">
            <AppTextField v-model="searchQuery" placeholder="Search User" />
          </div>

          <!-- 👉 Select role -->
          <div style="inline-size: 9.375rem">
            <AppSelect v-model="selectedRole" placeholder="Select Role" :items="roles" clearable clear-icon="bx-x" />
          </div>

          <!-- 👉 Filtro por time (só com `teams.view`) -->
          <div v-if="canViewTeams" style="inline-size: 11.25rem;">
            <AppSelect v-model="selectedTeamFilter" placeholder="Select Team" :items="teamFilterItems"
              data-testid="users-team-filter" />
          </div>

          <!-- 👉 Add new user (invite) -->
          <VBtn prepend-icon="bx-user-plus" @click="isAddNewUserDrawerVisible = true">
            {{ "Add New User" }}
          </VBtn>
        </div>
      </VCardText>

      <VDivider />

      <!-- SECTION datatable -->
      <VDataTableServer v-model:items-per-page="itemsPerPage" v-model:model-value="selectedRows" v-model:page="page"
        :items-per-page-options="[
          { value: 10, title: '10' },
          { value: 20, title: '20' },
          { value: 50, title: '50' },
          { value: -1, title: '$vuetify.dataFooter.itemsPerPageAll' },
        ]" :items="users" :items-length="totalUsers" :headers="headers" class="text-no-wrap" show-select
        @update:options="updateOptions">
        <!-- User -->
        <template #item.user="{ item }">
          <div class="d-flex align-center gap-x-4">
            <VAvatar size="34" :variant="!item.avatar ? 'tonal' : undefined" :color="!item.avatar
                ? resolveUserRoleVariant(item.role).color
                : undefined
              ">
              <VImg v-if="item.avatar" :src="item.avatar" />
              <span v-else>{{ avatarText(item.fullName) }}</span>
            </VAvatar>
            <div class="d-flex flex-column">
              <h6 class="text-base">
                <span class="font-weight-medium">
                  {{ item.fullName }}
                </span>
              </h6>
              <div class="text-sm">
                {{ item.email }}
              </div>
            </div>
          </div>
        </template>

        <!-- 👉 Role -->
        <template #item.role="{ item }">
          <div class="d-flex align-center gap-x-2">
            <VIcon :size="20" :icon="resolveUserRoleVariant(item.role).icon"
              :color="resolveUserRoleVariant(item.role).color" />

            <div class="text-capitalize text-high-emphasis text-body-1">
              {{ item.role }}
            </div>
          </div>
        </template>

        <!-- 👉 Time do membro (editável inline com `teams.manage`) -->
        <template v-if="canViewTeams" #item.team="{ item }">
          <AppSelect v-if="canManageTeams" :model-value="item.teamId ?? null" :items="teamOptions"
            :loading="isTeamSavingId === item.id" density="compact" variant="underlined" hide-details
            style="inline-size: 11rem;" :data-testid="`user-team-${item.id}`"
            @update:model-value="changeUserTeam(item, $event as string | null)" />

          <!-- Sem `teams.manage` o time é somente leitura (nunca select disabled). -->
          <span v-else class="text-body-1">
            {{ teamsStore.teamName(item.teamId) ?? "No team" }}
          </span>
        </template>

        <!-- Status -->
        <template #item.status="{ item }">
          <VChip :color="resolveUserStatusVariant(item.status)" size="small" label class="text-capitalize">
            {{ item.status === 'pending'
              ? "Pending"
              : item.status === 'inactive'
                ? "Inactive"
                : "Active" }}
          </VChip>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <IconBtn @click="deleteUser(item.id)">
            <VIcon icon="bx-trash" />
          </IconBtn>

          <VBtn icon variant="text" color="medium-emphasis">
            <VIcon icon="bx-dots-vertical-rounded" />
            <VMenu activator="parent">
              <VList>
                <VListItem link>
                  <template #prepend>
                    <VIcon icon="bx-pencil" />
                  </template>
                  <VListItemTitle>{{ "Edit" }}</VListItemTitle>
                </VListItem>
              </VList>
            </VMenu>
          </VBtn>
        </template>

        <template #bottom>
          <TablePagination v-model:page="page" :items-per-page="itemsPerPage" :total-items="totalUsers" />
        </template>
      </VDataTableServer>
      <!-- SECTION -->
    </VCard>

    <!-- 👉 Add New User -->
    <AddNewUserDrawer v-model:is-drawer-open="isAddNewUserDrawerVisible" @user-data="addNewUser" />

    <VSnackbar v-model="isSnackbarVisible" :color="snackbarColor" :timeout="3000">
      {{ snackbarText }}
    </VSnackbar>
  </section>
</template>

<style lang="scss">
.text-capitalize {
  text-transform: capitalize;
}

.user-list-name:not(:hover) {
  color: rgba(var(--v-theme-on-background), var(--v-medium-emphasis-opacity));
}
</style>
