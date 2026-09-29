import type { KnowledgeChunkingSettings } from '@/types/knowledge'
import {
    createDefaultKnowledgeSettings,
    normalizeKnowledgeSettings,
} from '@/types/knowledge'
import { $api } from '@/utils/api'
import { buildChunks } from '@/utils/knowledge/chunkWithSettings'
import { extractFileText } from '@/utils/knowledge/extractFileText'
import type { KnowledgeCreatePayload, KnowledgeEntry, KnowledgeListResponse, KnowledgeUpdatePayload } from 'contracts/ai/knowledge/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useKnowledgeStore = defineStore('knowledge', () => {
  const knowledge = ref<KnowledgeEntry[]>([])
  const availableTags = ref<string[]>([])
  const allTags = ref<string[]>([])
  const searchQuery = ref('')
  const activeTags = ref<string[]>([])
  const isLoading = ref(false)
  const page = ref(1)
  const itemsPerPage = ref(12)
  const total = ref(0)
  const totalPages = ref(1)




  const _pendingText = ref<string | null>(null)
  const _pendingFilename = ref<string | null>(null)


  const chunkingSettings = ref<KnowledgeChunkingSettings>(createDefaultKnowledgeSettings())

  const filteredTags = computed(() => availableTags.value)


  const filteredKnowledge = computed(() => {
    if (!activeTags.value.length)
      return knowledge.value

    return knowledge.value.filter(e =>
      activeTags.value.every(t => e.tags.map(tag => tag.toLowerCase()).includes(t.toLowerCase())),
    )
  })

  async function fetchKnowledge(): Promise<void> {
    isLoading.value = true
    try {
      const params = new URLSearchParams()
      if (searchQuery.value.trim())
        params.set('q', searchQuery.value.trim())



      if (activeTags.value.length)
        params.set('tag', activeTags.value[0].toLowerCase())
      params.set('page', String(page.value))
      params.set('itemsPerPage', String(itemsPerPage.value))

      const qs = params.toString()
      const response = await $api<KnowledgeListResponse>(`/ai/knowledge?${qs}`)

      knowledge.value = response.knowledge
      availableTags.value = response.tags
      total.value = response.total
      totalPages.value = response.totalPages
    }
    finally {
      isLoading.value = false
    }
  }

  /** Carrega uma entrada por id (deep-link da página `/ai/knowledge/:id`). */
  async function fetchKnowledgeById(id: number): Promise<KnowledgeEntry> {
    isLoading.value = true
    try {
      const response = await $api<{ entry: KnowledgeEntry }>(`/ai/knowledge/${id}`)
      const index = knowledge.value.findIndex(e => e.id === id)

      if (index === -1)
        knowledge.value.unshift(response.entry)
      else
        knowledge.value[index] = response.entry

      return response.entry
    }
    finally {
      isLoading.value = false
    }
  }

  async function createKnowledge(payload: KnowledgeCreatePayload): Promise<KnowledgeEntry> {
    isLoading.value = true
    try {
      const response = await $api<{ entry: KnowledgeEntry }>('/ai/knowledge', {
        method: 'POST',
        body: payload,
      })

      knowledge.value.unshift(response.entry)

      return response.entry
    }
    finally {
      isLoading.value = false
    }
  }

  async function updateKnowledge(id: number, payload: KnowledgeUpdatePayload): Promise<KnowledgeEntry> {
    isLoading.value = true
    try {
      const response = await $api<{ entry: KnowledgeEntry }>(`/ai/knowledge/${id}`, {
        method: 'PATCH',
        body: payload,
      })

      const index = knowledge.value.findIndex(e => e.id === id)
      if (index !== -1)
        knowledge.value[index] = response.entry

      return response.entry
    }
    finally {
      isLoading.value = false
    }
  }

  async function deleteKnowledge(id: number): Promise<void> {
    isLoading.value = true
    try {
      await $api(`/ai/knowledge/${id}`, { method: 'DELETE' })

      const index = knowledge.value.findIndex(e => e.id === id)
      if (index !== -1)
        knowledge.value.splice(index, 1)
    }
    finally {
      isLoading.value = false
    }
  }

  async function uploadAndIngest(file: File): Promise<KnowledgeEntry> {
    isLoading.value = true
    try {
      const text = await extractFileText(file)
      const chunks = buildChunks(text, createDefaultKnowledgeSettings())
      const plainText = text.slice(0, 500)

      return await createKnowledge({
        title: file.name,
        content: `<p>${plainText.replace(/\n/g, '</p><p>')}</p>`,
        tags: ['Uploaded'],
        sourceType: 'UPLOADED',
        sourceFilename: file.name,
        chunks,
        linkedSecretName: null,
      })
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Configurações de fragmentação da entrada
   * (`/ai/knowledge/:id/settings`, paridade Dify).
   */
  async function fetchKnowledgeSettings(id: number): Promise<KnowledgeChunkingSettings> {
    try {
      const response = await $api<{ settings: Partial<KnowledgeChunkingSettings> }>(`/ai/knowledge/${id}/settings`)

      chunkingSettings.value = normalizeKnowledgeSettings(response.settings)
    }
    catch {

      chunkingSettings.value = createDefaultKnowledgeSettings()
    }

    return chunkingSettings.value
  }

  async function saveKnowledgeSettings(id: number, payload: KnowledgeChunkingSettings): Promise<KnowledgeChunkingSettings> {
    const response = await $api<{ settings: Partial<KnowledgeChunkingSettings> }>(`/ai/knowledge/${id}/settings`, {
      method: 'PUT',
      body: normalizeKnowledgeSettings(payload),
    })

    chunkingSettings.value = normalizeKnowledgeSettings(response.settings)

    return chunkingSettings.value
  }

  async function fetchAllTags(): Promise<void> {
    try {
      const response = await $api<{ tags: string[] }>('/ai/knowledge/tags')

      allTags.value = response.tags
    }
    catch {
      allTags.value = []
    }
  }

  async function createTag(tag: string): Promise<string> {
    const response = await $api<{ tag: string }>('/ai/knowledge/tags', {
      method: 'POST',
      body: { tag },
    })

    if (!allTags.value.includes(response.tag))
      allTags.value = [...allTags.value, response.tag].sort()

    return response.tag
  }

  return {
    knowledge,
    availableTags,
    allTags,
    searchQuery,
    activeTags,
    isLoading,
    page,
    itemsPerPage,
    total,
    totalPages,
    filteredTags,
    filteredKnowledge,
    chunkingSettings,
    fetchKnowledge,
    fetchKnowledgeById,
    createKnowledge,
    updateKnowledge,
    deleteKnowledge,
    uploadAndIngest,
    fetchKnowledgeSettings,
    saveKnowledgeSettings,
    fetchAllTags,
    createTag,
    _pendingText,
    _pendingFilename,
  }
})

export type KnowledgeStore = ReturnType<typeof useKnowledgeStore>
