import type { KnowledgeChunkingSettings } from '@/types/knowledge'
import { createDefaultKnowledgeSettings, normalizeKnowledgeSettings } from '@/types/knowledge'
import { authorize } from '@api-utils/authorize'
import { genId } from '@api-utils/genId'
import { paginateArray } from '@api-utils/paginateArray'
import { getTenantId } from '@api-utils/tenant'
import { db } from '@db/ai/knowledge/db'
import type { KnowledgeCreatePayload, KnowledgeEntry, KnowledgeUpdatePayload } from 'contracts/ai/knowledge/types'
import { HttpResponse, http } from 'msw'

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

export const handlerAiKnowledge = [


  http.get('*/api/ai/knowledge', ({ request }) => {
    const denied = authorize(request, 'ai.knowledge.view')
    if (denied)
      return denied

    const url = new URL(request.url)
    const tenantId = getTenantId(request)
    const q = url.searchParams.get('q')?.trim().toLowerCase() ?? ''
    const tag = url.searchParams.get('tag')?.trim().toLowerCase() ?? ''
    const page = parsePositiveInt(url.searchParams.get('page'), 1)
    const itemsPerPage = Math.min(parsePositiveInt(url.searchParams.get('itemsPerPage'), 12), 100)

    let results = db.knowledge.filter(e => e.tenantId === tenantId)

    if (q) {
      results = results.filter(e =>
        e.title.toLowerCase().includes(q)
        || stripHtml(e.content).toLowerCase().includes(q),
      )
    }

    if (tag) {
      results = results.filter(e =>
        e.tags.some(t => t.toLowerCase() === tag),
      )
    }


    const distinctTags = [...new Set(db.knowledge.filter(e => e.tenantId === tenantId).flatMap(e => e.tags))].sort()
    const total = results.length
    const totalPages = Math.ceil(total / itemsPerPage)

    return HttpResponse.json({
      knowledge: paginateArray(results, itemsPerPage, page),
      total,
      totalPages,
      page,
      tags: distinctTags,
    })
  }),


  http.post('*/api/ai/knowledge', async ({ request }) => {
    const denied = authorize(request, 'ai.knowledge.manage')
    if (denied)
      return denied

    const tenantId = getTenantId(request)
    const payload = await request.json() as KnowledgeCreatePayload

    if (!payload.title?.trim())
      return HttpResponse.json({ message: 'Title is required' }, { status: 400 })

    if (payload.title.trim().length > 200)
      return HttpResponse.json({ message: 'Title too long (max 200 chars)' }, { status: 400 })

    if (!payload.content?.trim())
      return HttpResponse.json({ message: 'Content is required' }, { status: 400 })

    if (!['MANUAL', 'UPLOADED'].includes(payload.sourceType))
      return HttpResponse.json({ message: 'Invalid sourceType' }, { status: 400 })

    if (Array.isArray(payload.tags)) {
      for (const tag of payload.tags) {
        if (tag.length > 40)
          return HttpResponse.json({ message: 'Tag too long (max 40 chars)' }, { status: 400 })
      }
      if (payload.tags.length > 20)
        return HttpResponse.json({ message: 'Too many tags (max 20)' }, { status: 400 })
    }

    const now = new Date().toISOString()

    const entry: KnowledgeEntry = {
      id: genId(db.knowledge),
      tenantId,
      title: payload.title.trim(),
      content: payload.content,
      tags: payload.tags ?? [],
      sourceType: payload.sourceType,
      sourceFilename: payload.sourceFilename ?? null,
      chunks: payload.chunks ?? [],
      linkedSecretName: payload.linkedSecretName ?? null,
      createdAt: now,
      updatedAt: now,
    }

    db.knowledge.push(entry)
    db.settings[entry.id] = createDefaultKnowledgeSettings()

    return HttpResponse.json({ entry }, { status: 201 })
  }),


  http.patch('*/api/ai/knowledge/:id', async ({ request, params }) => {
    const denied = authorize(request, 'ai.knowledge.manage')
    if (denied)
      return denied

    const id = Number(params.id)
    const tenantId = getTenantId(request)
    const index = db.knowledge.findIndex(e => e.id === id && e.tenantId === tenantId)

    if (index === -1)
      return HttpResponse.json({ message: 'Knowledge entry not found' }, { status: 404 })

    const payload = await request.json() as KnowledgeUpdatePayload

    if (payload.title !== undefined && !payload.title.trim())
      return HttpResponse.json({ message: 'Title is required' }, { status: 400 })

    if (payload.title !== undefined && payload.title.trim().length > 200)
      return HttpResponse.json({ message: 'Title too long (max 200 chars)' }, { status: 400 })

    const existing = db.knowledge[index]

    const updated: KnowledgeEntry = {
      ...existing,
      ...(payload.title !== undefined && { title: payload.title.trim() }),
      ...(payload.content !== undefined && { content: payload.content }),
      ...(payload.tags !== undefined && { tags: payload.tags }),
      ...(payload.sourceFilename !== undefined && { sourceFilename: payload.sourceFilename ?? null }),
      ...(payload.chunks !== undefined && { chunks: payload.chunks }),
      ...(payload.linkedSecretName !== undefined && { linkedSecretName: payload.linkedSecretName ?? null }),
      updatedAt: new Date().toISOString(),
    }

    db.knowledge[index] = updated

    return HttpResponse.json({ entry: updated })
  }),


  http.delete('*/api/ai/knowledge/:id', ({ request, params }) => {
    const denied = authorize(request, 'ai.knowledge.manage')
    if (denied)
      return denied

    const id = Number(params.id)
    const tenantId = getTenantId(request)
    const index = db.knowledge.findIndex(e => e.id === id && e.tenantId === tenantId)

    if (index === -1)
      return HttpResponse.json({ message: 'Knowledge entry not found' }, { status: 404 })

    db.knowledge.splice(index, 1)
    delete db.settings[id]

    return new HttpResponse(null, { status: 204 })
  }),


  http.get('*/api/ai/knowledge/tags', ({ request }) => {
    const denied = authorize(request, 'ai.knowledge.view')
    if (denied)
      return denied

    return HttpResponse.json({ tags: [...db.tags].sort() })
  }),


  http.post('*/api/ai/knowledge/tags', async ({ request }) => {
    const denied = authorize(request, 'ai.knowledge.manage')
    if (denied)
      return denied

    const { tag } = await request.json() as { tag: string }
    const normalised = tag?.trim().toLowerCase()

    if (!normalised)
      return HttpResponse.json({ message: 'Tag is required' }, { status: 400 })

    if (db.tags.includes(normalised))
      return HttpResponse.json({ tag: normalised }, { status: 200 })

    db.tags.push(normalised)

    return HttpResponse.json({ tag: normalised }, { status: 201 })
  }),




  http.get('*/api/ai/knowledge/:id', ({ request, params }) => {
    const denied = authorize(request, 'ai.knowledge.view')
    if (denied)
      return denied

    const id = Number(params.id)
    const tenantId = getTenantId(request)
    const entry = db.knowledge.find(e => e.id === id && e.tenantId === tenantId)

    if (!entry)
      return HttpResponse.json({ message: 'Knowledge entry not found' }, { status: 404 })

    return HttpResponse.json({ entry })
  }),


  http.get('*/api/ai/knowledge/:id/settings', ({ request, params }) => {
    const denied = authorize(request, 'ai.knowledge.view')
    if (denied)
      return denied

    const id = Number(params.id)
    const tenantId = getTenantId(request)
    const entry = db.knowledge.find(e => e.id === id && e.tenantId === tenantId)

    if (!entry)
      return HttpResponse.json({ message: 'Knowledge entry not found' }, { status: 404 })

    return HttpResponse.json({ settings: db.settings[id] ?? createDefaultKnowledgeSettings() })
  }),


  http.put('*/api/ai/knowledge/:id/settings', async ({ request, params }) => {
    const denied = authorize(request, 'ai.knowledge.manage')
    if (denied)
      return denied

    const id = Number(params.id)
    const tenantId = getTenantId(request)
    const entry = db.knowledge.find(e => e.id === id && e.tenantId === tenantId)

    if (!entry)
      return HttpResponse.json({ message: 'Knowledge entry not found' }, { status: 404 })

    const payload = await request.json() as Partial<KnowledgeChunkingSettings> | null

    if (!payload || typeof payload !== 'object') {
      return HttpResponse.json(
        { message: 'Invalid settings payload' },
        { status: 400 },
      )
    }

    const settings = normalizeKnowledgeSettings(payload)

    db.settings[id] = settings

    return HttpResponse.json({ settings })
  }),
]
