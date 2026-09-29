import { $api } from '@/utils/api'
import type { SearchResult, WorkspaceSearchResponse } from 'contracts/workspace/search/types'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'



export type { SearchResult, SearchSuggestion, SearchSuggestionCategory } from 'contracts/workspace/search/types'

export const useSearchStore = defineStore('search', () => {

  const query = ref('')
  const results = ref<SearchResult[]>([])
  const isLoading = ref(false)
  const selectedIndex = ref(-1)


  const hasResults = computed(() => results.value.length > 0)

  const filteredResults = computed(() => {
    return results.value.sort((a, b) => b.relevance - a.relevance)
  })

  const groupedResults = computed(() => {
    const grouped: Record<string, SearchResult[]> = {
      skill: [],
      page: [],
      task: [],
      user: [],
    }

    filteredResults.value.forEach(result => {
      grouped[result.suggestion.category].push(result)
    })

    return Object.entries(grouped)
      .filter(([_, items]) => items.length > 0)
      .map(([category, items]) => ({
        category,
        items: items.slice(0, 5), // Max 5 per category
      }))
  })


  function setQuery(newQuery: string) {
    query.value = newQuery
  }

  async function search(searchQuery: string) {
    if (!searchQuery.trim()) {
      results.value = []
      selectedIndex.value = -1

      return
    }

    setQuery(searchQuery)
    isLoading.value = true
    selectedIndex.value = -1

    try {
      const data = await $api<WorkspaceSearchResponse>('/workspace/search', {
        query: { q: searchQuery },
      })

      results.value = data.results ?? []
    }
    catch (error) {
      console.error('Search error:', error)
      results.value = []
    }
    finally {
      isLoading.value = false
    }
  }

  function clearSearch() {
    query.value = ''
    results.value = []
    selectedIndex.value = -1
  }

  function selectResult(index: number) {
    if (index >= 0 && index < results.value.length)
      selectedIndex.value = index
  }

  function navigateUp() {
    if (selectedIndex.value > 0) {
      selectedIndex.value--
    }
  }

  function navigateDown() {
    if (selectedIndex.value < results.value.length - 1) {
      selectedIndex.value++
    }
  }

  function getSelectedResult() {
    if (selectedIndex.value >= 0 && selectedIndex.value < results.value.length)
      return results.value[selectedIndex.value]

    return null
  }

  return {

    query,
    results,
    isLoading,
    selectedIndex,


    hasResults,
    filteredResults,
    groupedResults,


    setQuery,
    search,
    clearSearch,
    selectResult,
    navigateUp,
    navigateDown,
    getSelectedResult,
  }
})

export type SearchStore = ReturnType<typeof useSearchStore>
