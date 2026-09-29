/**
 * Schemas zod GLOBAIS — espelham os DTOs de `types/` (accessControl, discovery,
 * gateway, tenant). Cada `Expect<IsEqual<...>>` é o check de paridade em compile-time:
 * se o schema divergir do type TS (fonte de verdade), o typecheck quebra.
 *
 * Importados pelas features e por `scripts/build-openapi.ts`.
 */
import { z } from 'zod'
import { Expect, IsEqual } from '../_parity'
import type {
    AppFeature,
    FeatureSurface,
    GlobalRole,
    GlobalRoleId,
    MyAccess,
    PermissionAction,
    PermissionAreaId,
    PermissionId,
    Permission as PermissionType,
} from './accessControl'
import {
    GLOBAL_ROLES,
    PERMISSION_ACTIONS,
    PERMISSION_AREAS,
    PERMISSIONS,
} from './accessControl'
import type { FrozenModuleDefinition as FrozenModuleDefinitionType } from './discovery'
import type {
    ExtractionJob as ExtractionJobType,
    ExtractionProposal as ExtractionProposalType,
    GatewayApiKey as GatewayApiKeyType,
    GatewayInvocationListResponse as GatewayInvocationListResponseType,
    GatewayInvocationLog as GatewayInvocationLogType,
    GatewayNamespaceListResponse as GatewayNamespaceListResponseType,
    GatewayNamespace as GatewayNamespaceType,
    GatewayRouteListResponse as GatewayRouteListResponseType,
    GatewayRouteRateLimit as GatewayRouteRateLimitType,
    GatewayRoute as GatewayRouteType,
    GatewayWebhookAttempt as GatewayWebhookAttemptType,
    GatewayWebhookDeliveryListResponse as GatewayWebhookDeliveryListResponseType,
    GatewayWebhookDelivery as GatewayWebhookDeliveryType,
    GatewayWebhookListResponse as GatewayWebhookListResponseType,
    GatewayWebhook as GatewayWebhookType,
    HttpMethod as HttpMethodType,
    QuickSetupConfirmResponse as QuickSetupConfirmResponseType,
    QuickSetupResponse as QuickSetupResponseType,
} from './gateway'
import {
    GATEWAY_ROUTE_MODES,
    GATEWAY_ROUTE_ROLES,
    HTTP_METHODS,
    WEBHOOK_DELIVERY_STATUS,
    WEBHOOK_EVENTS,
    WEBHOOK_STATUS,
} from './gateway'
import type {
    Membership as MembershipType,
    Session as SessionType,
    SessionUser as SessionUserType,
    Tenant as TenantType,
} from './tenant'

const isObject = (v: unknown): v is object => typeof v === 'object' && v !== null
/**
 * JSON Schema embutido (ex.: `requestSchema` de uma rota). O OpenAPI não modela
 * `object` com fidelidade — emitimos `{ type: 'object' }` no artefato gerado.
 */
export const jsonObjectSchema = z.custom<object>(isObject).meta({ type: 'object' })



export const httpMethodSchema = z.enum(HTTP_METHODS)
export const gatewayRouteModeSchema = z.enum(GATEWAY_ROUTE_MODES)
export const gatewayRouteRoleSchema = z.enum(GATEWAY_ROUTE_ROLES)

export const gatewayRouteRateLimitSchema = z.object({
  limit: z.number(),
  windowSec: z.number(),
})

export const gatewayApiKeySchema = z.object({
  id: z.string(),
  namespaceId: z.string(),
  tenantId: z.string(),
  name: z.string(),
  keyPrefix: z.string(),
  maskedKey: z.string(),
  enabled: z.boolean(),
  createdAt: z.string(),
  createdBy: z.string(),
  lastUsedAt: z.string().optional(),
})

export const gatewayInvocationActorTypeSchema = z.enum(['jwt', 'api_key', 'public', 'none'])

