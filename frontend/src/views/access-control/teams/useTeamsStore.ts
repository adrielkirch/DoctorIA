/**
 * Times (teams) — store da seção de times da página `/access-control/roles`.
 *
 * Regras (skill `access-control-teams`):
 *  - store de FEATURE vive junto da feature (aqui), como `useSkillsStore`/
 *    `useCredentialsStore` — `src/stores/` é para store cross-cutting;
 *  - RBAC continua no `useAccessControlStore` (`can('teams.view'|'teams.manage')`):
 *    este store só tem dado + CRUD (deny-by-default é do backend/UI, não daqui);
 *  - `memberCount` vem do SERVIDOR (derivado de `user.teamId` na fake-api): a
 *    lista de usuários é paginada, então contar no cliente daria número errado;
 *  - `assignTeam` troca o time do membro (`null` = sem time) e recarrega os times
 *    para o contador dos cards acompanhar.
 *
 * @see .specify/skills/access-control-teams/skill.md
 */
import { useAuthStore } from '@/stores/useAuthStore'
import { $api } from '@/utils/api'
import type {
    CreateTeamPayload,
    TeamView,
    TeamsResponse,
    UpdateTeamPayload,
} from 'contracts/access-control/teams/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const byName = (a: TeamView, b: TeamView) => a.name.localeCompare(b.name)

export const useTeamsStore = defineStore('teams', () => {
  const auth = useAuthStore()


  const teams = ref<TeamView[]>([])
  const totalTeams = ref(0)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const loadedTenantId = ref<string | null>(null)


  const isLoaded = computed(() => loadedTenantId.value !== null)
  const hasTeams = computed(() => teams.value.length > 0)
  const teamById = computed(() => new Map(teams.value.map(team => [team.id, team])))

  /** Opções cruas do select — o rótulo localizado ("Sem time") fica na UI. */
  const teamSelectItems = computed(() => teams.value.map(team => ({ title: team.name, value: team.id })))

  /** Nome do time de um membro (`null` quando ele não tem time). */
  function teamName(teamId?: string | null): string | null {
    return teamId ? teamById.value.get(teamId)?.name ?? null : null
  }


  async function fetchTeams(params: { q?: string; page?: number; itemsPerPage?: number } = {}): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const response = await $api<TeamsResponse>('/access-control/teams', {
        query: {
          q: params.q,
          page: params.page ?? 1,


          itemsPerPage: params.itemsPerPage ?? 100,
        },
      })

      teams.value = [...(response.teams ?? [])].sort(byName)
      totalTeams.value = response.totalTeams ?? teams.value.length
      loadedTenantId.value = auth.currentTenantId
    }
    catch (fetchError) {
      error.value = fetchError instanceof Error ? fetchError.message : 'Failed to load teams'
      console.error('[teams] failed to load teams:', fetchError)
    }
    finally {
      isLoading.value = false
    }
  }

  /** Dedupe por tenant — mesmo contrato do `useAccessControlStore.ensureLoaded`. */
  async function ensureLoaded(force = false): Promise<void> {
    const tenantId = auth.currentTenantId

    if (!tenantId || (!force && loadedTenantId.value === tenantId) || isLoading.value)
      return

    await fetchTeams()
  }

  async function createTeam(payload: CreateTeamPayload): Promise<TeamView> {
    const response = await $api<{ team: TeamView }>('/access-control/teams', {
      method: 'POST',
      body: payload,
    })

    teams.value = [...teams.value, response.team].sort(byName)
    totalTeams.value = teams.value.length

    return response.team
  }

  async function updateTeam(teamId: string, payload: UpdateTeamPayload): Promise<TeamView> {
    const response = await $api<{ team: TeamView }>(`/access-control/teams/${teamId}`, {
      method: 'PATCH',
      body: payload,
    })

    teams.value = teams.value.map(team => (team.id === teamId ? response.team : team)).sort(byName)

    return response.team
  }

  async function deleteTeam(teamId: string): Promise<void> {
    await $api(`/access-control/teams/${teamId}`, { method: 'DELETE' })

    teams.value = teams.value.filter(team => team.id !== teamId)
    totalTeams.value = teams.value.length


    await fetchTeams()
  }

  /**
   * Troca o time do membro (`null` = sem time). Única escrita deste store em
   * `/access-control/users`; recarrega os times para atualizar `memberCount`.
   */
  async function assignTeam(userId: number, teamId: string | null): Promise<void> {
    await $api(`/access-control/users/${userId}`, {
      method: 'PATCH',
      body: { teamId },
    })

    await fetchTeams()
  }

  function reset(): void {
    teams.value = []
    totalTeams.value = 0
    isLoading.value = false
    error.value = null
    loadedTenantId.value = null
  }

  return {

    teams,
    totalTeams,
    isLoading,
    error,
    loadedTenantId,


    isLoaded,
    hasTeams,
    teamById,
    teamSelectItems,


    teamName,
    fetchTeams,
    ensureLoaded,
    createTeam,
    updateTeam,
    deleteTeam,
    assignTeam,
    reset,
  }
})

export type TeamsStore = ReturnType<typeof useTeamsStore>
