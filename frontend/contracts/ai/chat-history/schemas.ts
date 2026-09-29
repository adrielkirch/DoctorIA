import { z } from 'zod'
import { Expect, IsEqual } from '../../_parity'
import type {
  AiChatHistoryListResponse,
  AiChatMessageAttachment,
  AiChatMessageItem,
  AiChatMessageRole,
  AiChatMessagesListResponse,
  AiChatSummary,
  AiCreateChatResponse,
  AiRenameChatRequest,
  AiRenameChatResponse,
  AiSendMessageRequest,
  AiSendMessageResponse,
  AiShareChatResponse,
} from './types'

export const aiChatMessageRoleSchema = z.enum(['user', 'assistant'])

export const aiChatMessageAttachmentSchema = z.object({
  name: z.string(),
  size: z.number(),
  mimeType: z.string(),
})

export const aiChatSummarySchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messageCount: z.number(),
  lastMessage: z.string().optional(),
  isShared: z.boolean(),
  shareUrl: z.string().optional(),
})

export const aiChatHistoryListResponseSchema = z.object({
  data: z.array(aiChatSummarySchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  hasMore: z.boolean(),
})

export const aiShareChatResponseSchema = z.object({
  shareUrl: z.string(),
  expiresAt: z.string().optional(),
})

export const aiChatMessageItemSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  role: aiChatMessageRoleSchema,
  content: z.string(),
  createdAt: z.string(),
  attachments: z.array(aiChatMessageAttachmentSchema).optional(),
  isStreaming: z.boolean().optional(),
  error: z.object({
    message: z.string(),
    timestamp: z.string(),
  }).optional(),
})

export const aiChatMessagesListResponseSchema = z.object({
  data: z.array(aiChatMessageItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  hasMore: z.boolean(),
})

export const aiSendMessageRequestSchema = z.object({
  content: z.string(),
  attachments: z.array(aiChatMessageAttachmentSchema).optional(),
})

export const aiSendMessageResponseSchema = z.object({
  message: aiChatMessageItemSchema,
  reply: aiChatMessageItemSchema,
})

export const aiCreateChatResponseSchema = z.object({
  chat: aiChatSummarySchema,
  message: aiChatMessageItemSchema,
  reply: aiChatMessageItemSchema,
})

export const aiRenameChatRequestSchema = z.object({
  title: z.string(),
})

export const aiRenameChatResponseSchema = z.object({
  title: z.string(),
})

type _H1 = Expect<IsEqual<z.infer<typeof aiChatMessageRoleSchema>, AiChatMessageRole>>
type _H2 = Expect<IsEqual<z.infer<typeof aiChatMessageAttachmentSchema>, AiChatMessageAttachment>>
type _H3 = Expect<IsEqual<z.infer<typeof aiChatSummarySchema>, AiChatSummary>>
type _H4 = Expect<IsEqual<z.infer<typeof aiChatHistoryListResponseSchema>, AiChatHistoryListResponse>>
type _H5 = Expect<IsEqual<z.infer<typeof aiShareChatResponseSchema>, AiShareChatResponse>>
type _H6 = Expect<IsEqual<z.infer<typeof aiChatMessageItemSchema>, AiChatMessageItem>>
type _H7 = Expect<IsEqual<z.infer<typeof aiChatMessagesListResponseSchema>, AiChatMessagesListResponse>>
type _H8 = Expect<IsEqual<z.infer<typeof aiSendMessageRequestSchema>, AiSendMessageRequest>>
type _H9 = Expect<IsEqual<z.infer<typeof aiSendMessageResponseSchema>, AiSendMessageResponse>>
type _H10 = Expect<IsEqual<z.infer<typeof aiCreateChatResponseSchema>, AiCreateChatResponse>>
type _H11 = Expect<IsEqual<z.infer<typeof aiRenameChatRequestSchema>, AiRenameChatRequest>>
type _H12 = Expect<IsEqual<z.infer<typeof aiRenameChatResponseSchema>, AiRenameChatResponse>>
