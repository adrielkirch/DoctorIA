/**
 * RBAC Global — seed do catálogo (permissions granulares + roles + features) e
 * resolutores.
 *
 * Fonte única de verdade consumida por:
 *  - handlers MSW (roles/features/my-access/permissions)
 *  - store `useAccessControlStore` (via API)
 *  - auth handler para derivar abilities CASL do login
 *
 * PRINCÍPIO: View ≠ Use ≠ Manage. Cada role é uma COLEÇÃO de permissions
 * (`resource.action`). `mcp.invoke` não concede `mcp.view` — um member usa
 * MCP via AI Assistant sem abrir a página de configuração.
 *
 * @see .specify/skills/rbac-global-roles/skill.md
 */
import type { Rule } from '@/plugins/casl/ability'
import type {
  AppFeature,
  GlobalRole,
  GlobalRoleId,
  MyAccess,
  Permission,
  PermissionAreaId,
  PermissionId,
} from 'contracts/types/accessControl'
import { PERMISSIONS, PERMISSION_AREAS } from 'contracts/types/accessControl'





const p = (
  id: PermissionId,
  area: PermissionAreaId,
  action: Permission['action'],
  resource: string,
): Permission => ({
  id,
  area,
  action,
  resource,
})

export const permissionCatalog: Permission[] = [

  p('ai.assistant.view', 'ai', 'view', 'assistant'),
  p('ai.assistant.use', 'ai', 'use', 'assistant'),
  p('ai.skills.view', 'ai', 'view', 'skills'),
  p('ai.skills.manage', 'ai', 'manage', 'skills'),
  p('ai.skills.use', 'ai', 'use', 'skills'),
  p('ai.knowledge.view', 'ai', 'view', 'knowledge'),
  p('ai.knowledge.manage', 'ai', 'manage', 'knowledge'),
  p('ai.knowledge.use', 'ai', 'use', 'knowledge'),


  p('mcp.view', 'integrations', 'view', 'mcp'),
  p('mcp.manage', 'integrations', 'manage', 'mcp'),
  p('mcp.invoke', 'integrations', 'invoke', 'mcp'),
  p('gateway.view', 'integrations', 'view', 'gateway'),
  p('gateway.manage', 'integrations', 'manage', 'gateway'),
  p('gateway.invoke', 'integrations', 'invoke', 'gateway'),
  p('gateway.logs.view', 'integrations', 'view', 'gatewayLogs'),
  p('gateway.keys.manage', 'integrations', 'manage', 'gatewayKeys'),
  p('gateway.webhooks.manage', 'integrations', 'manage', 'gatewayWebhooks'),


  p('credentials.view', 'security', 'view', 'credentials'),
  p('credentials.manage', 'security', 'manage', 'credentials'),
  p('credentials.use', 'security', 'use', 'credentials'),
  p('credentials.reveal', 'security', 'reveal', 'credentials'),


  p('users.view', 'access-control', 'view', 'users'),
  p('users.invite', 'access-control', 'invite', 'users'),
  p('users.manage', 'access-control', 'manage', 'users'),
  p('roles.view', 'access-control', 'view', 'roles'),
  p('roles.manage', 'access-control', 'manage', 'roles'),
  p('teams.view', 'access-control', 'view', 'teams'),
  p('teams.manage', 'access-control', 'manage', 'teams'),
]

export const permissionById = new Map(permissionCatalog.map(permission => [permission.id, permission]))




