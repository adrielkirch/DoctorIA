/**
 * RBAC Global — handlers MSW.
 *
 * - `GET /api/access-control/roles`      → catálogo de roles globais.
 * - `PATCH /api/access-control/roles/:id` → atualiza as áreas de uma role (in-memory).
 * - `GET /api/access-control/features`   → catálogo de features.
 * - `GET /api/access-control/my-access`  → acesso efetivo do usuário no tenant.
 *
 * O `my-access` resolve a role pela **membership do tenant** (o usuário é
 * identificado pelo token JWT fake — payload `{ id }`, igual ao auth handler).
 * Sem token/tenant válido → mínimo privilégio (`client`).
 *
 * @see .specify/skills/rbac-global-roles/skill.md
 */
import { getActorGlobalRole, getActorMembership } from '@api-utils/actor'
import { authorize } from '@api-utils/authorize'
import { getTenantId } from '@api-utils/tenant'
import type { GlobalRoleId, PermissionId } from 'contracts/types/accessControl'
import { PERMISSIONS } from 'contracts/types/accessControl'
import { HttpResponse, http } from 'msw'
import { buildAbilityRulesForRole, buildMyAccess, featureCatalog, getRole, roleCatalog } from './db'

export const handlerAccessControlRoles = [




  http.get('*/api/access-control/roles', () =>
    HttpResponse.json({ roles: roleCatalog }, { status: 200 }),
  ),


  http.patch<{ id: string }>('*/api/access-control/roles/:id', async ({ request, params }) => {
    const denied = authorize(request, 'roles.manage')
    if (denied)
      return denied

    const roleId = params.id as GlobalRoleId
    const role = getRole(roleId)

    if (!role)
      return HttpResponse.json({ message: 'Role not found' }, { status: 404 })

    const body = await request.json() as { permissions?: PermissionId[] }
    const permissions = Array.isArray(body.permissions) ? body.permissions : []


    const validPermissionIds = new Set<string>(PERMISSIONS)
    const normalized = permissions.filter(id => validPermissionIds.has(id))

    role.permissions = [...new Set(normalized)]
    role.gatewayRole = roleId === 'owner' || roleId === 'admin' ? 'ADMIN' : role.gatewayRole

    return HttpResponse.json({ role }, { status: 200 })
  }),


  http.get('*/api/access-control/features', () =>
    HttpResponse.json({ features: featureCatalog }, { status: 200 }),
  ),


  http.get('*/api/access-control/my-access', ({ request }) => {
    const tenantId = getTenantId(request)
    const roleId = getActorGlobalRole(request, tenantId)
    const membershipRole = getActorMembership(request, tenantId)?.role

    return HttpResponse.json(
      buildMyAccess(roleId, membershipRole),
      { status: 200 },
    )
  }),
]

export { buildAbilityRulesForRole }


