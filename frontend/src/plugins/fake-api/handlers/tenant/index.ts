import { getActorUserId } from '@api-utils/actor'
import { membershipsByUserId, tenants } from '@db/tenant/db'
import type { CreateTenantPayload } from 'contracts/tenant/types'
import type { Membership, Tenant } from 'contracts/types/tenant'
import { HttpResponse, http } from 'msw'

function normalizeSlug(name: string, slug?: string): string {
  const base = (slug || name).trim().toLowerCase()

  return base.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function getActorId(request: Request): string {
  return getActorUserId(request) ?? '1'
}

export const handlerTenant = [

  http.post('*/api/tenants', async ({ request }) => {
    const payload = await request.json() as CreateTenantPayload

    const name = payload.name?.trim()
    if (!name)
      return HttpResponse.json({ message: 'name is required' }, { status: 400 })

    const slug = normalizeSlug(name, payload.slug)
    if (!slug)
      return HttpResponse.json({ message: 'slug is required' }, { status: 400 })

    if (tenants.some((t: Tenant) => t.slug === slug))
      return HttpResponse.json({ message: 'A workspace with this slug already exists' }, { status: 400 })

    const actorId = getActorId(request)

    const tenant: Tenant = {
      id: `workspace-${slug}`,
      name,
      slug,
      plan: 'free',
      createdAt: new Date().toISOString(),
    }

    tenants.push(tenant)

    const membership: Membership = {
      tenantId: tenant.id,
      role: 'owner',
      tenant,
    }

    membershipsByUserId[actorId] = [...(membershipsByUserId[actorId] ?? []), membership]

    return HttpResponse.json({ tenant, membership }, { status: 201 })
  }),
]
