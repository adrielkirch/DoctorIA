import { z } from 'zod'
import { Expect, IsEqual } from '../../_parity'
import type { CreateUserPayload, UserProperties } from './types'

export const userPropertiesSchema = z.object({
  id: z.number(),
  tenantId: z.string(),
  fullName: z.string(),
  company: z.string(),
  role: z.string(),
  username: z.string().optional(),
  country: z.string(),
  contact: z.string(),
  email: z.string(),
  currentPlan: z.string(),
  status: z.string(),
  avatar: z.string(),
  billing: z.string(),
})

export const createUserPayloadSchema = userPropertiesSchema.omit({ id: true, tenantId: true })

type _U1 = Expect<IsEqual<z.infer<typeof userPropertiesSchema>, UserProperties>>
type _U2 = Expect<IsEqual<z.infer<typeof createUserPayloadSchema>, CreateUserPayload>>
