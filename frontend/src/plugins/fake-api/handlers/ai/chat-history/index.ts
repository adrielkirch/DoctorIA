import { authorize } from '@api-utils/authorize'
import { getTenantId } from '@api-utils/tenant'
import type {
  AiChatMessageItem,
  AiChatSummary,
  AiCreateChatResponse,
  AiRenameChatRequest,
  AiRenameChatResponse,
  AiSendMessageResponse,
  AiShareChatResponse,
} from 'contracts/ai/chat-history/types'
import { HttpResponse, http } from 'msw'
import { ASSISTANT_REPLIES, db } from './db'

const SHARE_BASE = 'https://app.example.com/share'

function sortedByUpdatedAt(tenantId: string): AiChatSummary[] {
  return db.chats
    .filter(c => c.tenantId === tenantId)
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
}

function findChat(tenantId: string, chatId: string): AiChatSummary | undefined {
  return db.chats.find(c => c.id === chatId && c.tenantId === tenantId)
}

function pickReply(seed: number): string {
  return ASSISTANT_REPLIES[seed % ASSISTANT_REPLIES.length]
}

function makeUserMessage(chatId: string, content: string, attachments?: AiChatMessageItem['attachments']): AiChatMessageItem {
  return {
    id: `${chatId}-m${Date.now()}`,
    chatId,
    role: 'user',
    content: content.trim(),
    createdAt: new Date().toISOString(),
    ...(attachments?.length ? { attachments } : {}),
  }
}

function makeAiReply(chatId: string, seed: number): AiChatMessageItem {
  return {
    id: `${chatId}-m${Date.now()}-ai`,
    chatId,
    role: 'assistant',
    content: pickReply(seed),
    createdAt: new Date(Date.now() + 500).toISOString(),
  }
}

export const handlerAiChatHistory = [

  http.get('*/api/ai/chat-history', ({ request }) => {
    const denied = authorize(request, ['ai.assistant.use', 'ai.assistant.view'])
    if (denied)
      return denied

    const tenantId = getTenantId(request)
    const url = new URL(request.url)
    const page = Math.max(0, Number(url.searchParams.get('page') ?? 0) || 0)
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 18) || 18, 1), 100)

    const list = sortedByUpdatedAt(tenantId)
    const start = page * limit
    const data = list.slice(start, start + limit)

    return HttpResponse.json({
      data,
      total: list.length,
      page,
      limit,
      hasMore: start + limit < list.length,
    })
  }),



  http.post('*/api/ai/chat-history', async ({ request }) => {
    const denied = authorize(request, 'ai.assistant.use')
    if (denied)
      return denied

    const tenantId = getTenantId(request)
    const { content, attachments } = await request.json() as { content?: string; attachments?: AiChatMessageItem['attachments'] }

    if (!content?.trim())
      return HttpResponse.json({ message: 'Message is required' }, { status: 400 })

    const trimmed = content.trim()
    const now = new Date()


    const id = crypto.randomUUID()

    const chat: AiChatSummary = {
      id,
      tenantId,
      title: trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      messageCount: 2,
      lastMessage: '',
      isShared: false,
    }

    const message = makeUserMessage(id, trimmed, attachments)
    const reply = makeAiReply(id, trimmed.length)

    chat.lastMessage = reply.content

    db.chats.push(chat)
    db.messages[id] = [message, reply]

    const body: AiCreateChatResponse = { chat, message, reply }

    return HttpResponse.json(body)
  }),


  http.post('*/api/ai/chat-history/:id/share', ({ request, params }) => {
    const denied = authorize(request, ['ai.assistant.use', 'ai.assistant.view'])
    if (denied)
      return denied

    const tenantId = getTenantId(request)
    const chat = findChat(tenantId, String(params.id))
    if (!chat)
      return HttpResponse.json({ message: 'Chat not found' }, { status: 404 })

    chat.isShared = true
    chat.shareUrl = `${SHARE_BASE}/${chat.id}`

    const body: AiShareChatResponse = { shareUrl: chat.shareUrl }

    return HttpResponse.json(body)
  }),


  http.patch('*/api/ai/chat-history/:id', async ({ request, params }) => {
    const denied = authorize(request, ['ai.assistant.use', 'ai.assistant.view'])
    if (denied)
      return denied

    const tenantId = getTenantId(request)
    const chat = findChat(tenantId, String(params.id))
    if (!chat)
      return HttpResponse.json({ message: 'Chat not found' }, { status: 404 })

    const { title } = await request.json() as Partial<AiRenameChatRequest>
    if (!title?.trim())
      return HttpResponse.json({ message: 'Title is required' }, { status: 400 })

    chat.title = title.trim()
    chat.updatedAt = new Date().toISOString()

    const body: AiRenameChatResponse = { title: chat.title }

    return HttpResponse.json(body)
  }),


  http.delete('*/api/ai/chat-history/:id', ({ request, params }) => {
    const denied = authorize(request, ['ai.assistant.use', 'ai.assistant.view'])
    if (denied)
      return denied

    const tenantId = getTenantId(request)
    const index = db.chats.findIndex(c => c.id === String(params.id) && c.tenantId === tenantId)
    if (index === -1)
      return HttpResponse.json({ message: 'Chat not found' }, { status: 404 })

    db.chats.splice(index, 1)
    delete db.messages[String(params.id)]

    return new HttpResponse(null, { status: 204 })
  }),


  http.get('*/api/ai/chat-history/:id/messages', ({ request, params }) => {
    const denied = authorize(request, ['ai.assistant.use', 'ai.assistant.view'])
    if (denied)
      return denied

    const tenantId = getTenantId(request)
    const chat = findChat(tenantId, String(params.id))
    if (!chat)
      return HttpResponse.json({ message: 'Chat not found' }, { status: 404 })

    const data = db.messages[chat.id] ?? []

    return HttpResponse.json({
      data,
      total: data.length,
      page: 0,
      limit: data.length,
      hasMore: false,
    })
  }),


  http.post('*/api/ai/chat-history/:id/messages', async ({ request, params }) => {
    const denied = authorize(request, 'ai.assistant.use')
    if (denied)
      return denied

    const tenantId = getTenantId(request)
    const chat = findChat(tenantId, String(params.id))
    if (!chat)
      return HttpResponse.json({ message: 'Chat not found' }, { status: 404 })

    const { content, attachments } = await request.json() as { content?: string; attachments?: AiChatMessageItem['attachments'] }
    if (!content?.trim())
      return HttpResponse.json({ message: 'Message is required' }, { status: 400 })

    const message = makeUserMessage(chat.id, content.trim(), attachments)
    const reply = makeAiReply(chat.id, content.trim().length)

    db.messages[chat.id] = [...(db.messages[chat.id] ?? []), message, reply]

    chat.messageCount += 2
    chat.updatedAt = reply.createdAt
    chat.lastMessage = reply.content

    const body: AiSendMessageResponse = { message, reply }

    return HttpResponse.json(body)
  }),
]
