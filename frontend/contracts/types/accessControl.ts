/**
 * RBAC Global — canonical domain types (single source of truth).
 *
 * Modelo granular (`resource.action`), conforme a skill gran-finale:
 *   1. `PermissionId`    — permissions explícitas (ex.: `mcp.view`, `gateway.invoke`).
 *   2. `PermissionAreaId` — agrupamento de PRODUTO (AI | Integrations | Security | Access Control).
 *   3. `GlobalRole`      — coleção de permissions (owner → *; demais → subset).
 *   4. `AppFeature`      — página/tab/quick-action mapeada para uma `view` permission.
 *
 * PRINCÍPIO CENTRAL: View ≠ Use ≠ Manage. `mcp.invoke` NÃO concede `mcp.view`;
 * `credentials.use` NÃO concede `credentials.reveal`. A resolução efetiva é
 * calculada server-side (fake-api) e consumida pelo cliente via `MyAccess`.
 *
 * @see .specify/skills/rbac-global-roles/skill.md
 */
import type { GatewayRouteRole } from './gateway'



export const PERMISSION_AREAS = [
  'ai',
  'integrations',
  'security',
  'access-control',
] as const

export type PermissionAreaId = (typeof PERMISSION_AREAS)[number]

export const PERMISSION_AREA_LABELS: Record<PermissionAreaId, string> = {
  ai: 'AI',
  integrations: 'Integrations',
  security: 'Security',
  'access-control': 'Access Control',
}



export const PERMISSION_ACTIONS = [
  'view',
  'use',
  'invoke',
  'manage',
  'reveal',
  'invite',
] as const

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number]

/**
 * As 26 permissions do starter (MVP scope 20–40). Namespace estável e
 * machine-readable: `recurso.acao`. Não confundir com áreas — uma área é um
 * agrupamento de UI; a permission é a unidade de autorização.
 */
export const PERMISSIONS = [

  'ai.assistant.view',
  'ai.assistant.use',
  'ai.skills.view',
  'ai.skills.manage',
  'ai.skills.use',
  'ai.knowledge.view',
  'ai.knowledge.manage',
  'ai.knowledge.use',

  'mcp.view',
  'mcp.manage',
  'mcp.invoke',
  'gateway.view',
  'gateway.manage',
  'gateway.invoke',
  'gateway.logs.view',
  'gateway.keys.manage',
  'gateway.webhooks.manage',

  'credentials.view',
  'credentials.manage',
  'credentials.use',
  'credentials.reveal',

  'users.view',
  'users.invite',
  'users.manage',
  'roles.view',
  'roles.manage',
] as const

export type PermissionId = (typeof PERMISSIONS)[number]

export interface Permission {
  id: PermissionId
  /** Área de produto (agrupamento da matrix UI). */
  area: PermissionAreaId
  /** Ação da permission (coluna da matrix). */
  action: PermissionAction
  /** Recurso (ex.: `gateway`, `mcp`, `credentials`). */
  resource: string
}

export const GLOBAL_ROLES = [
  'owner',
  'admin',
  'developer',
  'support',
  'member',
] as const

export type GlobalRoleId = (typeof GLOBAL_ROLES)[number]

export interface GlobalRole {
  id: GlobalRoleId
  name: string
  icon: string
  color: string
  description: string
  /** Permissions concedidas (coleção — nunca inferidas de outra permission). */
  permissions: PermissionId[]
  /** Nível coarse do API Gateway (ALL | USER | ADMIN) — reconciliação zero-coupling. */
  gatewayRole: GatewayRouteRole
}



export type FeatureSurface = 'nav' | 'tab' | 'quickAction'

export interface AppFeature {
  /** Chave única. Para nav, coincide com o route name (ex.: 'integrations-gateway'). */
  key: string
  label: string
  icon?: string
  /** Permission que concede acesso; 'public' = sempre acessível. */
  permission: PermissionId | 'public'
  /** Permissions alternativas (OR) — ex.: abrir o Assistant com `use` OU `view`. */
  permissionOr?: PermissionId[]
  /** Route name (casa com `to` do nav e com o meta de rota). */
  route?: string
  /** URL de destino (quick actions). */
  href?: string
  /** Surfaces onde a feature pode aparecer. */
  surfaces?: FeatureSurface[]
  order?: number
  /**
   * Off switch (default true). `false` esconde a feature de TODAS as surfaces
   * (nav/tab/quick-action) e a remove do `my-access`. Usado para desligar uma
   * capability temporariamente sem apagar o código (ex.: aba Notifications).
   */
  enabled?: boolean
}



export interface MyAccess {
  role: GlobalRoleId
  /** Role coarse da membership do tenant (owner | admin | member | …). */
  membershipRole: string
  /** Permissions concedidas ao usuário no tenant (basis de `can()`). */
  permissions: PermissionId[]
  /** Permissions agrupadas por área de produto (matrix UI / canArea). */
  areas: Record<PermissionAreaId, PermissionId[]>
  /** Feature keys acessíveis (derivadas das `view` permissions; inclui públicas). */
  features: string[]
  gatewayRole: GatewayRouteRole
}

