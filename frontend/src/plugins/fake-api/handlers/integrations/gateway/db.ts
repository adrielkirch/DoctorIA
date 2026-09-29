import type { ExtractionJob, ExtractionProposal, GatewayApiKey, GatewayInvocationLog, GatewayNamespace, GatewayRoute, GatewayWebhook, GatewayWebhookDelivery } from 'contracts/types/gateway';



const apiKeyValues = new Map<string, string>()
const rateBuckets = new Map<string, { window: number; count: number }>()
const webhookSecretValues = new Map<string, string>()

interface GatewayDB {
  namespaces: GatewayNamespace[]
  routes: GatewayRoute[]
  extractionJobs: ExtractionJob[]
  extractionProposals: ExtractionProposal[]
  apiKeys: GatewayApiKey[]
  invocations: GatewayInvocationLog[]
  webhooks: GatewayWebhook[]
  deliveries: GatewayWebhookDelivery[]
}

const now = '2026-08-02T10:00:00.000Z'

export const db: GatewayDB = {
  namespaces: [
    {
      id: 'ns-meta',
      tenantId: 'workspace-alpha',
      slug: 'meta',
      displayName: 'Meta',
      description: 'Meta Graph API for Facebook and Messenger messaging',
      baseUrl: 'https://graph.facebook.com',
      routeCount: 3,
      createdAt: now,
      updatedAt: now,
      createdBy: 'user-admin',
    },
    {
      id: 'ns-whatsapp',
      tenantId: 'workspace-alpha',
      slug: 'whatsapp',
      displayName: 'WhatsApp',
      description: 'WhatsApp Cloud API messaging',
      baseUrl: 'https://graph.facebook.com',
      routeCount: 3,
      createdAt: now,
      updatedAt: now,
      createdBy: 'user-admin',
    },
    {
      id: 'ns-instagram',
      tenantId: 'workspace-alpha',
      slug: 'instagram',
      displayName: 'Instagram',
      description: 'Instagram Messaging API through Meta',
      baseUrl: 'https://graph.facebook.com',
      routeCount: 3,
      createdAt: now,
      updatedAt: now,
      createdBy: 'user-admin',
    },
    {
      id: 'ns-crm-sandbox',
      tenantId: 'workspace-alpha',
      slug: 'crm-sandbox',
      displayName: 'CRM Sandbox',
      description: 'Demo namespace — proxies to the built-in mock upstream (echo) with credential injection',
      baseUrl: '/api/integrations/gateway/_upstream',
      credentialId: '20',
      authHeader: 'Authorization',
      authScheme: 'Bearer',
      routeCount: 2,
      createdAt: now,
      updatedAt: now,
      createdBy: 'user-admin',
    },
    {
      id: 'ns-shipping-api',
      tenantId: 'workspace-beta',
      slug: 'shipping',
      displayName: 'Shipping API',
      description: 'Global shipping quotes, labels and tracking (Globex demo namespace)',
      baseUrl: 'https://api.shipping.example.com',
      routeCount: 3,
      createdAt: now,
      updatedAt: now,
      createdBy: 'user-admin',
    },

  ],
  routes: [

    {
      id: 'route-meta-messages',
      namespaceId: 'ns-meta',
      tenantId: 'workspace-alpha',
      method: 'POST',
      path: '/v21.0/:page_id/messages',
      mode: 'MOCK',
      isPublic: false,
      requiredRole: 'USER',
      enabled: true,
      mockPayload: JSON.stringify({ recipient_id: 'page_123', message_id: 'mid.meta.seed.001' }),
      mockStatusCode: 200,
      mockLatencyMs: 0,
      upstreamUrl: '',
      description: 'Send a Facebook or Messenger message',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'route-meta-webhook',
      namespaceId: 'ns-meta',
      tenantId: 'workspace-alpha',
      method: 'GET',
      path: '/webhooks/meta',
      mode: 'MOCK',
      isPublic: false,
      requiredRole: 'USER',
      enabled: true,
      mockPayload: JSON.stringify({ received: true, provider: 'meta' }),
      mockStatusCode: 200,
      mockLatencyMs: 0,
      upstreamUrl: '',
      description: 'Receive Meta webhook events',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'route-meta-pixel-events',
      namespaceId: 'ns-meta',
      tenantId: 'workspace-alpha',
      method: 'POST',
      path: '/v21.0/:pixel_id/events',
      mode: 'MOCK',
      isPublic: false,
      requiredRole: 'ADMIN',
      enabled: true,
      mockPayload: JSON.stringify({ events_received: 1 }),
      mockStatusCode: 200,
      mockLatencyMs: 0,
      upstreamUrl: '',
      description: 'Receive Meta Pixel conversion events',
      createdAt: now,
      updatedAt: now,
    },


    {
      id: 'route-whatsapp-messages',
      namespaceId: 'ns-whatsapp',
      tenantId: 'workspace-alpha',
      method: 'POST',
      path: '/v21.0/:phone_number_id/messages',
      mode: 'MOCK',
      isPublic: false,
      requiredRole: 'USER',
      enabled: true,
      mockPayload: JSON.stringify({ messaging_product: 'whatsapp', messages: [{ id: 'wamid.seed.001' }] }),
      mockStatusCode: 200,
      mockLatencyMs: 300,
      upstreamUrl: '',
      description: 'Send a WhatsApp message',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'route-whatsapp-webhook',
      namespaceId: 'ns-whatsapp',
      tenantId: 'workspace-alpha',
      method: 'GET',
      path: '/webhooks/whatsapp',
      mode: 'MOCK',
      isPublic: false,
      requiredRole: 'USER',
      enabled: true,
      mockPayload: JSON.stringify({ object: 'whatsapp_business_account', entry: [] }),
      mockStatusCode: 200,
      mockLatencyMs: 0,
      upstreamUrl: '',
      description: 'Receive WhatsApp webhook events',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'route-whatsapp-profile',
      namespaceId: 'ns-whatsapp',
      tenantId: 'workspace-alpha',
      method: 'GET',
      path: '/v21.0/:phone_number_id',
      mode: 'MOCK',
      isPublic: true,
      requiredRole: 'ALL',
      enabled: true,
      mockPayload: JSON.stringify({ id: 'phone_123', verified_name: 'DoctorIA Demo' }),
      mockStatusCode: 200,
      mockLatencyMs: 0,
      upstreamUrl: '',
      description: 'Read WhatsApp business profile',
      createdAt: now,
      updatedAt: now,
    },


    {
      id: 'route-instagram-messages',
      namespaceId: 'ns-instagram',
      tenantId: 'workspace-alpha',
      method: 'POST',
      path: '/v21.0/:instagram_id/messages',
      mode: 'MOCK',
      isPublic: false,
      requiredRole: 'USER',
      enabled: true,
      mockPayload: JSON.stringify({ recipient_id: 'ig_user_123', message_id: 'mid.instagram.seed.001' }),
      mockStatusCode: 200,
      mockLatencyMs: 0,
      upstreamUrl: '',
      description: 'Send an Instagram message',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'route-instagram-webhook',
      namespaceId: 'ns-instagram',
      tenantId: 'workspace-alpha',
      method: 'POST',
      path: '/webhooks/instagram',
      mode: 'MOCK',
      isPublic: true,
      requiredRole: 'ALL',
      enabled: true,
      mockPayload: JSON.stringify({ object: 'instagram', entry: [] }),
      mockStatusCode: 200,
      mockLatencyMs: 0,
      upstreamUrl: '',
      description: 'Receive Instagram webhook events',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'route-instagram-profile',
      namespaceId: 'ns-instagram',
      tenantId: 'workspace-alpha',
      method: 'GET',
      path: '/v21.0/:instagram_id',
      mode: 'MOCK',
      isPublic: false,
      requiredRole: 'USER',
      enabled: true,
      mockPayload: JSON.stringify({ id: 'ig_123', username: 'doctoria.demo' }),
      mockStatusCode: 200,
      mockLatencyMs: 0,
      upstreamUrl: '',
      description: 'Read Instagram business profile',
      createdAt: now,
      updatedAt: now,
    },


    {
      id: 'route-sandbox-customers',
      namespaceId: 'ns-crm-sandbox',
      tenantId: 'workspace-alpha',
      method: 'GET',
      path: '/customers',
      mode: 'PROXY',
      isPublic: false,
      requiredRole: 'USER',
      enabled: true,
      mockPayload: '{}',
      mockStatusCode: 200,
      mockLatencyMs: 0,
      upstreamUrl: '',
      credentialId: '20',
      authHeader: 'Authorization',
      authScheme: 'Bearer',
      description: 'Proxy GET /customers to the mock upstream using the namespace baseUrl',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'route-sandbox-customer-by-id',
      namespaceId: 'ns-crm-sandbox',
      tenantId: 'workspace-alpha',
      method: 'GET',
      path: '/customers/:id',
      mode: 'PROXY',
      isPublic: false,
      requiredRole: 'USER',
      enabled: true,
      mockPayload: '{}',
      mockStatusCode: 200,
      mockLatencyMs: 0,
      upstreamUrl: '/api/integrations/gateway/_upstream/customers/:id',
      credentialId: '20',
      authHeader: 'Authorization',
      authScheme: 'Bearer',
      description: 'Proxy GET /customers/:id with path-param substitution to the mock upstream',
      createdAt: now,
      updatedAt: now,
    },


    {
      id: 'route-ship-quote',
      namespaceId: 'ns-shipping-api',
      tenantId: 'workspace-beta',
      method: 'POST',
      path: '/v1/quotes',
      mode: 'MOCK',
      isPublic: false,
      requiredRole: 'USER',
      enabled: true,
      mockPayload: JSON.stringify({ quote_id: 'qt_8f3k1p', provider: 'fedex', service: 'ground', currency: 'BRL', amount: 42.9, estimated_days: 5, created: now }),
      mockStatusCode: 201,
      mockLatencyMs: 120,
      upstreamUrl: '',
      description: 'Create a shipping quote',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'route-ship-status',
      namespaceId: 'ns-shipping-api',
      tenantId: 'workspace-beta',
      method: 'GET',
      path: '/v1/shipments/:id',
      mode: 'MOCK',
      isPublic: false,
      requiredRole: 'USER',
      enabled: true,
      mockPayload: JSON.stringify({ shipment_id: 'sh_102030', status: 'in_transit', carrier: 'fedex', tracking: '7722X11220030003333', eta: '2026-08-08T18:00:00.000Z' }),
      mockStatusCode: 200,
      mockLatencyMs: 0,
      upstreamUrl: '',
      description: 'Get shipment tracking status by ID',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'route-ship-health',
      namespaceId: 'ns-shipping-api',
      tenantId: 'workspace-beta',
      method: 'GET',
      path: '/v1/health',
      mode: 'MOCK',
      isPublic: true,
      requiredRole: 'ALL',
      enabled: true,
      mockPayload: JSON.stringify({ status: 'ok', service: 'shipping-api', version: '1.4.2' }),
      mockStatusCode: 200,
      mockLatencyMs: 0,
      upstreamUrl: '',
      description: 'Public health check endpoint',
      createdAt: now,
      updatedAt: now,
    },

  ],
  extractionJobs: [],
  extractionProposals: [],
  apiKeys: [
    {
      id: 'apikey-sandbox',
      namespaceId: 'ns-crm-sandbox',
      tenantId: 'workspace-alpha',
      name: 'Sandbox demo key',
      keyPrefix: 'gwk_',
      maskedKey: 'gwk_****0b61',
      enabled: true,
      createdAt: now,
      createdBy: 'user-admin',
    },
  ],
  invocations: [],
  webhooks: [
    {
      id: 'wh-meta-messages',
      namespaceId: 'ns-meta',
      tenantId: 'workspace-alpha',
      name: 'Meta Message Events',
      targetUrl: '/api/integrations/gateway/_upstream/echo/webhook/meta',
      events: ['route.invoked'],
      maskedSecret: 'whsec_a1b2****9f0e',
      status: 'active',
      rateLimit: { limit: 60, windowSec: 60 },
      ipAllowlist: null,
      timeoutMs: 10_000,
      createdAt: now,
      updatedAt: now,
      createdBy: 'user-admin',
    },
    {
      id: 'wh-whatsapp-messages',
      namespaceId: 'ns-whatsapp',
      tenantId: 'workspace-alpha',
      name: 'WhatsApp Message Events',
      targetUrl: '/api/integrations/gateway/_upstream/echo/webhook/whatsapp',
      events: ['route.invoked'],
      maskedSecret: 'whsec_c3d4****77aa',
      status: 'active',
      rateLimit: null,
      ipAllowlist: null,
      timeoutMs: 10_000,
      createdAt: now,
      updatedAt: now,
      createdBy: 'user-admin',
    },
    {
      id: 'wh-instagram-messages',
      namespaceId: 'ns-instagram',
      tenantId: 'workspace-alpha',
      name: 'Instagram Message Events',
      targetUrl: '/api/integrations/gateway/_upstream/echo/webhook/instagram',
      events: ['route.invoked'],
      maskedSecret: 'whsec_i9n8****7m6a',
      status: 'active',
      rateLimit: { limit: 60, windowSec: 60 },
      ipAllowlist: null,
      timeoutMs: 10_000,
      createdAt: now,
      updatedAt: now,
      createdBy: 'user-admin',
    },
  ],
  deliveries: [
    {
      id: 'whd-1',
      webhookId: 'wh-meta-messages',
      namespaceId: 'ns-meta',
      tenantId: 'workspace-alpha',
      eventId: 'wh_evt_seed_0001',
      event: 'route.invoked',
      payload: JSON.stringify({ event: 'route.invoked', eventId: 'wh_evt_seed_0001', data: { namespace: 'meta', route: { method: 'POST', path: '/v21.0/:page_id/messages' }, status: 200 } }),
      payloadPreview: JSON.stringify({ event: 'route.invoked', eventId: 'wh_evt_seed_0001', data: { namespace: 'meta', route: { method: 'POST', path: '/v21.0/:page_id/messages' }, status: 200 } }).slice(0, 120),
      status: 'delivered',
      attempts: [{ attempt: 1, httpStatus: 200, responseTimeMs: 84, attemptedAt: now }],
      maxAttempts: 5,
      correlationId: 'req_seed_0001',
      isDeadLetter: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'whd-2',
      webhookId: 'wh-whatsapp-messages',
      namespaceId: 'ns-whatsapp',
      tenantId: 'workspace-alpha',
      eventId: 'wh_evt_seed_0002',
      event: 'route.invoked',
      payload: JSON.stringify({ event: 'route.invoked', eventId: 'wh_evt_seed_0002', data: { namespace: 'whatsapp', route: { method: 'POST', path: '/v21.0/:phone_number_id/messages' }, status: 200 } }),
      payloadPreview: JSON.stringify({ event: 'route.invoked', eventId: 'wh_evt_seed_0002', data: { namespace: 'whatsapp', route: { method: 'POST', path: '/v21.0/:phone_number_id/messages' }, status: 200 } }).slice(0, 120),
      status: 'failed',
      attempts: [
        { attempt: 1, httpStatus: 500, responseTimeMs: 12, error: 'UPSTREAM_500', attemptedAt: now },
        { attempt: 2, httpStatus: 500, responseTimeMs: 10, error: 'UPSTREAM_500', attemptedAt: now },
        { attempt: 3, httpStatus: 500, responseTimeMs: 11, error: 'UPSTREAM_500', attemptedAt: now },
      ],
      maxAttempts: 5,
      correlationId: 'req_seed_0002',
      isDeadLetter: false,
      createdAt: now,
      updatedAt: now,
    },
  ],
}


