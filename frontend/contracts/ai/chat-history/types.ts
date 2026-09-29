export interface AiChatSummary {
  id: string
  tenantId: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
  lastMessage?: string
  isShared: boolean
  shareUrl?: string
}

export interface AiChatHistoryListResponse {
  data: AiChatSummary[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface AiShareChatResponse {
  shareUrl: string
  expiresAt?: string
}

export type AiChatMessageRole = 'user' | 'assistant'

export interface AiChatMessageAttachment {
  name: string
  size: number
  mimeType: string
}

export interface AiChatMessageItem {
  id: string
  chatId: string
  role: AiChatMessageRole
  content: string
  createdAt: string
  attachments?: AiChatMessageAttachment[]
  /** Fase 3 — streaming: true enquanto a resposta do assistente está sendo "digitada". */
  isStreaming?: boolean
  /** Fase 3 — erro de geração exibido na mensagem (com retry). */
  error?: {
    message: string
    timestamp: string
  }
}

export interface AiChatMessagesListResponse {
  data: AiChatMessageItem[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

export interface AiSendMessageRequest {
  content: string
  attachments?: AiChatMessageAttachment[]
}

export interface AiSendMessageResponse {
  message: AiChatMessageItem
  reply: AiChatMessageItem
}

export interface AiCreateChatResponse {
  chat: AiChatSummary
  message: AiChatMessageItem
  reply: AiChatMessageItem
}

export interface AiRenameChatRequest {
  title: string
}

export interface AiRenameChatResponse {
  title: string
}
