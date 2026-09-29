export type KnowledgeSourceType = 'MANUAL' | 'UPLOADED'

export interface KnowledgeChunk {
  chunkIndex: number
  text: string
  tokenCount: number
}

export interface KnowledgeEntry {
  id: number
  tenantId: string
  title: string
  content: string
  tags: string[]
  sourceType: KnowledgeSourceType
  sourceFilename: string | null
  chunks: KnowledgeChunk[]
  linkedSecretName: string | null
  createdAt: string
  updatedAt: string
}

export interface KnowledgeCreatePayload {
  title: string
  content: string
  tags: string[]
  sourceType: KnowledgeSourceType
  sourceFilename?: string | null
  chunks?: KnowledgeChunk[]
  linkedSecretName?: string | null
}

export type KnowledgeUpdatePayload = Partial<KnowledgeCreatePayload>

export interface KnowledgeListResponse {
  knowledge: KnowledgeEntry[]
  total: number
  totalPages: number
  page: number
  tags: string[]
}
