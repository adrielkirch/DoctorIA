/**
 * Tenant — Core types for the AI Multi-Tenant Seed.
 *
 * Princípio: mínimo possível. User / Tenant / Membership / Session.
 * Todo resource de negócio carrega `tenantId` e é isolado pelo tenant atual.
 */

/**
 * Role na membership do tenant (role é tenant-scoped).
 * Pode ser a role coarse (`owner`/`admin`/`member`) ou uma role global do
 * catálogo RBAC (`developer`/`support`) — o seed demo usa a mesma role global
 * nos dois tenants para testes de perfil.
 * O mapeamento membership→catálogo é `tenantRoleToGlobalRole`.
 */
export type TenantRole = 'owner' | 'admin' | 'member' | 'developer' | 'support'



export type TenantPlan = 'free' | 'pro' | 'enterprise'

export interface Tenant {
  id: string
  name: string
  slug: string
  plan: TenantPlan
  createdAt: string
}

export interface Membership {
  tenantId: string
  role: TenantRole
  tenant: Tenant
}

export interface SessionUser {
  id: string | number
  email: string
  fullName?: string
  username: string
  avatar?: string
}

export interface Session {
  accessToken: string
  user: SessionUser
  memberships: Membership[]
  currentTenantId: string
}
