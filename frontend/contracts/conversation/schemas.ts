import { z } from 'zod'
import { Expect, IsEqual } from '../_parity'
import type {
  Conversation,
  ConversationContact,
  ConversationContactWithConversation,
  ConversationMessage,
  ConversationOut,
  ConversationStatus,
} from './types'

export const conversationStatusSchema = z.enum(['online', 'offline', 'busy', 'away'])

export const conversationContactSchema = z.object({
  id: z.number(),
  tenantId: z.string(),
  fullName: z.string(),
  role: z.literal('ai'),
  about: z.string(),
  avatar: z.string(),
  status: conversationStatusSchema,
})

export const conversationMessageFeedbackSchema = z.object({
  isSent: z.boolean(),
  isDelivered: z.boolean(),
  isSeen: z.boolean(),
})

export const conversationMessageSchema = z.object({
  message: z.string(),
  time: z.string(),
  senderId: z.union([z.number(), z.string()]),
  isAI: z.boolean(),
  feedback: conversationMessageFeedbackSchema,
})

export const conversationSchema = z.object({
  id: z.number(),
  tenantId: z.string(),
  userId: z.number(),
  unseenMsgs: z.number(),
  messages: z.array(conversationMessageSchema),
})

export const conversationOutSchema = z.object({
  id: z.number(),
  unseenMsgs: z.number(),
  messages: z.array(conversationMessageSchema),
  lastMessage: conversationMessageSchema,
})

export const conversationContactWithConversationSchema = conversationContactSchema.extend({
  conversation: z.object({
    id: z.number(),
    unseenMsgs: z.number(),
    lastMessage: conversationMessageSchema,
  }),
})

type _C1 = Expect<IsEqual<z.infer<typeof conversationStatusSchema>, ConversationStatus>>
type _C2 = Expect<IsEqual<z.infer<typeof conversationContactSchema>, ConversationContact>>
type _C3 = Expect<IsEqual<z.infer<typeof conversationMessageSchema>, ConversationMessage>>
type _C4 = Expect<IsEqual<z.infer<typeof conversationSchema>, Conversation>>
type _C5 = Expect<IsEqual<z.infer<typeof conversationOutSchema>, ConversationOut>>
type _C6 = Expect<IsEqual<z.infer<typeof conversationContactWithConversationSchema>, ConversationContactWithConversation>>
