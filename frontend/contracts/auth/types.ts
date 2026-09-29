import type { Membership } from '../types/tenant'

export type Actions = 'create' | 'read' | 'update' | 'delete' | 'manage'
export type Subjects = string

export interface UserAbilityRule {
  action: Actions
  subject: Subjects
}

export interface User {
  id: number
  fullName?: string
  username: string
  password: string
  avatar?: string
  email: string
  /**
   * ⚠️ LEGADO — role NÃO é atributo de usuário (é da membership do tenant).
   * Mantido no seed por compatibilidade, porém **filtrado do userData** e não
   * usado como fonte de abilities. Veja .specify/skills/rbac-global-roles.
   */
  role: string
  abilityRules: UserAbilityRule[]
}

export interface UserOut {
  userAbilityRules: User['abilityRules']
  accessToken: string
  userData: Omit<User, 'abilities' | 'password' | 'role'>
  memberships: Membership[]
  currentTenantId: string
}

export interface LoginResponse {
  accessToken: string
  userData: User
  userAbilityRules: User['abilityRules']
  memberships: Membership[]
  currentTenantId: string
}

export interface RegisterResponse {
  accessToken: string
  userData: User
  userAbilityRules: User['abilityRules']
}



export interface ForgotPasswordPayload {
  email: string
}

export interface ForgotPasswordResponse {
  message: string
}



export interface ResetPasswordPayload {
  email?: string
  token: string
  password: string
}

export interface ResetPasswordResponse {
  message: string
}



export interface TwoStepVerificationPayload {
  email: string
  code: string
}

/** Resposta do 2FA — mesma estrutura de sessão do login. */
export type TwoStepVerificationResponse = LoginResponse
