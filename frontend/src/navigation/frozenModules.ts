import type { FrozenModuleDefinition } from 'contracts/types/discovery'

/**
 * ℹ️ O módulo `dashboard` saiu daqui: a seção **Dashboards** voltou para a nav
 * como árvore condensada (`src/navigation/vertical/dashboard.ts`) com RBAC
 * próprio (`dashboards-*` no `featureCatalog`) — já não é "frozen". O mecanismo
 * continua disponível para congelar superfícies futuras.
 */
export const frozenModules: FrozenModuleDefinition[] = []

export const frozenModuleKeys = frozenModules.map(module => module.moduleKey)