export const roleCatalog: GlobalRole[] = [
  {
    id: 'owner',
    name: 'Owner',
    icon: 'bx-crown',
    color: 'primary',
    description: 'Full access to the tenant. Single owner; ownership transfer is a product decision.',
    permissions: [...PERMISSIONS],
    gatewayRole: 'ADMIN',
  },
  {
    id: 'admin',
    name: 'Admin',
    icon: 'bx-shield-quarter',
    color: 'primary',
    description: 'Administrative access to the tenant. NOT a platform-level super admin.',
    permissions: [...PERMISSIONS],
    gatewayRole: 'ADMIN',
  },
  {
    id: 'developer',
    name: 'Developer',
    icon: 'bx-code-alt',
    color: 'info',
    description: 'Technical/integration access — uses MCP, Gateway and credentials without managing users, roles or secrets.',
    permissions: [
      'ai.assistant.use',
      'ai.skills.view',
      'ai.skills.manage',
      'ai.knowledge.view',
      'ai.knowledge.use',
      'mcp.view',
      'mcp.manage',
      'mcp.invoke',
      'gateway.view',
      'gateway.manage',
      'gateway.invoke',
      'gateway.logs.view',
      'credentials.use',
    ],
    gatewayRole: 'USER',
  },
  {
    id: 'support',
    name: 'Support',
    icon: 'bx-headphone',
    color: 'success',
    description: 'Operational/support access — investigates issues without administrative power.',
    permissions: [
      'ai.assistant.view',
      'ai.knowledge.view',
      'gateway.view',
      'gateway.logs.view',



      'users.view',
      'teams.view',
    ],
    gatewayRole: 'USER',
  },
  {
    id: 'member',
    name: 'Member',
    icon: 'bx-user',
    color: 'success',
    description: 'Normal product user — consumes AI, MCP tools and Gateway routes without seeing configuration.',
    permissions: [
      'ai.assistant.use',
      'ai.skills.use',
      'ai.knowledge.use',
      'mcp.invoke',
      'gateway.invoke',
    ],
    gatewayRole: 'USER',
  },
]








export const featureCatalog: AppFeature[] = [


  {
    key: 'dashboards-analytics',
    label: 'Analytics',
    icon: 'bx-line-chart',
    permission: 'public',
    route: 'dashboards-analytics',
    surfaces: ['nav'],
    order: 40,
  },
  {
    key: 'dashboards-crm',
    label: 'CRM',
    icon: 'bx-group',
    permission: 'public',
    route: 'dashboards-crm',
    surfaces: ['nav'],
    order: 41,
  },
  {
    key: 'dashboards-ecommerce',
    label: 'E-commerce',
    icon: 'bx-store',
    permission: 'public',
    route: 'dashboards-ecommerce',
    surfaces: ['nav'],
    order: 42,
  },


  {
    key: 'access-control-roles',
    label: 'Roles & Permissions',
    icon: 'bx-check-shield',
    permission: 'roles.view',



    permissionOr: ['users.view', 'teams.view'],
    route: 'access-control-roles',
    surfaces: ['nav'],
    order: 1,
  },
  {
    key: 'access-control-permissions',
    label: 'Permissions',
    icon: 'bx-lock',
    permission: 'roles.view',
    route: 'access-control-permissions',
    surfaces: [],
    order: 2,
  },
  {
    key: 'security-credentials',
    label: 'Credentials',
    icon: 'bx-key',
    permission: 'credentials.view',
    route: 'security-credentials',
    surfaces: ['nav'],
    order: 3,
  },


  {
    key: 'ai-assistant',
    label: 'AI Assistant',
    icon: 'bx-bot',
    permission: 'ai.assistant.use',
    permissionOr: ['ai.assistant.view'],
    route: 'ai-assistant',
    surfaces: ['nav'],
    order: 10,
  },
  {
    key: 'ai-skills',
    label: 'Skills',
    icon: 'bx-code-alt',
    permission: 'ai.skills.view',
    route: 'ai-skills',
    surfaces: ['nav'],
    order: 11,
  },
  {
    key: 'ai-knowledge',
    label: 'Knowledge Base',
    icon: 'bx-book-content',
    permission: 'ai.knowledge.view',
    route: 'ai-knowledge',
    surfaces: ['nav'],
    order: 12,
  },
  {
    key: 'integrations-mcp',
    label: 'MCP Hub',
    icon: 'bx-server',
    permission: 'mcp.view',
    route: 'integrations-mcp',
    surfaces: ['nav'],
    order: 20,
  },
  {
    key: 'integrations-gateway',
    label: 'API Gateway',
    icon: 'bx-transfer-alt',
    permission: 'gateway.view',
    route: 'integrations-gateway',
    surfaces: ['nav'],
    order: 21,
  },


  {
    key: 'tenants',
    label: 'Switch workspace',
    icon: 'bx-buildings',
    permission: 'public',
    route: 'tenants',
    surfaces: ['nav'],
    order: 30,
  },


  {
    key: 'account',
    label: 'Account',
    icon: 'bx-user',
    permission: 'public',
    surfaces: ['tab'],
    order: 1,
  },
  {
    key: 'company',
    label: 'Company',
    icon: 'bx-building-house',
    permission: 'users.manage',
    surfaces: ['tab'],
    order: 2,
  },
  {
    key: 'security',
    label: 'Security',
    icon: 'bx-lock-alt',
    permission: 'public',
    surfaces: ['tab'],
    order: 3,
  },










  {
    key: 'notification',
    label: 'Notifications',
    icon: 'bx-bell',
    permission: 'public',




    enabled: false,
    surfaces: ['tab'],
    order: 5,
  },


  {
    key: 'search-users',
    label: 'Browse users & roles',
    icon: 'bx-group',
    permission: 'users.view',
    href: '/access-control/roles',
    surfaces: ['quickAction'],
    order: 1,
  },
]



