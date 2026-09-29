import { z } from 'zod'
import { Expect, IsEqual } from '../_parity'
import { membershipSchema, tenantSchema } from '../types/schemas'
import type { CreateTenantPayload, Membership, Tenant } from './types'

export { membershipSchema, tenantSchema }

export const createTenantPayloadSchema = z.object({
  name: z.string().optional(),
  slug: z.string().optional(),
})

type _T1 = Expect<IsEqual<z.infer<typeof tenantSchema>, Tenant>>
type _T2 = Expect<IsEqual<z.infer<typeof membershipSchema>, Membership>>
type _T3 = Expect<IsEqual<z.infer<typeof createTenantPayloadSchema>, CreateTenantPayload>>
