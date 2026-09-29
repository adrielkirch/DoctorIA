import { getActorUserId } from '@api-utils/actor'
import { authorize } from '@api-utils/authorize'
import { paginateArray } from '@api-utils/paginateArray'
import { getTenantId } from '@api-utils/tenant'
import { db } from '@db/integrations/mcp/db'
import type { CapabilityGrantRequestPayload, ConnectRequestPayload, McpCapabilityGrant, McpConnection, McpConnectionStatus, McpProviderDefinition, McpValidationRun, PublishProviderRequestPayload, RevalidateRequestPayload, ValidationCheck } from 'contracts/integrations/mcp/types'
import { HttpResponse, http } from 'msw'

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

function getActorId(request: Request): string {
  return getActorUserId(request) ?? 'user-admin'
}

function includesSearch(source: string, q: string): boolean {
  return source.toLowerCase().includes(q.toLowerCase())
}

function sortConnectionsDefault(a: McpConnection, b: McpConnection): number {
  const priority: Record<McpConnectionStatus, number> = { active: 0, validating: 1, paused: 2, failed: 3, draft: 4, retired: 5 }

  return priority[a.status] !== priority[b.status] ? priority[a.status] - priority[b.status] : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
}

function appendAudit(event: { tenantId: string; eventType: string; actorId: string; connectionId?: string; providerSlug?: string; payload: Record<string, unknown> }): void {
  db.auditEvents.push({ id: createId('audit'), tenantId: event.tenantId, eventType: event.eventType, actorId: event.actorId, connectionId: event.connectionId, providerSlug: event.providerSlug, payload: event.payload, createdAt: new Date().toISOString() })
}

