export type SkillType = 'DEFAULT' | 'CUSTOM'

export interface Skill {
  id: number
  tenantId: string
  name: string
  command: string
  category: string
  type: SkillType
  instructions: string
  color: string
  icon: string
  createdAt: string
}

export interface SkillCreatePayload {
  name: string
  command: string
  category: string
  instructions: string
  color: string
  icon: string
}

export interface SkillUpdatePayload extends Partial<SkillCreatePayload> {
  id: number
}

export interface SkillListResponse {
  skills: Skill[]
  total: number
  totalPages: number
  page: number
}
