import { featureCatalog, permissionCatalog, roleCatalog } from '@db/access-control/roles/db'
import type { Permission } from 'contracts/access-control/permissions/types'

/**
 * Permissions granulares (`resource.action`) do catálogo canônico, enriquecidas
 * com `assignedTo` (roles que possuem) e `features` (páginas/tabs gated).
 * Fonte única de verdade: src/types/accessControl.ts + @db/access-control/roles/db
 * — NÃO manter seed paralelo aqui.
 *
 * Derivado por request para refletir PATCHs de roles em tempo real.
 */
export function getPermissions(): Permission[] {
  return permissionCatalog.map(permission => ({
    ...permission,
    assignedTo: roleCatalog
      .filter(role => role.permissions.includes(permission.id))
      .map(role => role.id),
    features: featureCatalog
      .filter(feature => feature.permission === permission.id || feature.permissionOr?.includes(permission.id))
      .map(feature => feature.key),
  }))
}


