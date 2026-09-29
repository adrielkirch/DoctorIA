export type McpTrustTier = 'verified' | 'community' | 'internal'
export type McpProviderStatus = 'published' | 'deprecated' | 'retired'
export type McpConnectionStatus = 'draft' | 'validating' | 'active' | 'failed' | 'paused' | 'retired'
export type McpValidationStatus = 'pass' | 'fail' | 'none'
export type McpHealthStatus = 'healthy' | 'degraded' | 'unreachable'
export type McpActivationSource = 'auto_validation' | 'manual_override'
export type McpPrincipalType = 'agent' | 'role'

export interface McpProviderDefinition {
  id: string
  slug: string
  displayName: string
  category: string
  capabilities: string[]
  requiredSecrets: string[]
  trustTier: McpTrustTier
  status: McpProviderStatus
  maintainer: string
  docsUrl?: string
  createdAt: string
  updatedAt: string
}

export interface McpConnection {
  id: string
  tenantId: string
  providerSlug: string
  displayName: string
  status: McpConnectionStatus
  lastValidationStatus: McpValidationStatus
  lastValidationAt?: string
  healthStatus: McpHealthStatus
  connectedAt?: string
  activationSource: McpActivationSource
  updatedAt: string
  createdBy: string
  autoActivated: boolean
}

export interface McpCapabilityGrant {
  id: string
  tenantId: string
  connectionId: string
  principalType: McpPrincipalType
  principalId: string
  allowedCapabilities: string[]
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface ValidationCheck {
  name: string
  status: 'pass' | 'fail'
  detail: string
}

export interface McpValidationRun {
  id: string
  tenantId: string
  connectionId: string
  result: 'pass' | 'fail'
  checks: ValidationCheck[]
  startedAt: string
  finishedAt: string
  summaryMessage: string
}

export interface McpAuditEvent {
  id: string
  tenantId: string
  eventType: string
  actorId: string
  connectionId?: string
  providerSlug?: string
  payload: Record<string, unknown>
  createdAt: string
}

export interface McpStoreResponse {
  providers: McpProviderDefinition[]
  totalProviders: number
  totalPages: number
  page: number
  filters: {
    categories: string[]
    trustTiers: McpTrustTier[]
    statuses: McpProviderStatus[]
  }
}

export interface McpConnectedResponse {
  connections: McpConnection[]
  totalConnections: number
  totalPages: number
  page: number
  filters: {
    statuses: McpConnectionStatus[]
    healthStates: McpHealthStatus[]
  }
}

export interface McpAuditEventsResponse {
  events: McpAuditEvent[]
  totalEvents: number
  totalPages: number
  page: number
}

export interface ConnectRequestPayload {
  providerSlug: string
  displayName: string
  secrets: Record<string, string>
  requestedCapabilities: string[]
}

export interface RevalidateRequestPayload {
  reason?: string
}

export interface CapabilityGrantRequestPayload {
  principalType: McpPrincipalType
  principalId: string
  allowedCapabilities: string[]
}

export interface PublishProviderRequestPayload {
  slug: string
  displayName: string
  category: string
  capabilities: string[]
  requiredSecrets: string[]
  trustTier: McpTrustTier
  maintainer: string
  docsUrl?: string
}
