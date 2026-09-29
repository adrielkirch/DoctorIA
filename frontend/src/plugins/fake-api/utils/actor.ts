/**
 * Ator da fake-api — resolução de identidade a partir do token JWT fake
 * (payload `{ id }`, mesmo formato do auth handler) e da membership do tenant.
 *
 * Compartilhado por:
 *  - `access-control/roles` (my-access)
 *  - `integrations/gateway` (dispatch — autorização por requiredRole)
 */
import { getRole, tenantRoleToGlobalRole } from '@db/access-control/roles/db'
import { membershipsByUserId } from '@db/tenant/db'
import type { GlobalRoleId } from 'contracts/types/accessControl'
import type { GatewayRouteRole } from 'contracts/types/gateway'

/** Decodifica o payload `{ id }` do token fake (base64url → base64 → atob). */
export function decodeTokenUserId(token: string | undefined | null): number | null {
  if (!token)
    return null

  const parts = token.split('.')
  if (parts.length < 2)
    return null

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const payload = JSON.parse(atob(padded)) as { id?: unknown }

    return typeof payload.id === 'number' ? payload.id : null
  }
  catch {
    return null
  }
}

export function getBearerToken(request: Request): string | undefined {
  const header = request.headers.get('Authorization') ?? request.headers.get('authorization')

  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined
}

/**
 * Id do usuário (string) resolvido do token JWT fake, ou `null` quando não há
 * token válido. Substitui o header legado `x-actor-id` (removido do client).
 *
 * @see .specify/skills/rbac-global-roles/skill.md — identidade sempre via token.
 */
export function getActorUserId(request: Request): string | null {
  const userId = decodeTokenUserId(getBearerToken(request))

  return userId === null ? null : String(userId)
}

/**
 * Membership (coarse) → RBAC global, via o MESMO mapeamento do catálogo
 * (`tenantRoleToGlobalRole`): owner→owner, admin→admin, developer→developer,
 * support→support, member→member. Qualquer valor desconhecido cai em `member`.
 */
/** Resolve a role global efetiva do ator no tenant (via token → membership). */
export function getActorGlobalRole(request: Request, tenantId: string): GlobalRoleId {
  const membership = getActorMembership(request, tenantId)

  return membership ? tenantRoleToGlobalRole(membership.role) : 'member'
}

/** Membership do ator no tenant (owner | admin | member) ou undefined. */
export function getActorMembership(
  request: Request,
  tenantId: string,
): { role: string } | undefined {
  const userId = decodeTokenUserId(getBearerToken(request))

  if (userId === null)
    return undefined

  return (membershipsByUserId[String(userId)] ?? []).find(m => m.tenantId === tenantId)
}

/**
 * Nível coarse do API Gateway do ator (ALL | USER | ADMIN), derivado do RBAC
 * global. Sem token válido → `USER` (mínimo nível não-público da hierarquia).
 */
export function getActorGatewayRole(request: Request, tenantId: string): GatewayRouteRole {
  return getRole(getActorGlobalRole(request, tenantId))?.gatewayRole ?? 'USER'
}