setWebhookSecretValue('wh-meta-messages', 'whsec_a1b2c3d4e5f6a7b8c9d0e1f2')
setWebhookSecretValue('wh-whatsapp-messages', 'whsec_c3d4e5f6a7b8c9d0e1f2a3b4')
setWebhookSecretValue('wh-instagram-messages', 'whsec_i9n8o7p6q5r4s3t2')


setApiKeyValue('apikey-sandbox', 'gwk_demo-123456')

export function getNamespacesForTenant(tenantId: string) {
  return db.namespaces.filter(n => n.tenantId === tenantId)
}

export function getNamespaceById(id: string, tenantId: string) {
  return db.namespaces.find(n => n.id === id && n.tenantId === tenantId) ?? null
}

export function getNamespaceBySlug(slug: string, tenantId: string) {
  return db.namespaces.find(n => n.slug === slug && n.tenantId === tenantId) ?? null
}

export function getRoutesForNamespace(namespaceId: string, tenantId: string) {
  return db.routes.filter(r => r.namespaceId === namespaceId && r.tenantId === tenantId)
}

export function getRouteById(id: string, namespaceId: string, tenantId: string) {
  return db.routes.find(r => r.id === id && r.namespaceId === namespaceId && r.tenantId === tenantId) ?? null
}

