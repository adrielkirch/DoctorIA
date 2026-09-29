import { z } from 'zod'
import { Expect, IsEqual } from '../../_parity'
import type { AiModel, AiModelTier } from './types'

export const aiModelTierSchema = z.enum(['premium', 'standard', 'basic'])

export const aiModelSchema = z.object({
  id: z.string(),
  provider: z.string(),
  name: z.string(),
  tier: aiModelTierSchema,
})

type _M1 = Expect<IsEqual<z.infer<typeof aiModelTierSchema>, AiModelTier>>
type _M2 = Expect<IsEqual<z.infer<typeof aiModelSchema>, AiModel>>
