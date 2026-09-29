import { $api } from '@/utils/api'
import type { Skill, SkillCreatePayload, SkillListResponse, SkillUpdatePayload } from 'contracts/ai/skills/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useSkillsStore = defineStore('skills', () => {
  const skills = ref<Skill[]>([])
  const searchQuery = ref('')
  const activeFilter = ref<'all' | 'DEFAULT' | 'CUSTOM'>('all')
  const isLoading = ref(false)
  const page = ref(1)
  const itemsPerPage = ref(12)
  const total = ref(0)
  const totalPages = ref(1)



  const filteredSkills = computed(() => skills.value)

  async function fetchSkills(): Promise<void> {
    isLoading.value = true
    try {
      const params = new URLSearchParams()
      if (searchQuery.value.trim())
        params.set('q', searchQuery.value.trim())
      if (activeFilter.value !== 'all')
        params.set('type', activeFilter.value)
      params.set('page', String(page.value))
      params.set('itemsPerPage', String(itemsPerPage.value))

      const response = await $api<SkillListResponse>(`/ai/skills?${params.toString()}`)

      skills.value = response.skills
      total.value = response.total
      totalPages.value = response.totalPages
    }
    finally {
      isLoading.value = false
    }
  }

  async function createSkill(payload: SkillCreatePayload): Promise<Skill> {
    isLoading.value = true
    try {
      const response = await $api<{ skill: Skill }>('/ai/skills', {
        method: 'POST',
        body: payload,
      })

      skills.value.push(response.skill)

      return response.skill
    }
    finally {
      isLoading.value = false
    }
  }

  async function updateSkill(payload: SkillUpdatePayload): Promise<Skill> {
    isLoading.value = true
    try {
      const response = await $api<{ skill: Skill }>(`/ai/skills/${payload.id}`, {
        method: 'PATCH',
        body: payload,
      })

      const index = skills.value.findIndex(s => s.id === payload.id)
      if (index !== -1)
        skills.value[index] = response.skill

      return response.skill
    }
    finally {
      isLoading.value = false
    }
  }

  async function deleteSkill(id: number): Promise<void> {
    isLoading.value = true
    try {
      await $api(`/ai/skills/${id}`, { method: 'DELETE' })

      const index = skills.value.findIndex(s => s.id === id)
      if (index !== -1)
        skills.value.splice(index, 1)
    }
    finally {
      isLoading.value = false
    }
  }

  function isCommandTaken(command: string, excludeId?: number): boolean {
    const normalised = command.toLowerCase().startsWith('/')
      ? command.toLowerCase()
      : `/${command.toLowerCase()}`

    return skills.value.some(
      s => s.command.toLowerCase() === normalised && s.id !== excludeId,
    )
  }

  return {
    skills,
    searchQuery,
    activeFilter,
    isLoading,
    page,
    itemsPerPage,
    total,
    totalPages,
    filteredSkills,
    fetchSkills,
    createSkill,
    updateSkill,
    deleteSkill,
    isCommandTaken,
  }
})

export type SkillsStore = ReturnType<typeof useSkillsStore>