export function hasDuplicateRoute(namespaceId: string, method: string, path: string, excludeId?: string) {
  return db.routes.some(r => r.namespaceId === namespaceId && r.method === method && r.path === path && r.id !== excludeId)
}

export function recalcRouteCount(namespaceId: string) {
  const ns = db.namespaces.find(n => n.id === namespaceId)
  if (ns)
    ns.routeCount = db.routes.filter(r => r.namespaceId === namespaceId).length
}

/**
 * Finds every gateway entity (namespace or route) of a tenant that references a
 * given credential. The credentials API uses this to refuse deletion while a
 * reference still exists — keeping the gateway ↔ credentials contracts married.
 */
export function getCredentialReferences(credentialId: string | number, tenantId: string) {
  const ref = String(credentialId)

  return {
    namespaces: db.namespaces.filter(n => n.tenantId === tenantId && n.credentialId === ref),
    routes: db.routes.filter(r => r.tenantId === tenantId && r.credentialId === ref),
  }
}





export function setApiKeyValue(id: string, value: string): void {
  apiKeyValues.set(id, value)
}

export function deleteApiKeyValue(id: string): void {
  apiKeyValues.delete(id)
}

export function clearApiKeyValues(): void {
  apiKeyValues.clear()
}

export function getApiKeysForNamespace(namespaceId: string, tenantId: string): GatewayApiKey[] {
  return db.apiKeys.filter(k => k.namespaceId === namespaceId && k.tenantId === tenantId)
}