export const gatewayInvocationLogSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  namespaceId: z.string(),
  namespaceSlug: z.string(),
  routeId: z.string(),
  method: z.string(),
  path: z.string(),
  status: z.number(),
  actorType: gatewayInvocationActorTypeSchema,
  actorId: z.string().optional(),
  latencyMs: z.number(),
  timestamp: z.string(),
  requestBodyPreview: z.string().optional(),
  responseBodyPreview: z.string().optional(),
})

export const extractionJobStatusSchema = z.enum(['extracting', 'awaiting_review', 'confirmed', 'cancelled'])
export const proposalApprovalStatusSchema = z.enum(['pending', 'approved', 'rejected'])

export const gatewayNamespaceSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  slug: z.string(),
  displayName: z.string(),
  description: z.string(),
  baseUrl: z.string(),
  credentialId: z.string().optional(),
  authHeader: z.string().optional(),
  authScheme: z.string().optional(),
  rateLimit: gatewayRouteRateLimitSchema.nullable().optional(),
  routeCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
})

export const gatewayRouteSchema = z.object({
  id: z.string(),
  namespaceId: z.string(),
  tenantId: z.string(),
  method: httpMethodSchema,
  path: z.string(),
  mode: gatewayRouteModeSchema,
  isPublic: z.boolean(),
  requiredRole: gatewayRouteRoleSchema,
  enabled: z.boolean(),
  mockPayload: z.string(),
  mockStatusCode: z.number(),
  mockLatencyMs: z.number(),
  upstreamUrl: z.string(),
  credentialId: z.string().optional(),
  authHeader: z.string().optional(),
  authScheme: z.string().optional(),
  requestTransform: z.string().optional(),
  responseTransform: z.string().optional(),
  rateLimit: gatewayRouteRateLimitSchema.nullable().optional(),
  requestSchema: jsonObjectSchema.nullable().optional(),
  responseSchema: jsonObjectSchema.nullable().optional(),
  description: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const extractionProposalSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  method: httpMethodSchema,
  path: z.string(),
  description: z.string(),
  inferredRequestSchema: jsonObjectSchema.nullable(),
  proposedMockResponse: z.string(),
  inferredRole: gatewayRouteRoleSchema,
  approvalStatus: proposalApprovalStatusSchema,
  unresolvedReason: z.string(),
  createdAt: z.string(),
})

export const extractionJobSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  targetNamespaceId: z.string(),
  rawInput: z.string(),
  status: extractionJobStatusSchema,
  proposalCount: z.number(),
  resolvedCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const gatewayNamespaceListResponseSchema = z.object({
  namespaces: z.array(gatewayNamespaceSchema),
  totalNamespaces: z.number(),
  totalPages: z.number(),
  page: z.number(),
})

export const gatewayRouteListResponseSchema = z.object({
  routes: z.array(gatewayRouteSchema),
  totalRoutes: z.number(),
  totalPages: z.number(),
  page: z.number(),
})

export const gatewayInvocationListResponseSchema = z.object({
  invocations: z.array(gatewayInvocationLogSchema),
  totalInvocations: z.number(),
  totalPages: z.number(),
  page: z.number(),
})

export const quickSetupResponseSchema = z.object({
  job: extractionJobSchema,
  proposals: z.array(extractionProposalSchema),
})

export const quickSetupConfirmResponseSchema = z.object({
  createdRoutes: z.array(gatewayRouteSchema),
  conflicts: z.array(z.object({ proposalId: z.string(), reason: z.string() })),
})

export const gatewayWebhookStatusSchema = z.enum(WEBHOOK_STATUS)
export const gatewayWebhookDeliveryStatusSchema = z.enum(WEBHOOK_DELIVERY_STATUS)
export const gatewayWebhookEventSchema = z.enum(WEBHOOK_EVENTS)

export const gatewayWebhookSchema = z.object({
  id: z.string(),
  namespaceId: z.string(),
  tenantId: z.string(),
  name: z.string(),
  targetUrl: z.string(),
  events: z.array(z.string()),
  maskedSecret: z.string(),
  status: gatewayWebhookStatusSchema,
  rateLimit: z.object({ limit: z.number(), windowSec: z.number() }).nullable().optional(),
  ipAllowlist: z.array(z.string()).nullable().optional(),
  timeoutMs: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: z.string(),
})