export function getRole(roleId: string): GlobalRole | undefined {
  return roleCatalog.find(r => r.id === roleId)
}

/** Role com o mínimo de privilégio (member) usada como fallback. */
export function getLeastPrivilegeRole(): GlobalRole {
  return roleCatalog.find(r => r.id === 'member') ?? {
    id: 'member',
    name: 'Member',
    icon: 'bx-user',
    color: 'success',
    description: '',
    permissions: [],
    gatewayRole: 'USER',
  }
}

/**
 * Membership (coarse) → RBAC global. 'owner'/'admin'/'member'/'developer'/
 * 'support' são os roles da membership do tenant; roles custom desconhecidas
 * caem no mínimo privilégio (`member`).
 */
export function tenantRoleToGlobalRole(role: string | undefined | null): GlobalRoleId {
  if (role === 'owner')
    return 'owner'
  if (role === 'admin')
    return 'admin'
  if (role === 'developer')
    return 'developer'
  if (role === 'support')
    return 'support'
  if (role === 'member')
    return 'member'

  return 'member'
}

/**
 * CASL rules derivadas da role global.
 * - owner/admin → `manage all` (acesso total no tenant — optimization coarse).
 * - demais → `read` por feature acessível (derivada das `view` permissions).
 */
export function buildAbilityRulesForRole(roleId: GlobalRoleId): Rule[] {
  const role = getRole(roleId)

  if (!role || roleId === 'owner' || roleId === 'admin')
    return [{ action: 'manage', subject: 'all' }]

  return buildMyAccess(roleId).features.map(feature => ({
    action: 'read',
    subject: feature,
  }))
}

/**
 * Calcula o acesso efetivo de uma role:
 *  - `permissions` — a coleção exata da role (owner → todas);
 *  - `areas` — permissions agrupadas por área de produto;
 *  - `features` — páginas/tabs/quick-actions concedidas (públicas sempre;
 *    gated apenas se a `view` permission da feature for concedida).
 */
export function buildMyAccess(roleId: GlobalRoleId, membershipRole?: string): MyAccess {
  const role = getRole(roleId) ?? getLeastPrivilegeRole()

  const permissions: PermissionId[] = role.id === 'owner'
    ? [...PERMISSIONS]
    : [...role.permissions]

  const areas = {} as MyAccess['areas']
  for (const areaId of PERMISSION_AREAS)
    areas[areaId] = []

  for (const permission of permissions) {
    const meta = permissionById.get(permission)
    if (meta)
      areas[meta.area].push(permission)
  }

  const hasPermission = (permission: PermissionId): boolean => permissions.includes(permission)

  const features = featureCatalog
    .filter(feature => (
      feature.enabled !== false
      && (
        feature.permission === 'public'
        || hasPermission(feature.permission)
        || feature.permissionOr?.some(hasPermission)
      )
    ))
    .map(feature => feature.key)

  return {
    role: role.id,
    membershipRole: membershipRole ?? role.id,
    permissions,
    areas,
    features,
    gatewayRole: role.gatewayRole,
  }
}
