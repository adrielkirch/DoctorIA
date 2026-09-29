import { HttpResponse, http } from 'msw'
import { environments, releases } from './db'
import { authorize } from '@api-utils/authorize'
import { getTenantId } from '@api-utils/tenant'
import { getActorUserId } from '@api-utils/actor'
import type { GatewayRelease } from '@/types/gatewayPublication'

/**
 * ℹ️ Capabilities: usamos as ids do catálogo canônico (`gateway.view` para ler,
 * `gateway.manage` para criar/publicar/rollback/unpublish). Ids granulares como
 * `gateway.publish`/`gateway.rollback` NÃO existem na union `PermissionId` do
 * pacote `rp-doctoria-utils` — criar escopos novos exigiria nova versão do pacote
 * (dependência externa), então a gestão de releases fica sob `gateway.manage`.
 * Identidade/role vêm do token JWT (`authorize()`), nunca de header de capability.
 */
function nowIso(): string {
  return new Date().toISOString()
}

export const handlerGatewayPublication = [
  http.get('*/api/integrations/gateway/environments', ({ request }) => {
    const denied = authorize(request, 'gateway.view')
    if (denied)
      return denied

    return HttpResponse.json({ environments })
  }),

  http.get('*/api/integrations/gateway/releases', ({ request }) => {
    const denied = authorize(request, 'gateway.view')
    if (denied)
      return denied

    const url = new URL(request.url)
    const target = url.searchParams.get('target')

    let filtered = releases
    if (target === 'production')
      filtered = releases.filter(r => r.targetEnvironment === 'production')
    else if (target === 'sandbox')
      filtered = releases.filter(r => r.sourceEnvironment === 'sandbox')

    return HttpResponse.json({ releases: filtered })
  }),

  http.post('*/api/integrations/gateway/releases', async ({ request }) => {
    const denied = authorize(request, 'gateway.manage')
    if (denied)
      return denied

    const tenantId = getTenantId(request)
    const userId = getActorUserId(request)

    if (!userId)
      return HttpResponse.json({ message: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })

    const payload = await request.json() as Partial<GatewayRelease>

    const release: GatewayRelease = {
      id: `release-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      workspaceId: tenantId,
      sourceEnvironment: 'sandbox',
      targetEnvironment: 'production',
      gatewayId: environments[0].gatewayId,
      version: `v${releases.filter(r => r.status === 'published').length + 1}.0.0-candidate`,
      status: 'draft',
      routeCount: payload.routeCount ?? 0,
      checksum: `sha256:${Math.random().toString(36).slice(2)}`,
      createdBy: userId,
      createdAt: nowIso(),
    }

    releases.push(release)

    return HttpResponse.json({ release }, { status: 201 })
  }),

  http.post('*/api/integrations/gateway/releases/:id/publish', async ({ request, params }) => {
    const denied = authorize(request, 'gateway.manage')
    if (denied)
      return denied

    const userId = getActorUserId(request)
    if (!userId)
      return HttpResponse.json({ message: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })

    const releaseId = String(params.id)
    const release = releases.find(r => r.id === releaseId)

    if (!release)
      return HttpResponse.json({ message: 'Release not found', code: 'NOT_FOUND' }, { status: 404 })

    if (release.status !== 'draft' && release.status !== 'failed')
      return HttpResponse.json({ message: 'Release not publishable', code: 'RELEASE_NOT_PUBLISHABLE' }, { status: 422 })

    release.status = 'published'
    release.publishedBy = userId
    release.publishedAt = nowIso()

    const prodTarget = environments.find(e => e.environment === 'production')
    if (prodTarget) {
      prodTarget.activeReleaseId = releaseId
      prodTarget.lastPublishedAt = release.publishedAt
    }

    return HttpResponse.json({ release })
  }),

  http.post('*/api/integrations/gateway/releases/:id/rollback', async ({ request, params }) => {
    const denied = authorize(request, 'gateway.manage')
    if (denied)
      return denied

    const userId = getActorUserId(request)
    if (!userId)
      return HttpResponse.json({ message: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })

    const releaseId = String(params.id)
    const targetRelease = releases.find(r => r.id === releaseId)

    if (!targetRelease || targetRelease.status !== 'published')
      return HttpResponse.json({ message: 'Rollback target invalid', code: 'ROLLBACK_TARGET_INVALID' }, { status: 422 })

    const currentActive = environments.find(e => e.environment === 'production')?.activeReleaseId
    const currentActiveRelease = releases.find(r => r.id === currentActive)

    if (currentActiveRelease)
      currentActiveRelease.status = 'superseded'

    targetRelease.status = 'rolled_back'

    const prodTarget = environments.find(e => e.environment === 'production')
    if (prodTarget) {
      prodTarget.activeReleaseId = releaseId
      prodTarget.lastPublishedAt = nowIso()
    }

    return HttpResponse.json({ release: targetRelease })
  }),

  http.post('*/api/integrations/gateway/environments/production/unpublish', async ({ request }) => {
    const denied = authorize(request, 'gateway.manage')
    if (denied)
      return denied

    const userId = getActorUserId(request)
    if (!userId)
      return HttpResponse.json({ message: 'Authentication required', code: 'UNAUTHENTICATED' }, { status: 401 })

    const payload = await request.json() as { reason: string }

    if (!payload.reason?.trim())
      return HttpResponse.json({ message: 'Reason is required', code: 'INVALID_INPUT' }, { status: 422 })

    const prodTarget = environments.find(e => e.environment === 'production')
    if (prodTarget) {
      prodTarget.activeReleaseId = undefined
      prodTarget.lastPublishedAt = undefined
    }

    return HttpResponse.json({ unpublished: true, reason: payload.reason })
  }),
]