export const gatewayWebhookAttemptSchema = z.object({
  attempt: z.number(),
  httpStatus: z.number().optional(),
  responseTimeMs: z.number().optional(),
  error: z.string().optional(),
  attemptedAt: z.string(),
})

export const gatewayWebhookDeliverySchema = z.object({
  id: z.string(),
  webhookId: z.string(),
  namespaceId: z.string(),
  tenantId: z.string(),
  eventId: z.string(),
  event: z.string(),
  payload: z.string(),
  payloadPreview: z.string(),
  status: gatewayWebhookDeliveryStatusSchema,
  attempts: z.array(gatewayWebhookAttemptSchema),
  maxAttempts: z.number(),
  nextRetryAt: z.string().optional(),
  correlationId: z.string(),
  isDeadLetter: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const gatewayWebhookListResponseSchema = z.object({
  webhooks: z.array(gatewayWebhookSchema),
  totalWebhooks: z.number(),
  totalPages: z.number(),
  page: z.number(),
})

export const gatewayWebhookDeliveryListResponseSchema = z.object({
  deliveries: z.array(gatewayWebhookDeliverySchema),
  totalDeliveries: z.number(),
  totalPages: z.number(),
  page: z.number(),
})

type _GW1 = Expect<IsEqual<z.infer<typeof gatewayApiKeySchema>, GatewayApiKeyType>>
type _GW2 = Expect<IsEqual<z.infer<typeof gatewayInvocationLogSchema>, GatewayInvocationLogType>>
type _GW3 = Expect<IsEqual<z.infer<typeof gatewayNamespaceSchema>, GatewayNamespaceType>>
type _GW4 = Expect<IsEqual<z.infer<typeof gatewayRouteSchema>, GatewayRouteType>>
type _GW5 = Expect<IsEqual<z.infer<typeof gatewayRouteRateLimitSchema>, GatewayRouteRateLimitType>>
type _GW6 = Expect<IsEqual<z.infer<typeof extractionJobSchema>, ExtractionJobType>>
type _GW7 = Expect<IsEqual<z.infer<typeof extractionProposalSchema>, ExtractionProposalType>>
type _GW8 = Expect<IsEqual<z.infer<typeof httpMethodSchema>, HttpMethodType>>
type _GW9 = Expect<IsEqual<z.infer<typeof gatewayNamespaceListResponseSchema>, GatewayNamespaceListResponseType>>
type _GW10 = Expect<IsEqual<z.infer<typeof gatewayRouteListResponseSchema>, GatewayRouteListResponseType>>
type _GW11 = Expect<IsEqual<z.infer<typeof gatewayInvocationListResponseSchema>, GatewayInvocationListResponseType>>
type _GW12 = Expect<IsEqual<z.infer<typeof quickSetupResponseSchema>, QuickSetupResponseType>>
type _GW13 = Expect<IsEqual<z.infer<typeof quickSetupConfirmResponseSchema>, QuickSetupConfirmResponseType>>
type _GW14 = Expect<IsEqual<z.infer<typeof gatewayWebhookSchema>, GatewayWebhookType>>
type _GW15 = Expect<IsEqual<z.infer<typeof gatewayWebhookAttemptSchema>, GatewayWebhookAttemptType>>
type _GW16 = Expect<IsEqual<z.infer<typeof gatewayWebhookDeliverySchema>, GatewayWebhookDeliveryType>>
type _GW17 = Expect<IsEqual<z.infer<typeof gatewayWebhookListResponseSchema>, GatewayWebhookListResponseType>>
type _GW18 = Expect<IsEqual<z.infer<typeof gatewayWebhookDeliveryListResponseSchema>, GatewayWebhookDeliveryListResponseType>>



export const permissionAreaIdSchema = z.enum(PERMISSION_AREAS)
export const permissionActionSchema = z.enum(PERMISSION_ACTIONS)
export const permissionIdSchema = z.enum(PERMISSIONS)

export const permissionSchema = z.object({
  id: permissionIdSchema,
  area: permissionAreaIdSchema,
  action: permissionActionSchema,
  resource: z.string(),
  actionLabelKey: z.string(),
  resourceLabelKey: z.string(),
})

export const globalRoleIdSchema = z.enum(GLOBAL_ROLES)

export const globalRoleSchema = z.object({
  id: globalRoleIdSchema,
  name: z.string(),
  icon: z.string(),
  color: z.string(),
  description: z.string(),
  permissions: z.array(permissionIdSchema),
  gatewayRole: gatewayRouteRoleSchema,
})

export const featureSurfaceSchema = z.enum(['nav', 'tab', 'quickAction'])

export const appFeatureSchema = z.object({
  key: z.string(),
  label: z.string(),
  labelKey: z.string().optional(),
  icon: z.string().optional(),
  permission: z.union([permissionIdSchema, z.literal('public')]),
  permissionOr: z.array(permissionIdSchema).optional(),
  route: z.string().optional(),
  href: z.string().optional(),
  surfaces: z.array(featureSurfaceSchema).optional(),
  order: z.number().optional(),
  enabled: z.boolean().optional(),
})

export const myAccessSchema = z.object({
  role: globalRoleIdSchema,
  membershipRole: z.string(),
  permissions: z.array(permissionIdSchema),
  areas: z.record(permissionAreaIdSchema, z.array(permissionIdSchema)),
  features: z.array(z.string()),
  gatewayRole: gatewayRouteRoleSchema,
})

type _AC1 = Expect<IsEqual<z.infer<typeof permissionSchema>, PermissionType>>
type _AC2 = Expect<IsEqual<z.infer<typeof globalRoleSchema>, GlobalRole>>
type _AC3 = Expect<IsEqual<z.infer<typeof appFeatureSchema>, AppFeature>>
type _AC4 = Expect<IsEqual<z.infer<typeof myAccessSchema>, MyAccess>>
type _AC5 = Expect<IsEqual<z.infer<typeof permissionAreaIdSchema>, PermissionAreaId>>
type _AC6 = Expect<IsEqual<z.infer<typeof permissionActionSchema>, PermissionAction>>
type _AC7 = Expect<IsEqual<z.infer<typeof permissionIdSchema>, PermissionId>>
type _AC8 = Expect<IsEqual<z.infer<typeof globalRoleIdSchema>, GlobalRoleId>>
type _AC9 = Expect<IsEqual<z.infer<typeof featureSurfaceSchema>, FeatureSurface>>



export const tenantRoleSchema = z.enum(['owner', 'admin', 'member', 'developer', 'support'])
export const tenantPlanSchema = z.enum(['free', 'pro', 'enterprise'])

export const tenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  plan: tenantPlanSchema,
  createdAt: z.string(),
})