export function getApiKeyById(id: string, namespaceId: string, tenantId: string): GatewayApiKey | null {
  return db.apiKeys.find(k => k.id === id && k.namespaceId === namespaceId && k.tenantId === tenantId) ?? null
}

export function getApiKeyByValue(key: string, tenantId: string): GatewayApiKey | null {
  for (const [id, value] of apiKeyValues) {
    if (value === key) {
      const entry = db.apiKeys.find(k => k.id === id && k.tenantId === tenantId)
      if (entry)
        return entry
    }
  }

  return null
}




export function clearRateBuckets(): void {
  rateBuckets.clear()
}

export function consumeRateLimit(
  tenantId: string,
  namespaceId: string,
  routeId: string,
  config: { limit: number; windowSec: number },
  scopeKey?: string,
): boolean {
  const windowSec = Math.max(config.windowSec, 1)
  const window = Math.floor(Date.now() / 1000 / windowSec)
  const actor = scopeKey ? `:${scopeKey}` : ''
  const key = `${tenantId}:${namespaceId}:${routeId}${actor}:${window}`
  const bucket = rateBuckets.get(key)

  if (!bucket) {
    rateBuckets.set(key, { window, count: 1 })

    return true
  }

  bucket.count += 1

  return bucket.count <= config.limit
}




