/**
 * Configurações de fragmentação/recuperação do knowledge (paridade Dify).
 *
 * ℹ️ Os contratos de `KnowledgeEntry` vêm da lib publicada
 * `contracts/ai/knowledge/types` (fonte única, versionada).
 * As configurações de chunking NÃO fazem parte desse contrato ainda, então
 * vivem aqui, no engine, como extensão local consumida pela página
 * `/ai/knowledge/:id` e pelo fake-api (`/ai/knowledge/:id/settings`).
 */

export type KnowledgeChunkingMode = 'GENERAL' | 'PARENT_CHILD'
export type KnowledgeIndexMode = 'HIGH_QUALITY' | 'ECONOMICAL'
export type KnowledgeRetrievalMode = 'VECTOR' | 'FULL_TEXT' | 'HYBRID'
export type KnowledgeParentMode = 'PARAGRAPH' | 'FULL_DOC'

export interface KnowledgePreProcessingRules {

  /** Substitui espaços consecutivos, quebras de linha e tabulações. */
  replaceConsecutiveWhitespace: boolean

  /** Exclui todos os URLs e endereços de e-mail. */
  removeUrlsAndEmails: boolean
}

export interface KnowledgeGeneralChunking {

  /** Identificador de segmento (ex.: `\n`). */
  segmentIdentifier: string
  maxChunkLength: number
  chunkOverlap: number
  preProcessing: KnowledgePreProcessingRules
  autoSummary: boolean
  qaFormat: boolean
  qaFormatLanguage: string
}

export interface KnowledgeParentChildChunking {
  parentMode: KnowledgeParentMode
  parentSegmentIdentifier: string
  parentMaxChunkLength: number
  childSegmentIdentifier: string
  childMaxChunkLength: number
  preProcessing: KnowledgePreProcessingRules
  autoSummary: boolean
}

export interface KnowledgeIndexSettings {
  mode: KnowledgeIndexMode

  /** Vazio = "Incompatível" (nenhum modelo de incorporação configurado). */
  embeddingModel: string
}

export interface KnowledgeRetrievalSettings {
  mode: KnowledgeRetrievalMode
  topK: number
  scoreThreshold: number

  /** Vazio = nenhum modelo de reordenação. */
  rerankModel: string

  /** Peso semântico (Pesquisa Híbrida → Pontuação Ponderada). */
  semanticWeight: number

  /** Peso por palavra-chave. */
  keywordWeight: number
}

export interface KnowledgeChunkingSettings {
  mode: KnowledgeChunkingMode
  general: KnowledgeGeneralChunking
  parentChild: KnowledgeParentChildChunking
  index: KnowledgeIndexSettings
  retrieval: KnowledgeRetrievalSettings
}

/** Limites usados pelos inputs da UI (Dify: 1–4000 caracteres no chunk). */
export const KNOWLEDGE_CHUNK_LIMITS = {
  maxChunkLength: { min: 1, max: 4000 },
  chunkOverlap: { min: 0, max: 1000 },
  parentMaxChunkLength: { min: 1, max: 4000 },
  childMaxChunkLength: { min: 1, max: 2000 },
  topK: { min: 1, max: 10 },
  scoreThreshold: { min: 0, max: 1 },
} as const

/** Idiomas oferecidos na geração automática em formato perguntas e respostas. */
export const KNOWLEDGE_QA_LANGUAGES = ['English', 'Português', 'Español', 'Français', 'Deutsch'] as const

/** Modelos de incorporação aceitos pelo índice de alta qualidade. */
export const KNOWLEDGE_EMBEDDING_MODELS = [
  { value: '', label: 'Incompatible' },
  { value: 'text-embedding-3-small', label: null },
  { value: 'text-embedding-3-large', label: null },
] as const

/** Modelos de reordenação disponíveis ('' = nenhum). */
export const KNOWLEDGE_RERANK_MODELS = [
  { value: '', label: 'None' },
  { value: 'rerank-multilingual-v3', label: null },
  { value: 'bge-reranker-v2-m3', label: null },
] as const

/** Cria a configuração default (espelha os valores default do Dify). */
export function createDefaultKnowledgeSettings(): KnowledgeChunkingSettings {
  return {
    mode: 'GENERAL',
    general: {
      segmentIdentifier: '\\n',
      maxChunkLength: 1024,
      chunkOverlap: 50,
      preProcessing: {
        replaceConsecutiveWhitespace: false,
        removeUrlsAndEmails: false,
      },
      autoSummary: false,
      qaFormat: false,
      qaFormatLanguage: 'English',
    },
    parentChild: {
      parentMode: 'PARAGRAPH',
      parentSegmentIdentifier: '\\n\\n',
      parentMaxChunkLength: 1024,
      childSegmentIdentifier: '\\n',
      childMaxChunkLength: 512,
      preProcessing: {
        replaceConsecutiveWhitespace: false,
        removeUrlsAndEmails: false,
      },
      autoSummary: false,
    },
    index: {
      mode: 'HIGH_QUALITY',
      embeddingModel: '',
    },
    retrieval: {
      mode: 'HYBRID',
      topK: 3,
      scoreThreshold: 0.5,
      rerankModel: '',
      semanticWeight: 0.7,
      keywordWeight: 0.3,
    },
  }
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)

  if (!Number.isFinite(parsed))
    return fallback

  return Math.min(Math.max(parsed, min), max)
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

