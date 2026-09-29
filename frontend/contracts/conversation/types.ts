export type ConversationStatus = 'online' | 'offline' | 'busy' | 'away'

export interface ConversationContact {
  id: number
  tenantId: string
  fullName: string
  role: 'ai'
  about: string
  avatar: string
  status: ConversationStatus
}

export interface ConversationMessage {
  message: string
  time: string
  senderId: number | string
  isAI: boolean
  feedback: {
    isSent: boolean
    isDelivered: boolean
    isSeen: boolean
  }
}

export interface Conversation {
  id: number
  tenantId: string
  userId: number
  unseenMsgs: number
  messages: ConversationMessage[]
}

export interface ConversationOut {
  id: Conversation['id']
  unseenMsgs: Conversation['unseenMsgs']
  messages: ConversationMessage[]
  lastMessage: ConversationMessage
}

export interface ConversationContactWithConversation extends ConversationContact {
  conversation: {
    id: number
    unseenMsgs: number
    lastMessage: ConversationMessage
  }
}
