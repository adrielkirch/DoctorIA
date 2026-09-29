export interface UserProperties {
  id: number
  tenantId: string
  fullName: string
  company: string
  role: string
  username?: string
  country: string
  contact: string
  email: string
  currentPlan: string
  status: string
  avatar: string
  billing: string
}

/** Payload de criação (invite) — id/tenantId são atribuídos server-side. */
export type CreateUserPayload = Omit<UserProperties, 'id' | 'tenantId'>