export const membershipSchema = z.object({
  tenantId: z.string(),
  role: tenantRoleSchema,
  tenant: tenantSchema,
})

export const sessionUserSchema = z.object({
  id: z.union([z.string(), z.number()]),
  email: z.string(),
  fullName: z.string().optional(),
  username: z.string(),
  avatar: z.string().optional(),
})

export const sessionSchema = z.object({
  accessToken: z.string(),
  user: sessionUserSchema,
  memberships: z.array(membershipSchema),
  currentTenantId: z.string(),
})

type _TN1 = Expect<IsEqual<z.infer<typeof tenantSchema>, TenantType>>
type _TN2 = Expect<IsEqual<z.infer<typeof membershipSchema>, MembershipType>>
type _TN3 = Expect<IsEqual<z.infer<typeof sessionUserSchema>, SessionUserType>>
type _TN4 = Expect<IsEqual<z.infer<typeof sessionSchema>, SessionType>>



export const directAccessPolicySchema = z.enum(['allow-authorized', 'deny-all'])

export const frozenModuleDefinitionSchema = z.object({
  moduleKey: z.string(),
  title: z.string(),
  routePrefixes: z.array(z.string()),
  freezeReason: z.string(),
  directAccessPolicy: directAccessPolicySchema,
  owner: z.string(),
})

type _DC1 = Expect<IsEqual<z.infer<typeof frozenModuleDefinitionSchema>, FrozenModuleDefinitionType>>