function normalizePreProcessing(value: unknown, fallback: KnowledgePreProcessingRules): KnowledgePreProcessingRules {
  const rules = (value ?? {}) as Partial<KnowledgePreProcessingRules>

  return {
    replaceConsecutiveWhitespace: rules.replaceConsecutiveWhitespace ?? fallback.replaceConsecutiveWhitespace,
    removeUrlsAndEmails: rules.removeUrlsAndEmails ?? fallback.removeUrlsAndEmails,
  }
}

/**
 * Normaliza qualquer payload (API antiga, form parcial, storage) para uma
 * configuração completa e dentro dos limites — nunca lança, sempre devolve um
 * objeto utilizável.
 */
export function normalizeKnowledgeSettings(settings?: Partial<KnowledgeChunkingSettings> | null): KnowledgeChunkingSettings {
  const defaults = createDefaultKnowledgeSettings()
  const general = (settings?.general ?? {}) as Partial<KnowledgeGeneralChunking>
  const parentChild = (settings?.parentChild ?? {}) as Partial<KnowledgeParentChildChunking>
  const index = (settings?.index ?? {}) as Partial<KnowledgeIndexSettings>
  const retrieval = (settings?.retrieval ?? {}) as Partial<KnowledgeRetrievalSettings>

  const normalized: KnowledgeChunkingSettings = {
    mode: pick(settings?.mode, ['GENERAL', 'PARENT_CHILD'] as const, defaults.mode),
    general: {
      segmentIdentifier: typeof general.segmentIdentifier === 'string' ? general.segmentIdentifier : defaults.general.segmentIdentifier,
      maxChunkLength: clampNumber(general.maxChunkLength, KNOWLEDGE_CHUNK_LIMITS.maxChunkLength.min, KNOWLEDGE_CHUNK_LIMITS.maxChunkLength.max, defaults.general.maxChunkLength),
      chunkOverlap: clampNumber(general.chunkOverlap, KNOWLEDGE_CHUNK_LIMITS.chunkOverlap.min, KNOWLEDGE_CHUNK_LIMITS.chunkOverlap.max, defaults.general.chunkOverlap),
      preProcessing: normalizePreProcessing(general.preProcessing, defaults.general.preProcessing),
      autoSummary: general.autoSummary ?? defaults.general.autoSummary,
      qaFormat: general.qaFormat ?? defaults.general.qaFormat,
      qaFormatLanguage: typeof general.qaFormatLanguage === 'string' && general.qaFormatLanguage.trim()
        ? general.qaFormatLanguage
        : defaults.general.qaFormatLanguage,
    },
    parentChild: {
      parentMode: pick(parentChild.parentMode, ['PARAGRAPH', 'FULL_DOC'] as const, defaults.parentChild.parentMode),
      parentSegmentIdentifier: typeof parentChild.parentSegmentIdentifier === 'string' ? parentChild.parentSegmentIdentifier : defaults.parentChild.parentSegmentIdentifier,
      parentMaxChunkLength: clampNumber(parentChild.parentMaxChunkLength, KNOWLEDGE_CHUNK_LIMITS.parentMaxChunkLength.min, KNOWLEDGE_CHUNK_LIMITS.parentMaxChunkLength.max, defaults.parentChild.parentMaxChunkLength),
      childSegmentIdentifier: typeof parentChild.childSegmentIdentifier === 'string' ? parentChild.childSegmentIdentifier : defaults.parentChild.childSegmentIdentifier,
      childMaxChunkLength: clampNumber(parentChild.childMaxChunkLength, KNOWLEDGE_CHUNK_LIMITS.childMaxChunkLength.min, KNOWLEDGE_CHUNK_LIMITS.childMaxChunkLength.max, defaults.parentChild.childMaxChunkLength),
      preProcessing: normalizePreProcessing(parentChild.preProcessing, defaults.parentChild.preProcessing),
      autoSummary: parentChild.autoSummary ?? defaults.parentChild.autoSummary,
    },
    index: {


      mode: 'HIGH_QUALITY',
      embeddingModel: typeof index.embeddingModel === 'string' ? index.embeddingModel : defaults.index.embeddingModel,
    },
    retrieval: {
      mode: pick(retrieval.mode, ['VECTOR', 'FULL_TEXT', 'HYBRID'] as const, defaults.retrieval.mode),
      topK: clampNumber(retrieval.topK, KNOWLEDGE_CHUNK_LIMITS.topK.min, KNOWLEDGE_CHUNK_LIMITS.topK.max, defaults.retrieval.topK),
      scoreThreshold: clampNumber(retrieval.scoreThreshold, KNOWLEDGE_CHUNK_LIMITS.scoreThreshold.min, KNOWLEDGE_CHUNK_LIMITS.scoreThreshold.max, defaults.retrieval.scoreThreshold),
      rerankModel: typeof retrieval.rerankModel === 'string' ? retrieval.rerankModel : defaults.retrieval.rerankModel,
      semanticWeight: clampNumber(retrieval.semanticWeight, 0, 1, defaults.retrieval.semanticWeight),
      keywordWeight: clampNumber(retrieval.keywordWeight, 0, 1, defaults.retrieval.keywordWeight),
    },
  }

  return normalized
}
