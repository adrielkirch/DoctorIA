import { db } from '@db/ai/chat-history/db'
import { handlerAiChatHistory } from '@db/ai/chat-history/index'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

const server = setupServer(...handlerAiChatHistory)
const initialDb = structuredClone(db.chats)
const initialMessages = structuredClone(db.messages)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  db.chats.splice(0, db.chats.length, ...structuredClone(initialDb))
  db.messages = structuredClone(initialMessages)
})
afterAll(() => server.close())

const BASE = 'http://localhost/api/ai/chat-history'

/** Token fake (payload { id }) — admin (id 1) tem todas as permissions. */
function tokenFor(userId: number): string {
  const payload = btoa(JSON.stringify({ id: userId }))

  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.fake-signature`
}

const HEADERS = {
  'content-type': 'application/json',
  'x-tenant-id': 'workspace-alpha',
  'Authorization': `Bearer ${tokenFor(1)}`,
}

const HEADERS_BETA = {
  'content-type': 'application/json',
  'x-tenant-id': 'workspace-beta',
  'Authorization': `Bearer ${tokenFor(1)}`,
}

describe('handlerAiChatHistory — histórico paginado por tenant', () => {
  it('GET pagina 18 por vez e expõe hasMore/total', async () => {
    const res = await fetch(`${BASE}?page=0&limit=18`, { headers: HEADERS })

    expect(res.status).toBe(200)

    const body = await res.json()

    expect(body.data).toHaveLength(18)
    expect(body.page).toBe(0)
    expect(body.limit).toBe(18)
    expect(body.hasMore).toBe(true)
    expect(body.total).toBeGreaterThan(18)
  })

  it('GET última página fecha a lista (hasMore=false) sem duplicar ids', async () => {
    const first = await (await fetch(`${BASE}?page=0&limit=18`, { headers: HEADERS })).json()
    const last = await (await fetch(`${BASE}?page=2&limit=18`, { headers: HEADERS })).json()

    expect(last.hasMore).toBe(false)
    expect(last.data.length).toBeGreaterThan(0)

    const idsFirst: string[] = first.data.map((c: { id: string }) => c.id)
    const idsLast: string[] = last.data.map((c: { id: string }) => c.id)

    expect(idsLast.every(id => !idsFirst.includes(id))).toBe(true)
  })

  it('GET ordena por updatedAt desc', async () => {
    const body = await (await fetch(`${BASE}?page=0&limit=18`, { headers: HEADERS })).json()

    const times = body.data.map((c: { updatedAt: string }) => +new Date(c.updatedAt))

    expect([...times].sort((a, b) => b - a)).toEqual(times)
  })

  it('GET isola por tenant — beta só vê os próprios chats', async () => {
    const alpha = await (await fetch(`${BASE}?page=0&limit=100`, { headers: HEADERS })).json()
    const beta = await (await fetch(`${BASE}?page=0&limit=100`, { headers: HEADERS_BETA })).json()

    expect(alpha.total).toBe(40)
    expect(beta.total).toBe(8)
    expect(beta.data.every((c: { tenantId: string }) => c.tenantId === 'workspace-beta')).toBe(true)
  })

  it('GET sem token cai no papel member (mínimo privilégio) — assistant é acessível a todas as roles', async () => {



    const res = await fetch(`${BASE}?page=0&limit=18`, {
      headers: { 'x-tenant-id': 'workspace-alpha' },
    })

    expect(res.status).toBe(200)
  })

  it('POST share gera shareUrl e marca isShared; id de outro tenant → 404', async () => {
    const target = db.chats.find(c => c.tenantId === 'workspace-alpha')!

    const res = await fetch(`${BASE}/${target.id}/share`, { method: 'POST', headers: HEADERS })

    expect(res.status).toBe(200)

    const body = await res.json()

    expect(body.shareUrl).toBe(`https://app.example.com/share/${target.id}`)
    expect(db.chats.find(c => c.id === target.id)?.isShared).toBe(true)


    const betaChat = db.chats.find(c => c.tenantId === 'workspace-beta')!
    const cross = await fetch(`${BASE}/${betaChat.id}/share`, { method: 'POST', headers: HEADERS })

    expect(cross.status).toBe(404)
  })

  it('PATCH rename atualiza título + updatedAt; título vazio → 400; id desconhecido → 404', async () => {
    const target = db.chats.find(c => c.tenantId === 'workspace-alpha')!
    const originalUpdatedAt = target.updatedAt

    const res = await fetch(`${BASE}/${target.id}`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({ title: 'Novo título do chat' }),
    })

    expect(res.status).toBe(200)

    const body = await res.json()

    expect(body.title).toBe('Novo título do chat')
    expect(db.chats.find(c => c.id === target.id)?.updatedAt).not.toBe(originalUpdatedAt)

    const empty = await fetch(`${BASE}/${target.id}`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({ title: '   ' }),
    })

    expect(empty.status).toBe(400)

    const missing = await fetch(`${BASE}/chat-nao-existe`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({ title: 'x' }),
    })

    expect(missing.status).toBe(404)
  })

  it('DELETE remove e retorna 204; id desconhecido → 404', async () => {
    const target = db.chats.find(c => c.tenantId === 'workspace-alpha')!

    const res = await fetch(`${BASE}/${target.id}`, { method: 'DELETE', headers: HEADERS })

    expect(res.status).toBe(204)
    expect(db.chats.find(c => c.id === target.id)).toBeUndefined()
    expect(db.messages[target.id]).toBeUndefined()

    const missing = await fetch(`${BASE}/chat-nao-existe`, { method: 'DELETE', headers: HEADERS })

    expect(missing.status).toBe(404)
  })
})

