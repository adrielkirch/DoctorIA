/**
 * Tenant seed data — Medical domain with single tenant.
 * Single-tenant per user: all users belong to the same medical organization.
 */
import type { Membership, Tenant } from 'contracts/types/tenant'

export const tenants: Tenant[] = [
  {
    id: 'workspace-alpha',
    name: 'Medical Diagnostic Center',
    slug: 'medical-center',
    plan: 'enterprise',
    createdAt: '2024-01-10T00:00:00.000Z',
  },
]

/**
 * Memberships by userId — all users belong to single medical tenant.
 * Single-tenant per user simplification: no multi-workspace switching needed.
 */
export const membershipsByUserId: Record<string, Membership[]> = {

  1: [
    { tenantId: 'workspace-alpha', role: 'admin', tenant: tenants[0] },
  ],


  2: [
    { tenantId: 'workspace-alpha', role: 'member', tenant: tenants[0] },
  ],


  3: [
    { tenantId: 'workspace-alpha', role: 'developer', tenant: tenants[0] },
  ],


  4: [
    { tenantId: 'workspace-alpha', role: 'support', tenant: tenants[0] },
  ],


  8: [
    { tenantId: 'workspace-alpha', role: 'owner', tenant: tenants[0] },
  ],
}
