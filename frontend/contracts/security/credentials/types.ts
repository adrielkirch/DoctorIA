export type CredentialType = 'VARIABLE' | 'SECRET'

export interface BaseCredential {
  id: number
  tenantId: string
  key: string
  type: CredentialType
  description?: string
  updatedAt: string
}

export interface VariableCredential extends BaseCredential {
  type: 'VARIABLE'
  value: string
}

export interface SecretCredential extends BaseCredential {
  type: 'SECRET'
  maskedValue: string
}

export type CredentialEntry = VariableCredential | SecretCredential

export interface PaginationMeta {
  page: number
  itemsPerPage: number
  total: number
  totalPages: number
}

export interface CredentialListResponse {
  credentials: CredentialEntry[]
  totalCredentials: number
  totalPages: number
  page: number
}

export interface CreateVariablePayload {
  key: string
  value: string
  description?: string
}

export interface CreateSecretPayload {
  key: string
  value: string
  description?: string
}

export interface UpdateVariablePayload extends Partial<CreateVariablePayload> {
  id: number
}
