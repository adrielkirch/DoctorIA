import { getActorGlobalRole } from '@api-utils/actor'
import { getTenantId } from '@api-utils/tenant'
import { buildMyAccess } from '@db/access-control/roles/db'
import type { PermissionId } from 'contracts/types/accessControl'
import { HttpResponse, type JsonBodyType } from 'msw'

/**
 * Backend authorization (fake-api) — pattern `authorize(user, permission)`.
 *
 * Resolve o ator pelo token JWT (nunca pelo header `x-actor-role`) e valida a
 * permission contra `my-access` do tenant ativo. Aceita array para semântica OR
 * (ex.: abrir o AI Assistant com `ai.assistant.use` OU `ai.assistant.view`).
 * Retorna:
 *  - `null` → autorizado (o handler prossegue);
 *  - `HttpResponse` 403 → negado (o handler deve retorná-la imediatamente).
 *
 * PRINCÍPIOS:
 *  - Deny-by-default: sem token/tenant → mínimo privilégio → 403.
 *  - Tenant-aware: a role resolve via membership do tenant do request.
 *  - Frontend (guard/UI) é UX; ESTE check é segurança.
 *
 * @see .specify/skills/rbac-global-roles/skill.md (Parte 10 — Enforcement)
 */
export function authorize(
  request: Request,
  permission: PermissionId | PermissionId[],
): HttpResponse<JsonBodyType> | null {
  const tenantId = getTenantId(request)
  const roleId = getActorGlobalRole(request, tenantId)
  const access = buildMyAccess(roleId)

  const required = Array.isArray(permission) ? permission : [permission]
  const allowed = required.some(requiredPermission => access.permissions.includes(requiredPermission))

  if (allowed)
    return null

  return HttpResponse.json(
    { message: `Missing permission '${required.join("' or '")}'`, code: 'FORBIDDEN' },
    { status: 403 },
  )
}

