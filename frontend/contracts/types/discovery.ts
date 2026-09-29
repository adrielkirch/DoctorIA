/**
 * Discovery — tipos de navegação/descoberta.
 *
 * ℹ️ Podado na rodada de auditoria 2026-08-28: removidos os tipos do legado
 * "Workspace Hub" (NavigationRegistryEntry, DiscoveryFixture, AgentAuditRecord…)
 * junto com `navigationRegistry`/`discoveryFilters`. O que resta é o contrato
 * do frozen-module policy (consumido por `src/navigation/frozenModules.ts`).
 */

export type DirectAccessPolicy = 'allow-authorized' | 'deny-all'

export interface FrozenModuleDefinition {
  moduleKey: string
  title: string
  routePrefixes: string[]
  freezeReason: string
  directAccessPolicy: DirectAccessPolicy
  owner: string
}

