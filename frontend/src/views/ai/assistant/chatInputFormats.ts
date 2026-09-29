/**
 * Formatos de arquivo suportados no input do AI Assistant.
 * MIME → ícone/categoria (ícones bx-*). Extensões compensam MIME vazio (.md).
 */

export type FileCategory = 'image' | 'document' | 'data' | 'code'

export interface FileKind { icon: string; category: FileCategory }

export const SUPPORTED_MIME: Record<string, FileKind> = {
  'image/jpeg': { icon: 'bx-image', category: 'image' },
  'image/png': { icon: 'bx-image', category: 'image' },
  'image/gif': { icon: 'bx-image', category: 'image' },
  'image/webp': { icon: 'bx-image', category: 'image' },
  'image/svg+xml': { icon: 'bx-image', category: 'image' },
  'text/plain': { icon: 'bx-file-blank', category: 'document' },
  'text/markdown': { icon: 'bx-code', category: 'code' },
  'text/html': { icon: 'bx-code', category: 'code' },
  'text/csv': { icon: 'bx-table', category: 'data' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: 'bx-table', category: 'data' },
  'application/vnd.ms-excel': { icon: 'bx-table', category: 'data' },
  'application/pdf': { icon: 'bx-file-blank', category: 'document' },
  'application/json': { icon: 'bx-code', category: 'code' },
  'text/javascript': { icon: 'bx-code', category: 'code' },
  'text/typescript': { icon: 'bx-code', category: 'code' },
}

export const SUPPORTED_EXT: Record<string, FileKind> = {
  '.md': { icon: 'bx-code', category: 'code' },
  '.txt': { icon: 'bx-file-blank', category: 'document' },
  '.csv': { icon: 'bx-table', category: 'data' },
}

export const ACCEPT_ATTRIBUTE = '.txt,.md,.csv,.xlsx,.xls,.pdf,.json,.js,.ts,.html,.png,.jpg,.jpeg,.gif,.webp,.svg'

export function fileKind(file: File): FileKind | null {
  const byMime = SUPPORTED_MIME[file.type]

  if (byMime)
    return byMime

  const ext = `.${file.name.split('.').pop()?.toLowerCase() ?? ''}`

  return SUPPORTED_EXT[ext] ?? null
}

export function isSupportedFile(file: File): boolean {
  return fileKind(file) !== null
}
