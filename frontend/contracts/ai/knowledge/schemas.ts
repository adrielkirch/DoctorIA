import { z } from 'zod'
import { Expect, IsEqual } from '../../_parity'
import type {
  KnowledgeChunk,
  KnowledgeCreatePayload,
  KnowledgeEntry,
  KnowledgeListResponse,
  KnowledgeSourceType,
  KnowledgeUpdatePayload,
} from './types'

export const knowledgeSourceTypeSchema = z.enum(['MANUAL', 'UPLOADED'])

export const knowledgeChunkSchema = z.object({
  chunkIndex: z.number(),
  text: z.string(),
  tokenCount: z.number(),
})

export const knowledgeEntrySchema = z.object({
  id: z.number(),
  tenantId: z.string(),
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  sourceType: knowledgeSourceTypeSchema,
  sourceFilename: z.string().nullable(),
  chunks: z.array(knowledgeChunkSchema),
  linkedSecretName: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const knowledgeCreatePayloadSchema = z.object({
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  sourceType: knowledgeSourceTypeSchema,
  sourceFilename: z.string().nullable().optional(),
  chunks: z.array(knowledgeChunkSchema).optional(),
  linkedSecretName: z.string().nullable().optional(),
})

export const knowledgeUpdatePayloadSchema = knowledgeCreatePayloadSchema.partial()

export const knowledgeListResponseSchema = z.object({
  knowledge: z.array(knowledgeEntrySchema),
  total: z.number(),
  totalPages: z.number(),
  page: z.number(),
  tags: z.array(z.string()),
})

type _K1 = Expect<IsEqual<z.infer<typeof knowledgeSourceTypeSchema>, KnowledgeSourceType>>
type _K2 = Expect<IsEqual<z.infer<typeof knowledgeChunkSchema>, KnowledgeChunk>>
type _K3 = Expect<IsEqual<z.infer<typeof knowledgeEntrySchema>, KnowledgeEntry>>
type _K4 = Expect<IsEqual<z.infer<typeof knowledgeCreatePayloadSchema>, KnowledgeCreatePayload>>
type _K5 = Expect<IsEqual<z.infer<typeof knowledgeUpdatePayloadSchema>, KnowledgeUpdatePayload>>
type _K6 = Expect<IsEqual<z.infer<typeof knowledgeListResponseSchema>, KnowledgeListResponse>>
