


import type {
  GatewayRouteRateLimit,
  GatewayWebhook,
  GatewayWebhookStatus,
} from '../../types/gateway'

export type {
  ExtractionJob,
  ExtractionJobStatus,
  ExtractionProposal,
  GatewayApiKey, GatewayInvocationActorType, GatewayInvocationLog, GatewayNamespace,
  GatewayRoute,
  GatewayRouteMode,
  GatewayRouteRateLimit,
  GatewayRouteRole,
  GatewayWebhook,
  GatewayWebhookAttempt,
  GatewayWebhookDelivery,
  GatewayWebhookDeliveryStatus,
  GatewayWebhookEvent,
  GatewayWebhookStatus,
  HttpMethod,
  ProposalApprovalStatus
} from '../../types/gateway'

export interface CreateNamespacePayload {
  slug: string
  displayName: string
  description?: string
  baseUrl?: string
  credentialId?: string
  authHeader?: string
  authScheme?: string
  rateLimit?: GatewayRouteRateLimit | null
}

export interface UpdateNamespacePayload {
  displayName?: string
  description?: string
  baseUrl?: string
  credentialId?: string
  authHeader?: string
  authScheme?: string
  rateLimit?: GatewayRouteRateLimit | null
}

export interface CreateRoutePayload {
  method: string
  path: string
  mode: string
  isPublic?: boolean
  requiredRole?: string
  enabled?: boolean
  mockPayload?: string
  mockStatusCode?: number
  mockLatencyMs?: number
  upstreamUrl?: string
  credentialId?: string
  authHeader?: string
  authScheme?: string
  requestTransform?: string
  responseTransform?: string
  requestSchema?: object | null
  responseSchema?: object | null
  rateLimit?: GatewayRouteRateLimit | null
  description?: string
}

export interface UpdateRoutePayload extends Partial<CreateRoutePayload> {}

export interface CreateApiKeyPayload {
  name: string
}

export interface QuickSetupPayload {
  rawInput: string
  targetNamespaceId?: string
}

export interface QuickSetupConfirmPayload {
  namespaceId: string
  approvedProposalIds: string[]
}



export interface CreateWebhookPayload {
  name: string
  targetUrl: string
  events: string[]
  status?: GatewayWebhookStatus
  rateLimit?: GatewayRouteRateLimit | null
  ipAllowlist?: string[] | null
  timeoutMs?: number
}

export interface UpdateWebhookPayload extends Partial<CreateWebhookPayload> {
  regenerateSecret?: boolean // true → novo secret, exposto UMA vez na resposta
}

export interface GatewayWebhookCreateResponse {
  webhook: GatewayWebhook
  secret: string
}

export interface GatewayWebhookUpdateResponse {
  webhook: GatewayWebhook
  secret?: string // presente apenas quando regenerateSecret: true
}