export const handlerIntegrationsMcp = [

  http.get('*/api/integrations/mcp/store', ({ request }) => {
    const denied = authorize(request, 'mcp.view')
    if (denied)
      return denied

    const url = new URL(request.url)
    const q = url.searchParams.get('q')?.trim() || ''
    const category = url.searchParams.get('category')?.trim().toLowerCase() || ''
    const trustTier = url.searchParams.get('trustTier')?.trim().toLowerCase() || ''
    const status = url.searchParams.get('status')?.trim().toLowerCase() || ''
    const page = parsePositiveInt(url.searchParams.get('page'), 1)
    const itemsPerPage = Math.min(parsePositiveInt(url.searchParams.get('itemsPerPage') ?? url.searchParams.get('pageSize'), 20), 100)
    const sortBy = url.searchParams.get('sortBy')?.trim() || 'displayName'
    const sortOrder = (url.searchParams.get('sortOrder')?.trim().toLowerCase() || 'asc') as 'asc' | 'desc'

    let providers = [...db.providers]
    if (q)
      providers = providers.filter(p => includesSearch(p.displayName, q) || includesSearch(p.slug, q))
    if (category)
      providers = providers.filter(p => p.category.toLowerCase() === category)
    if (trustTier)
      providers = providers.filter(p => p.trustTier.toLowerCase() === trustTier)
    if (status)
      providers = providers.filter(p => p.status.toLowerCase() === status)
    providers.sort((a, b) => {
      const av = sortBy === 'createdAt' ? a.createdAt : a.displayName.toLowerCase()
      const bv = sortBy === 'createdAt' ? b.createdAt : b.displayName.toLowerCase()
      const c = av > bv ? 1 : av < bv ? -1 : 0

      return sortOrder === 'desc' ? -c : c
    })

    const totalPages = Math.ceil(providers.length / itemsPerPage)


    return HttpResponse.json({ providers: paginateArray(providers, itemsPerPage, page), totalProviders: providers.length, totalPages, page, filters: { categories: [...new Set(db.providers.map(p => p.category))].sort(), trustTiers: [...new Set(db.providers.map(p => p.trustTier))].sort(), statuses: [...new Set(db.providers.map(p => p.status))].sort() } })
  }),

  http.get('*/api/integrations/mcp/connected', ({ request }) => {
    const denied = authorize(request, 'mcp.view')
    if (denied)
      return denied

    const url = new URL(request.url)
    const tenantId = getTenantId(request)
    const q = url.searchParams.get('q')?.trim() || ''
    const status = url.searchParams.get('status')?.trim().toLowerCase() || ''
    const health = url.searchParams.get('health')?.trim().toLowerCase() || ''
    const page = parsePositiveInt(url.searchParams.get('page'), 1)
    const itemsPerPage = Math.min(parsePositiveInt(url.searchParams.get('itemsPerPage') ?? url.searchParams.get('pageSize'), 20), 100)
    const sortBy = url.searchParams.get('sortBy')?.trim() || 'statusPriority'
    const sortOrder = (url.searchParams.get('sortOrder')?.trim().toLowerCase() || 'asc') as 'asc' | 'desc'

    let connections = db.connections.filter(c => c.tenantId === tenantId)
    if (q) {
      const slugs = new Set(db.providers.filter(p => includesSearch(p.displayName, q) || includesSearch(p.slug, q)).map(p => p.slug))

      connections = connections.filter(c => includesSearch(c.displayName, q) || slugs.has(c.providerSlug))
    }
    if (status)
      connections = connections.filter(c => c.status.toLowerCase() === status)
    if (health)
      connections = connections.filter(c => c.healthStatus.toLowerCase() === health)
    if (sortBy === 'updatedAt') {
      connections.sort((a, b) => {
        const d = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()

        return sortOrder === 'desc' ? -d : d
      })
    }
    else {
      connections.sort(sortConnectionsDefault); if (sortOrder === 'desc')
        connections.reverse()
    }
    const totalPages = Math.ceil(connections.length / itemsPerPage)


    return HttpResponse.json({ connections: paginateArray(connections, itemsPerPage, page), totalConnections: connections.length, totalPages, page, filters: { statuses: [...new Set(db.connections.map(c => c.status))].sort(), healthStates: [...new Set(db.connections.map(c => c.healthStatus))].sort() } })
  }),

  http.get('*/api/integrations/mcp/providers/:slug', ({ request, params }) => {
    const denied = authorize(request, 'mcp.view')
    if (denied)
      return denied

    const slug = String(params.slug || '').trim().toLowerCase()
    const provider = db.providers.find(p => p.slug.toLowerCase() === slug)

    if (!provider)
      return HttpResponse.json({ message: 'Provider not found' }, { status: 404 })

    return HttpResponse.json({ provider, defaults: { capabilityPreset: provider.capabilities.slice(0, 2) } })
  }),

  http.post('*/api/integrations/mcp/connect', async ({ request }) => {
    const denied = authorize(request, 'mcp.manage')
    if (denied)
      return denied

    const payload = await request.json() as ConnectRequestPayload
    const tenantId = getTenantId(request)
    const actorId = getActorId(request)
    const provider = db.providers.find(p => p.slug === payload.providerSlug)
    if (!provider)
      return HttpResponse.json({ message: 'Provider not found' }, { status: 404 })
    if (!payload.displayName?.trim())
      return HttpResponse.json({ message: 'displayName is required' }, { status: 400 })
    const invalidCap = payload.requestedCapabilities.find(c => !provider.capabilities.includes(c))
    if (invalidCap)
      return HttpResponse.json({ message: `Unknown capability '${invalidCap}'`, code: 'INVALID_CAPABILITY' }, { status: 400 })
    const missingSecrets = provider.requiredSecrets.filter(s => !payload.secrets?.[s]?.trim())
    const startedAt = new Date().toISOString()
    const connectionId = createId('connection')
    const base: McpConnection = { id: connectionId, tenantId, providerSlug: provider.slug, displayName: payload.displayName.trim(), status: 'validating', lastValidationStatus: 'none', healthStatus: 'healthy', activationSource: 'auto_validation', updatedAt: startedAt, createdBy: actorId, autoActivated: false }

    db.connections.push(base)

    const checks: ValidationCheck[] = missingSecrets.length ? [{ name: 'required-secrets', status: 'fail', detail: `Missing: ${missingSecrets.join(', ')}` }] : [{ name: 'required-secrets', status: 'pass', detail: 'All required secrets provided' }, { name: 'provider-reachability', status: 'pass', detail: 'Provider reachable' }]
    const result = missingSecrets.length ? 'fail' : 'pass'
    const finishedAt = new Date().toISOString()
    const validationRun: McpValidationRun = { id: createId('validation'), tenantId, connectionId, result, checks, startedAt, finishedAt, summaryMessage: result === 'pass' ? 'Validation passed' : 'Validation failed' }

    db.validationRuns.push(validationRun)

    const idx = db.connections.findIndex(c => c.id === connectionId)
    const final: McpConnection = { ...db.connections[idx], status: result === 'pass' ? 'active' : 'failed', lastValidationStatus: result, lastValidationAt: finishedAt, connectedAt: result === 'pass' ? finishedAt : undefined, healthStatus: result === 'pass' ? 'healthy' : 'unreachable', autoActivated: result === 'pass', updatedAt: finishedAt }

    db.connections[idx] = final
    appendAudit({ tenantId, eventType: result === 'pass' ? 'connection.activated' : 'connection.validation_failed', actorId, connectionId, providerSlug: provider.slug, payload: { missingSecrets } })

    return HttpResponse.json({ connection: final, validationRun }, { status: 201 })
  }),

  http.post('*/api/integrations/mcp/connections/:id/revalidate', async ({ request, params }) => {
    const denied = authorize(request, 'mcp.manage')
    if (denied)
      return denied

    const connectionId = String(params.id)
    const tenantId = getTenantId(request)
    const actorId = getActorId(request)
    const payload = await request.json() as RevalidateRequestPayload
    const idx = db.connections.findIndex(c => c.id === connectionId && c.tenantId === tenantId)
    if (idx === -1)
      return HttpResponse.json({ message: 'Connection not found' }, { status: 404 })
    const shouldFail = payload.reason?.toLowerCase().includes('fail') ?? false
    const result = shouldFail ? 'fail' : 'pass'
    const checks: ValidationCheck[] = shouldFail ? [{ name: 'revalidate', status: 'fail', detail: 'Revalidation failed by simulated reason' }] : [{ name: 'revalidate', status: 'pass', detail: 'Revalidation succeeded' }]
    const startedAt = new Date().toISOString()
    const finishedAt = new Date().toISOString()
    const vr: McpValidationRun = { id: createId('validation'), tenantId, connectionId, result, checks, startedAt, finishedAt, summaryMessage: result === 'pass' ? 'Validation passed' : 'Validation failed' }

    db.validationRuns.push(vr)

    const existing = db.connections[idx]
    const updated: McpConnection = { ...existing, status: result === 'pass' ? 'active' : 'failed', lastValidationStatus: result, lastValidationAt: finishedAt, connectedAt: result === 'pass' ? (existing.connectedAt || finishedAt) : existing.connectedAt, healthStatus: result === 'pass' ? 'healthy' : 'unreachable', autoActivated: result === 'pass', updatedAt: finishedAt }

    db.connections[idx] = updated
    appendAudit({ tenantId, eventType: result === 'pass' ? 'connection.revalidated' : 'connection.revalidation_failed', actorId, connectionId, providerSlug: existing.providerSlug, payload: { reason: payload.reason || null } })

    return HttpResponse.json({ connection: updated, validationRun: vr })
  }),

  http.patch('*/api/integrations/mcp/connections/:id/capability-grants', async ({ request, params }) => {
    const denied = authorize(request, 'mcp.manage')
    if (denied)
      return denied

    const payload = await request.json() as CapabilityGrantRequestPayload
    const connectionId = String(params.id)
    const tenantId = getTenantId(request)
    const actorId = getActorId(request)
    const connection = db.connections.find(c => c.id === connectionId && c.tenantId === tenantId)
    if (!connection)
      return HttpResponse.json({ message: 'Connection not found' }, { status: 404 })
    const provider = db.providers.find(p => p.slug === connection.providerSlug)
    if (!provider)
      return HttpResponse.json({ message: 'Provider not found for connection' }, { status: 404 })
    if (!['agent', 'role'].includes(payload.principalType))
      return HttpResponse.json({ message: 'Invalid principal type' }, { status: 400 })
    if (!payload.principalId?.trim())
      return HttpResponse.json({ message: 'principalId is required' }, { status: 400 })
    const invalidCap = payload.allowedCapabilities.find(c => !provider.capabilities.includes(c))
    if (invalidCap)
      return HttpResponse.json({ message: `Unknown capability '${invalidCap}'`, code: 'INVALID_CAPABILITY' }, { status: 400 })
    const existingIdx = db.grants.findIndex(g => g.tenantId === tenantId && g.connectionId === connectionId && g.principalType === payload.principalType && g.principalId === payload.principalId)
    const now = new Date().toISOString()
    let grant: McpCapabilityGrant
    if (existingIdx === -1) {
      grant = { id: createId('grant'), tenantId, connectionId, principalType: payload.principalType, principalId: payload.principalId.trim(), allowedCapabilities: [...new Set(payload.allowedCapabilities)], createdAt: now, updatedAt: now, createdBy: actorId }
      db.grants.push(grant)
    }
    else {
      grant = { ...db.grants[existingIdx], allowedCapabilities: [...new Set(payload.allowedCapabilities)], updatedAt: now }
      db.grants[existingIdx] = grant
    }
    appendAudit({ tenantId, eventType: 'grant.updated', actorId, connectionId, providerSlug: connection.providerSlug, payload: { principalType: grant.principalType, principalId: grant.principalId, allowedCapabilities: grant.allowedCapabilities } })

    return HttpResponse.json({ grant })
  }),

  http.post('*/api/integrations/mcp/providers', async ({ request }) => {
    const denied = authorize(request, 'mcp.manage')
    if (denied)
      return denied

    const payload = await request.json() as PublishProviderRequestPayload
    const actorId = getActorId(request)
    const tenantId = getTenantId(request)
    const slug = payload.slug?.trim().toLowerCase()
    if (!slug || !payload.displayName?.trim() || !payload.category?.trim() || !payload.maintainer?.trim())
      return HttpResponse.json({ message: 'slug, displayName, category, and maintainer are required' }, { status: 400 })
    if (!Array.isArray(payload.capabilities) || payload.capabilities.length === 0)
      return HttpResponse.json({ message: 'At least one capability is required' }, { status: 400 })
    if (db.providers.some(p => p.slug === slug))
      return HttpResponse.json({ message: 'Provider slug already exists' }, { status: 400 })
    const now = new Date().toISOString()
    const provider: McpProviderDefinition = { id: createId('provider'), slug, displayName: payload.displayName.trim(), category: payload.category.trim(), capabilities: [...new Set(payload.capabilities.map(c => c.trim()).filter(Boolean))], requiredSecrets: [...new Set((payload.requiredSecrets || []).map(s => s.trim()).filter(Boolean))], trustTier: payload.trustTier, status: 'published', maintainer: payload.maintainer.trim(), docsUrl: payload.docsUrl?.trim() || undefined, createdAt: now, updatedAt: now }

    db.providers.push(provider)
    appendAudit({ tenantId, eventType: 'provider.published', actorId, providerSlug: provider.slug, payload: { providerId: provider.id } })

    return HttpResponse.json({ provider }, { status: 201 })
  }),

  http.get('*/api/integrations/mcp/audit-events', ({ request }) => {
    const denied = authorize(request, 'mcp.view')
    if (denied)
      return denied

    const url = new URL(request.url)
    const tenantId = getTenantId(request)
    const connectionId = url.searchParams.get('connectionId')?.trim() || ''
    const eventType = url.searchParams.get('eventType')?.trim().toLowerCase() || ''
    const page = parsePositiveInt(url.searchParams.get('page'), 1)
    const itemsPerPage = Math.min(parsePositiveInt(url.searchParams.get('itemsPerPage') ?? url.searchParams.get('pageSize'), 20), 100)
    let events = db.auditEvents.filter(e => e.tenantId === tenantId)
    if (connectionId)
      events = events.filter(e => e.connectionId === connectionId)
    if (eventType)
      events = events.filter(e => e.eventType.toLowerCase() === eventType)
    events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const totalPages = Math.ceil(events.length / itemsPerPage)


    return HttpResponse.json({ events: paginateArray(events, itemsPerPage, page), totalEvents: events.length, totalPages, page })
  }),


  http.delete('*/api/integrations/mcp/connections/:id', ({ request, params }) => {
    const denied = authorize(request, 'mcp.manage')
    if (denied)
      return denied

    const tenantId = getTenantId(request)
    const idx = db.connections.findIndex(c => c.id === params.id && c.tenantId === tenantId)

    if (idx === -1)
      return HttpResponse.json({ message: 'Connection not found' }, { status: 404 })

    const connection = db.connections[idx]

    db.connections.splice(idx, 1)
    db.grants = db.grants.filter(g => g.connectionId !== connection.id)

    appendAudit({
      tenantId,
      eventType: 'connection.disconnected',
      actorId: getActorId(request),
      connectionId: connection.id,
      providerSlug: connection.providerSlug,
      payload: { displayName: connection.displayName },
    })

    return new HttpResponse(null, { status: 204 })
  }),


  http.delete('*/api/integrations/mcp/grants/:id', ({ request, params }) => {
    const denied = authorize(request, 'mcp.manage')
    if (denied)
      return denied

    const tenantId = getTenantId(request)
    const idx = db.grants.findIndex(g => g.id === params.id && g.tenantId === tenantId)

    if (idx === -1)
      return HttpResponse.json({ message: 'Grant not found' }, { status: 404 })

    const grant = db.grants[idx]

    db.grants.splice(idx, 1)

    appendAudit({
      tenantId,
      eventType: 'grant.revoked',
      actorId: getActorId(request),
      connectionId: grant.connectionId,
      payload: { principalId: grant.principalId, principalType: grant.principalType },
    })

    return new HttpResponse(null, { status: 204 })
  }),
]
