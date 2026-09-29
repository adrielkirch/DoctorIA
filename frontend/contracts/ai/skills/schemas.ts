import { z } from 'zod'
import { Expect, IsEqual } from '../../_parity'
import type { Skill, SkillCreatePayload, SkillListResponse, SkillType, SkillUpdatePayload } from './types'

export const skillTypeSchema = z.enum(['DEFAULT', 'CUSTOM'])

export const skillSchema = z.object({
  id: z.number(),
  tenantId: z.string(),
  name: z.string(),
  command: z.string(),
  category: z.string(),
  type: skillTypeSchema,
  instructions: z.string(),
  color: z.string(),
  icon: z.string(),
  createdAt: z.string(),
})

export const skillCreatePayloadSchema = z.object({
  name: z.string(),
  command: z.string(),
  category: z.string(),
  instructions: z.string(),
  color: z.string(),
  icon: z.string(),
})

export const skillUpdatePayloadSchema = skillCreatePayloadSchema.partial().extend({ id: z.number() })

export const skillListResponseSchema = z.object({
  skills: z.array(skillSchema),
  total: z.number(),
  totalPages: z.number(),
  page: z.number(),
})

type _S1 = Expect<IsEqual<z.infer<typeof skillTypeSchema>, SkillType>>
type _S2 = Expect<IsEqual<z.infer<typeof skillSchema>, Skill>>
type _S3 = Expect<IsEqual<z.infer<typeof skillCreatePayloadSchema>, SkillCreatePayload>>
type _S4 = Expect<IsEqual<z.infer<typeof skillUpdatePayloadSchema>, SkillUpdatePayload>>
type _S5 = Expect<IsEqual<z.infer<typeof skillListResponseSchema>, SkillListResponse>>
