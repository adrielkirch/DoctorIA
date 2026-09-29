import { z } from 'zod'
import { Expect, IsEqual } from '../../_parity'
import {
    extractionJobSchema,
    extractionJobStatusSchema,
    extractionProposalSchema,
    gatewayApiKeySchema,
    gatewayInvocationActorTypeSchema,
    gatewayInvocationListResponseSchema,
    gatewayInvocationLogSchema,
    gatewayNamespaceListResponseSchema,
    gatewayNamespaceSchema,
    gatewayRouteListResponseSchema,
    gatewayRouteModeSchema,
    gatewayRouteRateLimitSchema,
    gatewayRouteRoleSchema,
    gatewayRouteSchema,
    gatewayWebhookAttemptSchema,
    gatewayWebhookDeliveryListResponseSchema,
    gatewayWebhookDeliverySchema,
    gatewayWebhookDeliveryStatusSchema,
    gatewayWebhookEventSchema,
    gatewayWebhookListResponseSchema,
    gatewayWebhookSchema,
    gatewayWebhookStatusSchema,
    httpMethodSchema,
    jsonObjectSchema,
    proposalApprovalStatusSchema,
    quickSetupConfirmResponseSchema,
    quickSetupResponseSchema,
} from '../../types/schemas'
import type {
    CreateApiKeyPayload,
    CreateNamespacePayload,
    CreateRoutePayload,
    CreateWebhookPayload,
    GatewayWebhookCreateResponse,
    GatewayWebhookUpdateResponse,
    QuickSetupConfirmPayload,
    QuickSetupPayload,
    UpdateNamespacePayload,
    UpdateRoutePayload,
    UpdateWebhookPayload,
} from './types'


export {
    extractionJobSchema,
    extractionJobStatusSchema,
    extractionProposalSchema,
    gatewayApiKeySchema,
    gatewayInvocationActorTypeSchema,
    gatewayInvocationListResponseSchema,
    gatewayInvocationLogSchema,
    gatewayNamespaceListResponseSchema,
    gatewayNamespaceSchema,
    gatewayRouteListResponseSchema,
    gatewayRouteModeSchema,
    gatewayRouteRateLimitSchema,
    gatewayRouteRoleSchema,
    gatewayRouteSchema,
    gatewayWebhookAttemptSchema,
    gatewayWebhookDeliveryListResponseSchema,
    gatewayWebhookDeliverySchema,
    gatewayWebhookDeliveryStatusSchema,
    gatewayWebhookEventSchema,
    gatewayWebhookListResponseSchema,
    gatewayWebhookSchema,
    gatewayWebhookStatusSchema,
    httpMethodSchema,
    proposalApprovalStatusSchema,
    quickSetupConfirmResponseSchema,
    quickSetupResponseSchema
}

export const createNamespacePayloadSchema = z.object({
  slug: z.string(),
  displayName: z.string(),
  description: z.string().optional(),
  baseUrl: z.string().optional(),
  credentialId: z.string().optional(),
  authHeader: z.string().optional(),
  authScheme: z.string().optional(),
  rateLimit: gatewayRouteRateLimitSchema.nullable().optional(),
})

export const updateNamespacePayloadSchema = z.object({
  displayName: z.string().optional(),
  description: z.string().optional(),
  baseUrl: z.string().optional(),
  credentialId: z.string().optional(),
  authHeader: z.string().optional(),
  authScheme: z.string().optional(),
  rateLimit: gatewayRouteRateLimitSchema.nullable().optional(),
})

export const createRoutePayloadSchema = z.object({
  method: z.string(),
  path: z.string(),
  mode: z.string(),
  isPublic: z.boolean().optional(),
  requiredRole: z.string().optional(),
  enabled: z.boolean().optional(),
  mockPayload: z.string().optional(),
  mockStatusCode: z.number().optional(),
  mockLatencyMs: z.number().optional(),
  upstreamUrl: z.string().optional(),
  credentialId: z.string().optional(),
  authHeader: z.string().optional(),
  authScheme: z.string().optional(),
  requestTransform: z.string().optional(),
  responseTransform: z.string().optional(),
  requestSchema: jsonObjectSchema.nullable().optional(),
  responseSchema: jsonObjectSchema.nullable().optional(),
  rateLimit: gatewayRouteRateLimitSchema.nullable().optional(),
  description: z.string().optional(),
})

export const updateRoutePayloadSchema = createRoutePayloadSchema.partial()

export const createApiKeyPayloadSchema = z.object({ name: z.string() })

export const quickSetupPayloadSchema = z.object({
  rawInput: z.string(),
  targetNamespaceId: z.string().optional(),
})

export const quickSetupConfirmPayloadSchema = z.object({
  namespaceId: z.string(),
  approvedProposalIds: z.array(z.string()),
})

export const createWebhookPayloadSchema = z.object({
  name: z.string(),
  targetUrl: z.string(),
  events: z.array(z.string()),
  status: gatewayWebhookStatusSchema.optional(),
  rateLimit: gatewayRouteRateLimitSchema.nullable().optional(),
  ipAllowlist: z.array(z.string()).nullable().optional(),
  timeoutMs: z.number().optional(),
})

export const updateWebhookPayloadSchema = createWebhookPayloadSchema
  .partial()
  .extend({ regenerateSecret: z.boolean().optional() })

export const gatewayWebhookCreateResponseSchema = z.object({
  webhook: gatewayWebhookSchema,
  secret: z.string(),
})

export const gatewayWebhookUpdateResponseSchema = z.object({
  webhook: gatewayWebhookSchema,
  secret: z.string().optional(),
})

type _GW1 = Expect<IsEqual<z.infer<typeof createNamespacePayloadSchema>, CreateNamespacePayload>>
type _GW2 = Expect<IsEqual<z.infer<typeof updateNamespacePayloadSchema>, UpdateNamespacePayload>>
type _GW3 = Expect<IsEqual<z.infer<typeof createRoutePayloadSchema>, CreateRoutePayload>>
type _GW4 = Expect<IsEqual<z.infer<typeof updateRoutePayloadSchema>, UpdateRoutePayload>>
type _GW5 = Expect<IsEqual<z.infer<typeof createApiKeyPayloadSchema>, CreateApiKeyPayload>>
type _GW6 = Expect<IsEqual<z.infer<typeof quickSetupPayloadSchema>, QuickSetupPayload>>
type _GW7 = Expect<IsEqual<z.infer<typeof quickSetupConfirmPayloadSchema>, QuickSetupConfirmPayload>>
type _GW8 = Expect<IsEqual<z.infer<typeof createWebhookPayloadSchema>, CreateWebhookPayload>>
type _GW9 = Expect<IsEqual<z.infer<typeof updateWebhookPayloadSchema>, UpdateWebhookPayload>>
type _GW10 = Expect<IsEqual<z.infer<typeof gatewayWebhookCreateResponseSchema>, GatewayWebhookCreateResponse>>
type _GW11 = Expect<IsEqual<z.infer<typeof gatewayWebhookUpdateResponseSchema>, GatewayWebhookUpdateResponse>>
