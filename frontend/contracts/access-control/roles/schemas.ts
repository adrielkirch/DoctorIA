import { z } from 'zod'
import { Expect, IsEqual } from '../../_parity'
import {
    appFeatureSchema,
    featureSurfaceSchema,
    globalRoleIdSchema,
    globalRoleSchema,
    myAccessSchema,
    permissionActionSchema,
    permissionAreaIdSchema,
    permissionIdSchema,
    permissionSchema,
} from '../../types/schemas'
import type {
    AppFeature,
    FeatureSurface,
    GlobalRole,
    GlobalRoleId,
    MyAccess,
    Permission,
    PermissionAction,
    PermissionAreaId,
    PermissionId,
} from './types'


export {
    appFeatureSchema,
    featureSurfaceSchema,
    globalRoleIdSchema,
    globalRoleSchema,
    myAccessSchema,
    permissionActionSchema,
    permissionAreaIdSchema,
    permissionIdSchema,
    permissionSchema
}

type _R1 = Expect<IsEqual<z.infer<typeof permissionSchema>, Permission>>
type _R2 = Expect<IsEqual<z.infer<typeof globalRoleSchema>, GlobalRole>>
type _R3 = Expect<IsEqual<z.infer<typeof myAccessSchema>, MyAccess>>
type _R4 = Expect<IsEqual<z.infer<typeof appFeatureSchema>, AppFeature>>
type _R5 = Expect<IsEqual<z.infer<typeof permissionIdSchema>, PermissionId>>
type _R6 = Expect<IsEqual<z.infer<typeof globalRoleIdSchema>, GlobalRoleId>>
type _R7 = Expect<IsEqual<z.infer<typeof permissionAreaIdSchema>, PermissionAreaId>>
type _R8 = Expect<IsEqual<z.infer<typeof permissionActionSchema>, PermissionAction>>
type _R9 = Expect<IsEqual<z.infer<typeof featureSurfaceSchema>, FeatureSurface>>
