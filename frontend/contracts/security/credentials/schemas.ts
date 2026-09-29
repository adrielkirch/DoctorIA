import { z } from 'zod'
import { Expect, IsEqual } from '../../_parity'
import type {
  BaseCredential,
  CreateSecretPayload,
  CreateVariablePayload,
  CredentialEntry,
  CredentialListResponse,
  CredentialType,
  PaginationMeta,
  SecretCredential,
  UpdateVariablePayload,
  VariableCredential,
} from './types'

export const credentialTypeSchema = z.enum(['VARIABLE', 'SECRET'])

export const baseCredentialSchema = z.object({
  id: z.number(),
  tenantId: z.string(),
  key: z.string(),
  type: credentialTypeSchema,
  description: z.string().optional(),
  updatedAt: z.string(),
})

export const variableCredentialSchema = baseCredentialSchema.extend({
  type: z.literal('VARIABLE'),
  value: z.string(),
})

export const secretCredentialSchema = baseCredentialSchema.extend({
  type: z.literal('SECRET'),
  maskedValue: z.string(),
})

export const credentialEntrySchema = z.discriminatedUnion('type', [
  variableCredentialSchema,
  secretCredentialSchema,
])

export const paginationMetaSchema = z.object({
  page: z.number(),
  itemsPerPage: z.number(),
  total: z.number(),
  totalPages: z.number(),
})

export const credentialListResponseSchema = z.object({
  credentials: z.array(credentialEntrySchema),
  totalCredentials: z.number(),
  totalPages: z.number(),
  page: z.number(),
})

export const createVariablePayloadSchema = z.object({
  key: z.string(),
  value: z.string(),
  description: z.string().optional(),
})

export const createSecretPayloadSchema = z.object({
  key: z.string(),
  value: z.string(),
  description: z.string().optional(),
})

export const updateVariablePayloadSchema = createVariablePayloadSchema
  .partial()
  .extend({ id: z.number() })

type _CR1 = Expect<IsEqual<z.infer<typeof credentialTypeSchema>, CredentialType>>
type _CR2 = Expect<IsEqual<z.infer<typeof baseCredentialSchema>, BaseCredential>>
type _CR3 = Expect<IsEqual<z.infer<typeof variableCredentialSchema>, VariableCredential>>
type _CR4 = Expect<IsEqual<z.infer<typeof secretCredentialSchema>, SecretCredential>>
type _CR5 = Expect<IsEqual<z.infer<typeof credentialEntrySchema>, CredentialEntry>>
type _CR6 = Expect<IsEqual<z.infer<typeof paginationMetaSchema>, PaginationMeta>>
type _CR7 = Expect<IsEqual<z.infer<typeof credentialListResponseSchema>, CredentialListResponse>>
type _CR8 = Expect<IsEqual<z.infer<typeof createVariablePayloadSchema>, CreateVariablePayload>>
type _CR9 = Expect<IsEqual<z.infer<typeof createSecretPayloadSchema>, CreateSecretPayload>>
type _CR10 = Expect<IsEqual<z.infer<typeof updateVariablePayloadSchema>, UpdateVariablePayload>>
