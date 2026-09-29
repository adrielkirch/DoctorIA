



export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'] as const
export type HttpMethod = (typeof HTTP_METHODS)[number]

export const GATEWAY_ROUTE_MODES = ['MOCK', 'PROXY'] as const
export type GatewayRouteMode = (typeof GATEWAY_ROUTE_MODES)[number]

export const GATEWAY_ROUTE_ROLES = ['ALL', 'USER', 'ADMIN'] as const
export type GatewayRouteRole = (typeof GATEWAY_ROUTE_ROLES)[number]

export interface GatewayRouteRateLimit {
  limit: number
  windowSec: number
}

export interface GatewayApiKey {
  id: string
  namespaceId: string
  tenantId: string
  name: string
  keyPrefix: string
  maskedKey: string
  enabled: boolean
  createdAt: string
  createdBy: string
  lastUsedAt?: string
}

export type GatewayInvocationActorType = 'jwt' | 'api_key' | 'public' | 'none'

export interface GatewayInvocationLog {
  id: string
  tenantId: string
  namespaceId: string
  namespaceSlug: string
  routeId: string
  method: string
  path: string
  status: number
  actorType: GatewayInvocationActorType
  actorId?: string
  latencyMs: number
  timestamp: string


  requestBodyPreview?: string
  responseBodyPreview?: string
}

export type ExtractionJobStatus = 'extracting' | 'awaiting_review' | 'confirmed' | 'cancelled'

export type ProposalApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface GatewayNamespace {
  id: string
  tenantId: string
  slug: string
  displayName: string
  description: string
  baseUrl: string


  credentialId?: string
  authHeader?: string
  authScheme?: string


  rateLimit?: GatewayRouteRateLimit | null
  routeCount: number
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface GatewayRoute {
  id: string
  namespaceId: string
  tenantId: string
  method: HttpMethod
  path: string
  mode: GatewayRouteMode
  isPublic: boolean
  requiredRole: GatewayRouteRole
  enabled: boolean
  mockPayload: string
  mockStatusCode: number
  mockLatencyMs: number
  upstreamUrl: string


  credentialId?: string
  authHeader?: string
  authScheme?: string


  requestTransform?: string
  responseTransform?: string
  rateLimit?: GatewayRouteRateLimit | null



  requestSchema?: object | null
  responseSchema?: object | null
  description: string
  createdAt: string
  updatedAt: string
}

export interface ExtractionProposal {
  id: string
  jobId: string
  method: HttpMethod
  path: string
  description: string
  inferredRequestSchema: object | null
  proposedMockResponse: string
  inferredRole: GatewayRouteRole
  approvalStatus: ProposalApprovalStatus
  unresolvedReason: string
  createdAt: string
}

export interface ExtractionJob {
  id: string
  tenantId: string
  targetNamespaceId: string
  rawInput: string
  status: ExtractionJobStatus
  proposalCount: number
  resolvedCount: number
  createdAt: string
  updatedAt: string
}



export interface GatewayNamespaceListResponse {
  namespaces: GatewayNamespace[]
  totalNamespaces: number
  totalPages: number
  page: number
}

export interface GatewayRouteListResponse {
  routes: GatewayRoute[]
  totalRoutes: number
  totalPages: number
  page: number
}

export interface GatewayInvocationListResponse {
  invocations: GatewayInvocationLog[]
  totalInvocations: number
  totalPages: number
  page: number
}

export interface QuickSetupResponse {
  job: ExtractionJob
  proposals: ExtractionProposal[]
}

export interface QuickSetupConfirmResponse {
  createdRoutes: GatewayRoute[]
  conflicts: Array<{ proposalId: string; reason: string }>
}



export const WEBHOOK_STATUS = ['active', 'inactive'] as const
export type GatewayWebhookStatus = (typeof WEBHOOK_STATUS)[number]

export const WEBHOOK_DELIVERY_STATUS = ['pending', 'delivered', 'failed'] as const
export type GatewayWebhookDeliveryStatus = (typeof WEBHOOK_DELIVERY_STATUS)[number]


export const WEBHOOK_EVENTS = ['route.invoked'] as const
export type GatewayWebhookEvent = (typeof WEBHOOK_EVENTS)[number]

export interface GatewayWebhook {
  id: string
  namespaceId: string
  tenantId: string
  name: string
  targetUrl: string
  events: string[]                    // ex.: ['route.invoked']
  maskedSecret: string                // secret NUNCA sai do servidor — só a máscara
  status: GatewayWebhookStatus
  rateLimit?: { limit: number; windowSec: number } | null
  ipAllowlist?: string[] | null       // opcional
  timeoutMs: number                   // default 10_000
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface GatewayWebhookAttempt {
  attempt: number                     // 1..maxAttempts (UI mostra "1/5", "2/5", …)
  httpStatus?: number
  responseTimeMs?: number
  error?: string
  attemptedAt: string
}

export interface GatewayWebhookDelivery {
  id: string
  webhookId: string
  namespaceId: string
  tenantId: string
  eventId: string                     // idempotência — único por evento gerado
  event: string                       // ex.: 'route.invoked'
  payload: string                     // JSON completo do corpo enviado (server-side)
  payloadPreview: string              // truncado para observabilidade
  status: GatewayWebhookDeliveryStatus
  attempts: GatewayWebhookAttempt[]
  maxAttempts: number                 // default 5
  nextRetryAt?: string
  correlationId: string               // request ID ponta a ponta
  isDeadLetter: boolean               // true após esgotar retries (DLQ)
  createdAt: string
  updatedAt: string
}

export interface GatewayWebhookListResponse {
  webhooks: GatewayWebhook[]
  totalWebhooks: number
  totalPages: number
  page: number
}

export interface GatewayWebhookDeliveryListResponse {
  deliveries: GatewayWebhookDelivery[]
  totalDeliveries: number
  totalPages: number
  page: number
}
