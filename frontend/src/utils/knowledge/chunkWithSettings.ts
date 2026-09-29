import type {
    KnowledgeChunkingSettings,
    KnowledgePreProcessingRules,
} from '@/types/knowledge'
import { createDefaultKnowledgeSettings, normalizeKnowledgeSettings } from '@/types/knowledge'
import type { KnowledgeChunk } from 'contracts/ai/knowledge/types'

/**
 * Constrói chunks a partir do texto usando as configurações de fragmentação
 * (paridade Dify): pré-processamento → split por identificador de segmento →
 * limite de comprimento + sobreposição. Para o modo pai-filho os pedaços de
 * recuperação são os filhos (o pai é contexto/recall).
 */

export type KnowledgeChunkKind = 'CHUNK' | 'PARENT' | 'CHILD'

export interface KnowledgeChunkPreview extends KnowledgeChunk {
  kind: KnowledgeChunkKind
}

/** Converte HTML do editor rico em texto plano (linhas preservadas). */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|h[1-6]|li|div|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Decodifica o identificador digitado (`\n`, `\n\n`, `\t`, `\r\n`) no separador real. */
export function decodeSegmentIdentifier(identifier: string): string {
  return identifier
    .replace(/\\r/g, '\r')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
}

/** Aplica as regras de pré-processamento de texto do Dify. */
export function applyPreProcessing(text: string, rules: KnowledgePreProcessingRules): string {
  let output = text.replace(/\r\n/g, '\n')

  if (rules.removeUrlsAndEmails) {
    output = output
      .replace(/https?:\/\/\S+/gi, ' ')
      .replace(/www\.\S+/gi, ' ')
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, ' ')
  }

  if (rules.replaceConsecutiveWhitespace) {
    output = output
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
  }

  return output.trim()
}

function countTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function splitBySegment(text: string, identifier: string): string[] {
  const separator = decodeSegmentIdentifier(identifier)

  if (!separator)
    return text.trim() ? [text.trim()] : []

  return text
    .split(separator)
    .map(part => part.trim())
    .filter(Boolean)
}

function hardSplit(text: string, maxLength: number, overlap: number): string[] {
  if (text.length <= maxLength)
    return [text]

  const pieces: string[] = []
  const step = Math.max(1, maxLength - overlap)

  for (let offset = 0; offset < text.length; offset += step) {
    pieces.push(text.slice(offset, offset + maxLength))

    if (offset + maxLength >= text.length)
      break
  }

  return pieces
}

function toPreviewChunks(pieces: string[], kind: KnowledgeChunkKind): KnowledgeChunkPreview[] {
  return pieces.map(text => ({
    chunkIndex: 0,
    text,
    tokenCount: countTokens(text),
    kind,
  }))
}

/**
 * Gera a lista de chunks (pai + filho no modo pai-filho) com o texto já
 * pré-processado e cortado conforme as configurações.
 */
export function buildChunkPreview(
  text: string,
  settings?: Partial<KnowledgeChunkingSettings> | null,
): KnowledgeChunkPreview[] {
  const resolved = normalizeKnowledgeSettings(settings)

  const source = applyPreProcessing(text, resolved.mode === 'PARENT_CHILD'
    ? resolved.parentChild.preProcessing
    : resolved.general.preProcessing)

  if (!source)
    return []

  const preview: KnowledgeChunkPreview[] = []

  if (resolved.mode === 'PARENT_CHILD') {
    const { parentChild } = resolved


    const parentPieces = parentChild.parentMode === 'FULL_DOC'
      ? hardSplit(source, parentChild.parentMaxChunkLength, 0)
      : splitBySegment(source, parentChild.parentSegmentIdentifier)
        .flatMap(segment => hardSplit(segment, parentChild.parentMaxChunkLength, 0))

    preview.push(...toPreviewChunks(parentPieces, 'PARENT'))


    const childPieces = parentPieces
      .flatMap(parent => splitBySegment(parent, parentChild.childSegmentIdentifier))
      .flatMap(segment => hardSplit(segment, parentChild.childMaxChunkLength, 0))

    preview.push(...toPreviewChunks(childPieces, 'CHILD'))
  }
  else {
    const { general } = resolved

    const pieces = splitBySegment(source, general.segmentIdentifier)
      .flatMap(segment => hardSplit(segment, general.maxChunkLength, general.chunkOverlap))

    preview.push(...toPreviewChunks(pieces, 'CHUNK'))
  }

  return preview.map((chunk, index) => ({ ...chunk, chunkIndex: index }))
}

/**
 * Chunks de RECUPERAÇÃO (o que fica em `KnowledgeEntry.chunks`):
 * Geral → todos os chunks; Pai-filho → somente os filhos.
 */
export function buildChunks(
  text: string,
  settings?: Partial<KnowledgeChunkingSettings> | null,
): KnowledgeChunk[] {
  const mode = normalizeKnowledgeSettings(settings).mode

  return buildChunkPreview(text, settings)
    .filter(chunk => (mode === 'PARENT_CHILD' ? chunk.kind === 'CHILD' : chunk.kind === 'CHUNK'))
    .map((chunk, index) => ({
      chunkIndex: index,
      text: chunk.text,
      tokenCount: chunk.tokenCount,
    }))
}

/** Atalho usado quando não há configuração carregada ainda. */
export function buildDefaultChunks(text: string): KnowledgeChunk[] {
  return buildChunks(text, createDefaultKnowledgeSettings())
}
