import { normalizeKnowledgeSettings } from '@/types/knowledge'
import { db } from '@db/ai/knowledge/db'
import { handlerAiKnowledge } from '@db/ai/knowledge/index'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

const server = setupServer(...handlerAiKnowledge)
const initialDb = structuredClone(db.knowledge)
const initialSettings = structuredClone(db.settings)

const BASE = 'http://localhost/api/ai/knowledge'

/** Token fake (payload { id }) — admin (id 1) tem todas as permissions. */
function tokenFor(userId: number): string {
  const payload = btoa(JSON.stringify({ id: userId }))

  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.fake-signature`
}

const HEADERS = {
  'content-type': 'application/json',
  'x-workspace-id': 'workspace-alpha',
  'Authorization': `Bearer ${tokenFor(1)}`,
}

describe('knowledge fake API handlers', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

  afterEach(() => {
    server.resetHandlers()
    db.knowledge.splice(0, db.knowledge.length, ...structuredClone(initialDb))
    Object.keys(db.settings).forEach(key => delete db.settings[Number(key)])
    Object.assign(db.settings, structuredClone(initialSettings))
  })

  afterAll(() => server.close())

  it('GET returns all seeded entries for workspace-alpha', async () => {
    const res = await fetch(BASE, { headers: HEADERS })

    expect(res.status).toBe(200)

    const body = await res.json()
    const seeded = initialDb.filter(e => e.tenantId === 'workspace-alpha')

    expect(body.knowledge).toHaveLength(seeded.length)
    expect(body.total).toBe(seeded.length)
    expect(Array.isArray(body.tags)).toBe(true)
  })

  it('GET returns seeded entries for workspace-beta (admin can switch tenants)', async () => {
    const res = await fetch(BASE, { headers: { ...HEADERS, 'x-workspace-id': 'workspace-beta' } })
    const body = await res.json()

    expect(body.knowledge.length).toBeGreaterThan(0)
    body.knowledge.forEach((e: any) => {
      expect(e.tenantId).toBe('workspace-beta')
    })
  })

  it('GET ?q filters by title (case-insensitive)', async () => {
    const res = await fetch(`${BASE}?q=vue`, { headers: HEADERS })
    const body = await res.json()

    expect(body.knowledge.length).toBeGreaterThan(0)
    body.knowledge.forEach((e: any) => {
      expect(e.title.toLowerCase()).toContain('vue')
    })
  })

  it('GET ?tag filters by exact tag', async () => {
    const res = await fetch(`${BASE}?tag=ai`, { headers: HEADERS })
    const body = await res.json()

    expect(body.knowledge.length).toBeGreaterThan(0)
    body.knowledge.forEach((e: any) => {
      expect(e.tags.map((t: string) => t.toLowerCase())).toContain('ai')
    })
  })

  it('GET returns distinct tags from filtered results (tenant-aware)', async () => {
    const res = await fetch(BASE, { headers: HEADERS })
    const body = await res.json()
    const tenantEntries = initialDb.filter(e => e.tenantId === 'workspace-alpha')
    const expected = [...new Set(tenantEntries.flatMap(e => e.tags))].sort()

    expect(body.tags).toEqual(expected)
  })

  it('POST creates an entry and returns 201 with generated id', async () => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        title: 'New Entry',
        content: '<p>Hello world</p>',
        tags: ['test'],
        sourceType: 'MANUAL',
      }),
    })

    expect(res.status).toBe(201)

    const body = await res.json()

    expect(body.entry.id).toBeDefined()
    expect(body.entry.title).toBe('New Entry')
    expect(body.entry.tenantId).toBe('workspace-alpha')
    expect(db.knowledge).toHaveLength(initialDb.length + 1)
  })

  it('POST returns 400 when title is empty', async () => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ title: '', content: '<p>ok</p>', tags: [], sourceType: 'MANUAL' }),
    })

    expect(res.status).toBe(400)

    const body = await res.json()

    expect(body.message).toBe('Title is required')
  })

  it('POST returns 400 when content is empty', async () => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ title: 'Title', content: '', tags: [], sourceType: 'MANUAL' }),
    })

    expect(res.status).toBe(400)
  })

  it('PATCH updates an entry and refreshes updatedAt', async () => {
    const original = db.knowledge[0]
    const originalUpdatedAt = original.updatedAt

    const res = await fetch(`${BASE}/${original.id}`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({ title: 'Updated Title' }),
    })

    expect(res.status).toBe(200)

    const body = await res.json()

    expect(body.entry.title).toBe('Updated Title')
    expect(body.entry.updatedAt).not.toBe(originalUpdatedAt)
  })

  it('PATCH returns 404 for unknown id', async () => {
    const res = await fetch(`${BASE}/9999`, {
      method: 'PATCH',
      headers: HEADERS,
      body: JSON.stringify({ title: 'x' }),
    })

    expect(res.status).toBe(404)
  })

  it('DELETE returns 204 and removes the entry', async () => {
    const target = db.knowledge[0]
    const res = await fetch(`${BASE}/${target.id}`, { method: 'DELETE', headers: HEADERS })

    expect(res.status).toBe(204)
    expect(db.knowledge.find(e => e.id === target.id)).toBeUndefined()
  })

  it('DELETE returns 404 for unknown id', async () => {
    const res = await fetch(`${BASE}/9999`, { method: 'DELETE', headers: HEADERS })

    expect(res.status).toBe(404)
  })

  it('GET isolates by tenant — unknown workspace sees empty results', async () => {
    const res = await fetch(BASE, { headers: { ...HEADERS, 'x-workspace-id': 'workspace-other' } })


    expect(res.status).toBe(403)
  })

  it('GET pagina com itemsPerPage e expõe totalPages (shape canônico)', async () => {
    const res = await fetch(`${BASE}?page=1&itemsPerPage=2`, { headers: HEADERS })
    const body = await res.json()

    const alphaTotal = initialDb.filter(e => e.tenantId === 'workspace-alpha').length

    expect(body.knowledge.length).toBeLessThanOrEqual(2)
    expect(body.total).toBe(alphaTotal)
    expect(body.totalPages).toBe(Math.ceil(alphaTotal / 2))
    expect(body.page).toBe(1)


    const page2 = await (await fetch(`${BASE}?page=2&itemsPerPage=2`, { headers: HEADERS })).json()
    const ids1 = body.knowledge.map((e: any) => e.id)
    const ids2 = page2.knowledge.map((e: any) => e.id)

    expect(ids2.every((id: number) => !ids1.includes(id))).toBe(true)
  })



  it('GET /:id devolve a entrada do tenant', async () => {
    const target = initialDb.find(e => e.tenantId === 'workspace-alpha')!
    const res = await fetch(`${BASE}/${target.id}`, { headers: HEADERS })

    expect(res.status).toBe(200)

    const body = await res.json()

    expect(body.entry.id).toBe(target.id)
  })

  it('GET /:id devolve 404 quando a entrada é de outro tenant', async () => {
    const betaEntry = initialDb.find(e => e.tenantId === 'workspace-beta')!
    const res = await fetch(`${BASE}/${betaEntry.id}`, { headers: HEADERS })

    expect(res.status).toBe(404)
  })

  it('GET /:id devolve 404 para id inexistente', async () => {
    const res = await fetch(`${BASE}/9999`, { headers: HEADERS })

    expect(res.status).toBe(404)
  })



  it('GET /:id/settings devolve os defaults do Dify', async () => {
    const target = initialDb.find(e => e.tenantId === 'workspace-alpha')!
    const res = await fetch(`${BASE}/${target.id}/settings`, { headers: HEADERS })

    expect(res.status).toBe(200)

    const { settings } = await res.json()

    expect(settings.mode).toBe('GENERAL')
    expect(settings.general.maxChunkLength).toBe(1024)
    expect(settings.general.chunkOverlap).toBe(50)
    expect(settings.parentChild.childMaxChunkLength).toBe(512)
    expect(settings.index.mode).toBe('HIGH_QUALITY')
    expect(settings.retrieval.mode).toBe('HYBRID')
    expect(settings.retrieval.topK).toBe(3)
    expect(settings.retrieval.scoreThreshold).toBe(0.5)
  })

  it('PUT /:id/settings persiste e é lido de volta pelo GET', async () => {
    const target = initialDb.find(e => e.tenantId === 'workspace-alpha')!

    const res = await fetch(`${BASE}/${target.id}/settings`, {
      method: 'PUT',
      headers: HEADERS,
      body: JSON.stringify({
        mode: 'GENERAL',
        general: { maxChunkLength: 512, chunkOverlap: 10 },
        retrieval: { mode: 'VECTOR', topK: 5, scoreThreshold: 0.3 },
      }),
    })

    expect(res.status).toBe(200)

    const put = await res.json()

    expect(put.settings.general.maxChunkLength).toBe(512)
    expect(put.settings.retrieval.topK).toBe(5)
    expect(db.settings[target.id].general.maxChunkLength).toBe(512)

    const get = await (await fetch(`${BASE}/${target.id}/settings`, { headers: HEADERS })).json()

    expect(get.settings.general.chunkOverlap).toBe(10)
    expect(get.settings.retrieval.mode).toBe('VECTOR')
  })

  it('PUT /:id/settings força alta qualidade no modo pai-filho', async () => {
    const target = initialDb.find(e => e.tenantId === 'workspace-alpha')!

    const res = await fetch(`${BASE}/${target.id}/settings`, {
      method: 'PUT',
      headers: HEADERS,
      body: JSON.stringify({
        mode: 'PARENT_CHILD',
        index: { mode: 'ECONOMICAL' },
      }),
    })

    const { settings } = await res.json()

    expect(settings.mode).toBe('PARENT_CHILD')
    expect(settings.index.mode).toBe('HIGH_QUALITY')
  })

  it('PUT /:id/settings devolve 404 para entrada de outro tenant', async () => {
    const betaEntry = initialDb.find(e => e.tenantId === 'workspace-beta')!

    const res = await fetch(`${BASE}/${betaEntry.id}/settings`, {
      method: 'PUT',
      headers: HEADERS,
      body: JSON.stringify({ mode: 'GENERAL' }),
    })

    expect(res.status).toBe(404)
  })

  it('DELETE remove também as configurações da entrada', async () => {
    const target = db.knowledge[0]

    db.settings[target.id] = normalizeKnowledgeSettings({ mode: 'PARENT_CHILD' })

    await fetch(`${BASE}/${target.id}`, { method: 'DELETE', headers: HEADERS })

    expect(db.settings[target.id]).toBeUndefined()
  })
})
