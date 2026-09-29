import { z } from 'zod'
import { Expect, IsEqual } from '../_parity'
import { membershipSchema } from '../types/schemas'
import type {
  Actions,
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  LoginResponse,
  RegisterResponse,
  ResetPasswordPayload,
  ResetPasswordResponse,
  TwoStepVerificationPayload,
  TwoStepVerificationResponse,
  User,
  UserAbilityRule,
  UserOut,
} from './types'

export const actionsSchema = z.enum(['create', 'read', 'update', 'delete', 'manage'])
export const subjectsSchema = z.string()
export const userAbilityRuleSchema = z.object({ action: actionsSchema, subject: subjectsSchema })

export const userSchema = z.object({
  id: z.number(),
  fullName: z.string().optional(),
  username: z.string(),
  password: z.string(),
  avatar: z.string().optional(),
  email: z.string(),
  role: z.string(),
  abilityRules: z.array(userAbilityRuleSchema),
})

export const userOutSchema = z.object({
  userAbilityRules: z.array(userAbilityRuleSchema),
  accessToken: z.string(),
  userData: userSchema.omit({ password: true, role: true }),
  memberships: z.array(membershipSchema),
  currentTenantId: z.string(),
})

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  userData: userSchema,
  userAbilityRules: z.array(userAbilityRuleSchema),
  memberships: z.array(membershipSchema),
  currentTenantId: z.string(),
})

export const registerResponseSchema = z.object({
  accessToken: z.string(),
  userData: userSchema,
  userAbilityRules: z.array(userAbilityRuleSchema),
})

export const forgotPasswordPayloadSchema = z.object({ email: z.string() })
export const forgotPasswordResponseSchema = z.object({ message: z.string() })
export const resetPasswordPayloadSchema = z.object({
  email: z.string().optional(),
  token: z.string(),
  password: z.string(),
})
export const resetPasswordResponseSchema = z.object({ message: z.string() })
export const twoStepVerificationPayloadSchema = z.object({ email: z.string(), code: z.string() })
export const twoStepVerificationResponseSchema = loginResponseSchema

type _A1 = Expect<IsEqual<z.infer<typeof actionsSchema>, Actions>>
type _A2 = Expect<IsEqual<z.infer<typeof userAbilityRuleSchema>, UserAbilityRule>>
type _A3 = Expect<IsEqual<z.infer<typeof userSchema>, User>>
type _A4 = Expect<IsEqual<z.infer<typeof userOutSchema>, UserOut>>
type _A5 = Expect<IsEqual<z.infer<typeof loginResponseSchema>, LoginResponse>>
type _A6 = Expect<IsEqual<z.infer<typeof registerResponseSchema>, RegisterResponse>>
type _A7 = Expect<IsEqual<z.infer<typeof forgotPasswordPayloadSchema>, ForgotPasswordPayload>>
type _A8 = Expect<IsEqual<z.infer<typeof forgotPasswordResponseSchema>, ForgotPasswordResponse>>
type _A9 = Expect<IsEqual<z.infer<typeof resetPasswordPayloadSchema>, ResetPasswordPayload>>
type _A10 = Expect<IsEqual<z.infer<typeof resetPasswordResponseSchema>, ResetPasswordResponse>>
type _A11 = Expect<IsEqual<z.infer<typeof twoStepVerificationPayloadSchema>, TwoStepVerificationPayload>>
type _A12 = Expect<IsEqual<z.infer<typeof twoStepVerificationResponseSchema>, TwoStepVerificationResponse>>
