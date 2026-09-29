import { z } from 'zod'
import { Expect, IsEqual } from '../../_parity'
import { permissionSchema as canonicalPermissionSchema } from '../../types/schemas'
import type { Permission } from './types'

export const permissionSchema = canonicalPermissionSchema.extend({
  assignedTo: z.array(z.string()),
  features: z.array(z.string()),
})

type _P1 = Expect<IsEqual<z.infer<typeof permissionSchema>, Permission>>