describe('handlerAiChatHistory — mensagens da conversa (Fase 2)', () => {
  it('GET /:id/messages retorna a conversa completa do chat', async () => {
    const target = db.chats.find(c => c.tenantId === 'workspace-alpha')!

    const res = await fetch(`${BASE}/${target.id}/messages`, { headers: HEADERS })

    expect(res.status).toBe(200)

    const body = await res.json()

    expect(body.data.length).toBeGreaterThan(0)
    expect(body.hasMore).toBe(false)
    expect(body.total).toBe(body.data.length)
    expect(body.data.every((m: { chatId: string }) => m.chatId === target.id)).toBe(true)
  })

  it('GET /:id/messages é determinístico e alterna user/assistant', async () => {
    const target = db.chats.find(c => c.tenantId === 'workspace-alpha')!

    const first = await (await fetch(`${BASE}/${target.id}/messages`, { headers: HEADERS })).json()
    const second = await (await fetch(`${BASE}/${target.id}/messages`, { headers: HEADERS })).json()

    expect(first.data.map((m: { id: string }) => m.id)).toEqual(second.data.map((m: { id: string }) => m.id))

    const roles = first.data.map((m: { role: string }) => m.role)

    expect(roles[0]).toBe('user')
    expect(roles[1]).toBe('assistant')
    expect(roles.every((role: string, i: number) => role === (i % 2 === 0 ? 'user' : 'assistant'))).toBe(true)
  })

  it('GET /:id/messages isola por tenant e retorna 404 p/ chat desconhecido', async () => {
    const betaChat = db.chats.find(c => c.tenantId === 'workspace-beta')!

    const cross = await fetch(`${BASE}/${betaChat.id}/messages`, { headers: HEADERS })

    expect(cross.status).toBe(404)

    const missing = await fetch(`${BASE}/chat-nao-existe/messages`, { headers: HEADERS })

    expect(missing.status).toBe(404)
  })

  it('POST /:id/messages anexa user+reply, bump no summary e persiste no db', async () => {
    const target = db.chats.find(c => c.tenantId === 'workspace-alpha')!
    const originalCount = target.messageCount
    const originalLen = db.messages[target.id].length

    const res = await fetch(`${BASE}/${target.id}/messages`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ content: 'Mais uma dúvida sobre JWT', attachments: [{ name: 'relatorio.pdf', size: 1024, mimeType: 'application/pdf' }] }),
    })

    expect(res.status).toBe(200)

    const body = await res.json()

    expect(body.message.role).toBe('user')
    expect(body.message.content).toBe('Mais uma dúvida sobre JWT')
    expect(body.message.attachments).toHaveLength(1)
    expect(body.reply.role).toBe('assistant')
    expect(body.reply.content.length).toBeGreaterThan(0)

    expect(db.messages[target.id]).toHaveLength(originalLen + 2)
    expect(target.messageCount).toBe(originalCount + 2)
    expect(target.lastMessage).toBe(body.reply.content)
  })

  it('POST /:id/messages valida conteúdo vazio (400) e chat desconhecido (404)', async () => {
    const target = db.chats.find(c => c.tenantId === 'workspace-alpha')!

    const empty = await fetch(`${BASE}/${target.id}/messages`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ content: '   ' }),
    })

    expect(empty.status).toBe(400)

    const missing = await fetch(`${BASE}/chat-nao-existe/messages`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ content: 'oi' }),
    })

    expect(missing.status).toBe(404)
  })

  it('POST /:id/messages com seed 0 devolve o mock rico em markdown (Fase 3)', async () => {
    const target = db.chats.find(c => c.tenantId === 'workspace-alpha')!


    const res = await fetch(`${BASE}/${target.id}/messages`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ content: 'abcdefg' }),
    })

    expect(res.status).toBe(200)

    const body = await res.json()

    expect(body.reply.content).toContain('# Guia Completo de Formatação Markdown')
    expect(body.reply.content).toContain('| Recurso | Sintaxe Markdown |')
    expect(body.reply.content).toContain('```python')
    expect(body.reply.content).toContain('$$E = mc^2$$')
    expect(body.reply.content).toContain('[Acesse a documentação oficial do Markdown](https://www.markdownguide.org)')
  })

  it('POST /ai/chat-history cria chat a partir da 1ª mensagem (novo chat)', async () => {
    const before = db.chats.length

    const res = await fetch(`${BASE}`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ content: 'Preciso de ajuda para configurar o CI' }),
    })

    expect(res.status).toBe(200)

    const body = await res.json()

    expect(body.chat.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(body.chat.title).toBe('Preciso de ajuda para configurar o CI')
    expect(body.chat.messageCount).toBe(2)
    expect(body.message.role).toBe('user')
    expect(body.reply.role).toBe('assistant')
    expect(db.chats).toHaveLength(before + 1)
    expect(db.messages[body.chat.id]).toHaveLength(2)
  })

  it('POST /ai/chat-history valida conteúdo vazio (400)', async () => {
    const res = await fetch(`${BASE}`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ content: '' }),
    })

    expect(res.status).toBe(400)
  })
})
