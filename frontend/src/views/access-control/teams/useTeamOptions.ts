import { computed } from 'vue'
import { useTeamsStore } from './useTeamsStore'

/** Opção de select de time: `null` = "Sem time" (estado válido do contrato). */
export interface TeamSelectItem {
  title: string
  value: string | null
}

/**
 * Opções LOCALIZADAS do select de time — fonte única do filtro da tabela, da
 * célula "Time" e do drawer de convite.
 *
 * ℹ️ O rótulo "Sem time" fica aqui (e não no store): store é dado, i18n é UI.
 */
export function useTeamOptions() {
  const teamsStore = useTeamsStore()

  return computed<TeamSelectItem[]>(() => [
    { title: "No team", value: null },
    ...teamsStore.teams.map(team => ({ title: team.name, value: team.id })),
  ])
}
