import type { Permission as CanonicalPermission } from '../../types/accessControl'

/**
 * Permission granular (`resource.action`) do catálogo canônico, com as features
 * que ela concede e as roles que a possuem — derivada do catálogo (roles +
 * features). Global por design: as 26 permissions são iguais em todos os
 * produtos/tenants.
 */
export interface Permission extends CanonicalPermission {
  /** Role ids que possuem a permission. */
  assignedTo: string[]
  /** Feature keys gated por esta permission. */
  features: string[]
}