export function setWebhookSecretValue(id: string, value: string): void {
  webhookSecretValues.set(id, value)
}

export function getWebhookSecretValue(id: string): string | undefined {
  return webhookSecretValues.get(id)
}

export function deleteWebhookSecretValue(id: string): void {
  webhookSecretValues.delete(id)
}

export function generateWebhookSecret(): string {
  const random = Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return `whsec_${random}`
}

export function maskWebhookSecret(secret: string): string {
  return `${secret.slice(0, 8)}****${secret.slice(-4)}`
}

export function getWebhooksForNamespace(namespaceId: string, tenantId: string): GatewayWebhook[] {
  return db.webhooks.filter(w => w.namespaceId === namespaceId && w.tenantId === tenantId)
}

export function getWebhookById(id: string, namespaceId: string, tenantId: string): GatewayWebhook | null {
  return db.webhooks.find(w => w.id === id && w.namespaceId === namespaceId && w.tenantId === tenantId) ?? null
}

export function getDeliveriesForWebhook(webhookId: string, namespaceId: string, tenantId: string): GatewayWebhookDelivery[] {
  return db.deliveries.filter(d => d.webhookId === webhookId && d.namespaceId === namespaceId && d.tenantId === tenantId)
}

export function getDeliveryById(id: string, webhookId: string, namespaceId: string, tenantId: string): GatewayWebhookDelivery | null {
  return db.deliveries.find(d => d.id === id && d.webhookId === webhookId && d.namespaceId === namespaceId && d.tenantId === tenantId) ?? null
}

export function pushWebhookDelivery(delivery: GatewayWebhookDelivery): void {
  db.deliveries.push(delivery)
}
