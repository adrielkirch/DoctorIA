import { z } from 'zod'
import { Expect, IsEqual } from '../../_parity'
import type {
  CapabilityGrantRequestPayload,
  ConnectRequestPayload,
  McpActivationSource,
  McpAuditEvent,
  McpAuditEventsResponse,
  McpCapabilityGrant,
  McpConnectedResponse,
  McpConnection,
  McpConnectionStatus,
  McpHealthStatus,
  McpPrincipalType,
  McpProviderDefinition,
  McpProviderStatus,
  McpStoreResponse,
  McpTrustTier,
  McpValidationRun,
  McpValidationStatus,
  PublishProviderRequestPayload,
  RevalidateRequestPayload,
  ValidationCheck,
} from './types'

export const mcpTrustTierSchema = z.enum(['verified', 'community', 'internal'])
export const mcpProviderStatusSchema = z.enum(['published', 'deprecated', 'retired'])
export const mcpConnectionStatusSchema = z.enum(['draft', 'validating', 'active', 'failed', 'paused', 'retired'])
export const mcpValidationStatusSchema = z.enum(['pass', 'fail', 'none'])
export const mcpHealthStatusSchema = z.enum(['healthy', 'degraded', 'unreachable'])
export const mcpActivationSourceSchema = z.enum(['auto_validation', 'manual_override'])
export const mcpPrincipalTypeSchema = z.enum(['agent', 'role'])

export const mcpProviderDefinitionSchema = z.object({
  id: z.string(),
  slug: z.string(),
  displayName: z.string(),
  category: z.string(),
  capabilities: z.array(z.string()),
  requiredSecrets: z.array(z.string()),
  trustTier: mcpTrustTierSchema,
  status: mcpProviderStatusSchema,
  maintainer: z.string(),
  docsUrl: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const mcpConnectionSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  providerSlug: z.string(),
  displayName: z.string(),
  status: mcpConnectionStatusSchema,
  lastValidationStatus: mcpValidationStatusSchema,
  lastValidationAt: z.string().optional(),
  healthStatus: mcpHealthStatusSchema,
  connectedAt: z.string().optional(),
  activationSource: mcpActivationSourceSchema,
  updatedAt: z.string(),
  createdBy: z.string(),
  autoActivated: z.boolean(),
})

export const mcpCapabilityGrantSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  connectionId: z.string(),
  principalType: mcpPrincipalTypeSchema,
  principalId: z.string(),
  allowedCapabilities: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
})

export const validationCheckSchema = z.object({
  name: z.string(),
  status: z.enum(['pass', 'fail']),
  detail: z.string(),
})

export const mcpValidationRunSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  connectionId: z.string(),
  result: z.enum(['pass', 'fail']),
  checks: z.array(validationCheckSchema),
  startedAt: z.string(),
  finishedAt: z.string(),
  summaryMessage: z.string(),
})

export const mcpAuditEventSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  eventType: z.string(),
  actorId: z.string(),
  connectionId: z.string().optional(),
  providerSlug: z.string().optional(),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.string(),
})

export const mcpStoreResponseSchema = z.object({
  providers: z.array(mcpProviderDefinitionSchema),
  totalProviders: z.number(),
  totalPages: z.number(),
  page: z.number(),
  filters: z.object({
    categories: z.array(z.string()),
    trustTiers: z.array(mcpTrustTierSchema),
    statuses: z.array(mcpProviderStatusSchema),
  }),
})

export const mcpConnectedResponseSchema = z.object({
  connections: z.array(mcpConnectionSchema),
  totalConnections: z.number(),
  totalPages: z.number(),
  page: z.number(),
  filters: z.object({
    statuses: z.array(mcpConnectionStatusSchema),
    healthStates: z.array(mcpHealthStatusSchema),
  }),
})

export const mcpAuditEventsResponseSchema = z.object({
  events: z.array(mcpAuditEventSchema),
  totalEvents: z.number(),
  totalPages: z.number(),
  page: z.number(),
})

export const connectRequestPayloadSchema = z.object({
  providerSlug: z.string(),
  displayName: z.string(),
  secrets: z.record(z.string(), z.string()),
  requestedCapabilities: z.array(z.string()),
})

export const revalidateRequestPayloadSchema = z.object({ reason: z.string().optional() })

export const capabilityGrantRequestPayloadSchema = z.object({
  principalType: mcpPrincipalTypeSchema,
  principalId: z.string(),
  allowedCapabilities: z.array(z.string()),
})

export const publishProviderRequestPayloadSchema = z.object({
  slug: z.string(),
  displayName: z.string(),
  category: z.string(),
  capabilities: z.array(z.string()),
  requiredSecrets: z.array(z.string()),
  trustTier: mcpTrustTierSchema,
  maintainer: z.string(),
  docsUrl: z.string().optional(),
})

type _M1 = Expect<IsEqual<z.infer<typeof mcpTrustTierSchema>, McpTrustTier>>
type _M2 = Expect<IsEqual<z.infer<typeof mcpProviderStatusSchema>, McpProviderStatus>>
type _M3 = Expect<IsEqual<z.infer<typeof mcpConnectionStatusSchema>, McpConnectionStatus>>
type _M4 = Expect<IsEqual<z.infer<typeof mcpValidationStatusSchema>, McpValidationStatus>>
type _M5 = Expect<IsEqual<z.infer<typeof mcpHealthStatusSchema>, McpHealthStatus>>
type _M6 = Expect<IsEqual<z.infer<typeof mcpActivationSourceSchema>, McpActivationSource>>
type _M7 = Expect<IsEqual<z.infer<typeof mcpPrincipalTypeSchema>, McpPrincipalType>>
type _M8 = Expect<IsEqual<z.infer<typeof mcpProviderDefinitionSchema>, McpProviderDefinition>>
type _M9 = Expect<IsEqual<z.infer<typeof mcpConnectionSchema>, McpConnection>>
type _M10 = Expect<IsEqual<z.infer<typeof mcpCapabilityGrantSchema>, McpCapabilityGrant>>
type _M11 = Expect<IsEqual<z.infer<typeof validationCheckSchema>, ValidationCheck>>
type _M12 = Expect<IsEqual<z.infer<typeof mcpValidationRunSchema>, McpValidationRun>>
type _M13 = Expect<IsEqual<z.infer<typeof mcpAuditEventSchema>, McpAuditEvent>>
type _M14 = Expect<IsEqual<z.infer<typeof mcpStoreResponseSchema>, McpStoreResponse>>
type _M15 = Expect<IsEqual<z.infer<typeof mcpConnectedResponseSchema>, McpConnectedResponse>>
type _M16 = Expect<IsEqual<z.infer<typeof mcpAuditEventsResponseSchema>, McpAuditEventsResponse>>
type _M17 = Expect<IsEqual<z.infer<typeof connectRequestPayloadSchema>, ConnectRequestPayload>>
type _M18 = Expect<IsEqual<z.infer<typeof revalidateRequestPayloadSchema>, RevalidateRequestPayload>>
type _M19 = Expect<IsEqual<z.infer<typeof capabilityGrantRequestPayloadSchema>, CapabilityGrantRequestPayload>>
type _M20 = Expect<IsEqual<z.infer<typeof publishProviderRequestPayloadSchema>, PublishProviderRequestPayload>>

