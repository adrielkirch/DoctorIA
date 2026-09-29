import type { GatewayRelease } from '@/types/gatewayPublication'
import { environments, releases } from '@db/integrations/gateway/publication/db'
import { handlerGatewayPublication } from '@db/integrations/gateway/publication/index'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

/**
 * Publicação do Gateway (MSW) — identidade segue o padrão da casa: o ator vem do
 * **token JWT fake** (`{ id }`) e o tenant do header `x-workspace-id`. NÃO existe
 * header de capability (`x-capability`): `authorize()` resolve a role pelo token
 * e compara com o `my-access` do tenant.
 *
 * @see src/plugins/fake-api/utils/authorize.ts
 * @see src/plugins/fake-api/handlers/integrations/gateway/index.test.ts (teste irmão)
 */

const server = setupServer(...handlerGatewayPublication)

const BASE = 'http://localhost/api/integrations/gateway'

/** Token fake (payload `{ id }`) — user 1 é admin do workspace-alpha (gateway.view/manage). */
function tokenFor(userId: number): string {
  const payload = btoa(JSON.stringify({ id: userId }))

  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.fake-signature`
}

const HEADERS = { 'content-type': 'application/json', 'x-workspace-id': 'workspace-alpha' }
const ADMIN_HEADERS = { ...HEADERS, Authorization: `Bearer ${tokenFor(1)}` }

const initialEnvironments = structuredClone(environments)
const initialReleases = structuredClone(releases)

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => {
  server.resetHandlers()
  environments.splice(0, environments.length, ...structuredClone(initialEnvironments))
  releases.splice(0, releases.length, ...structuredClone(initialReleases))
})
afterAll(() => server.close())

async function createDraft(headers: Record<string, string> = ADMIN_HEADERS): Promise<GatewayRelease> {
  const res = await fetch(`${BASE}/releases`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ routeCount: 10 }),
  })

  expect(res.status).toBe(201)

  const body = await res.json() as { release: GatewayRelease }

  return body.release
}

function productionTarget() {
  return environments.find(environment => environment.environment === 'production')
}



describe('GET /api/integrations/gateway/environments', () => {
  it('returns the environment targets for the current tenant', async () => {
    const res = await fetch(`${BASE}/environments`, { headers: ADMIN_HEADERS })

    expect(res.status).toBe(200)

    const body = await res.json() as { environments: unknown[] }

    expect(Array.isArray(body.environments)).toBe(true)
    expect(body.environments.length).toBeGreaterThan(0)
  })
})

describe('GET /api/integrations/gateway/releases', () => {
  it('returns the releases', async () => {
    const res = await fetch(`${BASE}/releases`, { headers: ADMIN_HEADERS })

    expect(res.status).toBe(200)

    const body = await res.json() as { releases: GatewayRelease[] }

    expect(body.releases.length).toBeGreaterThan(0)
  })

  it('filters releases by target (production | sandbox)', async () => {
    const prodRes = await fetch(`${BASE}/releases?target=production`, { headers: ADMIN_HEADERS })
    const prodBody = await prodRes.json() as { releases: GatewayRelease[] }

    expect(prodBody.releases.every(release => release.targetEnvironment === 'production')).toBe(true)

    const sandboxRes = await fetch(`${BASE}/releases?target=sandbox`, { headers: ADMIN_HEADERS })
    const sandboxBody = await sandboxRes.json() as { releases: GatewayRelease[] }

    expect(sandboxBody.releases.every(release => release.sourceEnvironment === 'sandbox')).toBe(true)
  })
})



describe('POST /api/integrations/gateway/releases', () => {
  it('creates a draft release owned by the authenticated actor', async () => {
    const release = await createDraft()

    expect(release.id).toBeTruthy()
    expect(release.status).toBe('draft')
    expect(release.routeCount).toBe(10)
    expect(release.createdBy).toBe('1')
    expect(release.checksum.startsWith('sha256:')).toBe(true)
  })

  it('denies creation without an authenticated actor (deny-by-default)', async () => {
    const res = await fetch(`${BASE}/releases`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ routeCount: 10 }),
    })

    expect(res.status).toBe(403)
  })
})

describe('POST /api/integrations/gateway/releases/:id/publish', () => {
  it('publishes a draft release and points production at it', async () => {
    const release = await createDraft()

    const res = await fetch(`${BASE}/releases/${release.id}/publish`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
    })

    expect(res.status).toBe(200)

    const body = await res.json() as { release: GatewayRelease }

    expect(body.release.status).toBe('published')
    expect(body.release.publishedBy).toBe('1')
    expect(body.release.publishedAt).toBeTruthy()
    expect(productionTarget()?.activeReleaseId).toBe(release.id)
  })

  it('refuses to publish a release that is already live (422)', async () => {
    const live = releases.find(release => release.status === 'published') as GatewayRelease

    const res = await fetch(`${BASE}/releases/${live.id}/publish`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
    })

    expect(res.status).toBe(422)
  })

  it('returns 404 for an unknown release', async () => {
    const res = await fetch(`${BASE}/releases/release-does-not-exist/publish`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
    })

    expect(res.status).toBe(404)
  })
})

describe('POST /api/integrations/gateway/releases/:id/rollback', () => {
  it('rolls back to a published release and supersedes the current one', async () => {
    const previous = releases.find(release => release.status === 'published') as GatewayRelease
    const candidate = await createDraft()

    await fetch(`${BASE}/releases/${candidate.id}/publish`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
    })

    const res = await fetch(`${BASE}/releases/${previous.id}/rollback`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
    })

    expect(res.status).toBe(200)

    const body = await res.json() as { release: GatewayRelease }

    expect(body.release.id).toBe(previous.id)
    expect(body.release.status).toBe('rolled_back')
    expect(productionTarget()?.activeReleaseId).toBe(previous.id)
    expect(releases.find(release => release.id === candidate.id)?.status).toBe('superseded')
  })

  it('refuses to roll back to a release that is not published (422)', async () => {
    const draft = await createDraft()

    const res = await fetch(`${BASE}/releases/${draft.id}/rollback`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
    })

    expect(res.status).toBe(422)
  })
})

describe('POST /api/integrations/gateway/environments/production/unpublish', () => {
  it('unpublishes production with a reason', async () => {
    const res = await fetch(`${BASE}/environments/production/unpublish`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ reason: 'Hotfix deploy' }),
    })

    expect(res.status).toBe(200)

    const body = await res.json() as { unpublished: boolean; reason: string }

    expect(body.unpublished).toBe(true)
    expect(body.reason).toBe('Hotfix deploy')
    expect(productionTarget()?.activeReleaseId).toBeUndefined()
  })

  it('requires a reason (422)', async () => {
    const res = await fetch(`${BASE}/environments/production/unpublish`, {
      method: 'POST',
      headers: ADMIN_HEADERS,
      body: JSON.stringify({ reason: '   ' }),
    })

    expect(res.status).toBe(422)
  })
})
