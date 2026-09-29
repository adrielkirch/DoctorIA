import { $api } from '@/utils/api'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSearchStore } from './useSearchStore'

vi.mock('@/utils/api', () => ({
  $api: vi.fn(),
}))

const mockApi = vi.mocked($api)

describe('useSearchStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('initializes with empty query and no results', () => {
    const store = useSearchStore()

    expect(store.query).toBe('')
    expect(store.results).toEqual([])
    expect(store.selectedIndex).toBe(-1)
    expect(store.hasResults).toBe(false)
  })

  it('returns grouped and relevance-sorted results', () => {
    const store = useSearchStore()

    store.results = [
      { relevance: 10, suggestion: { id: '1', title: 'A', description: 'A', category: 'page' } },
      { relevance: 90, suggestion: { id: '2', title: 'B', description: 'B', category: 'task' } },
      { relevance: 40, suggestion: { id: '3', title: 'C', description: 'C', category: 'page' } },
    ]

    expect(store.filteredResults[0].suggestion.id).toBe('2')
    expect(store.groupedResults.find(group => group.category === 'page')?.items.length).toBe(2)
  })

  it('clears state for empty search query', async () => {
    const store = useSearchStore()

    store.results = [
      { relevance: 50, suggestion: { id: 'x', title: 'X', description: 'X', category: 'skill' } },
    ]

    await store.search('   ')

    expect(store.results).toEqual([])
    expect(store.selectedIndex).toBe(-1)
  })

  it('searches API via $api and stores results', async () => {
    const store = useSearchStore()

    mockApi.mockResolvedValue({
      query: 'create user',
      results: [
        { relevance: 88, suggestion: { id: 'task_1', title: 'Create User', description: 'Create account', category: 'task' } },
      ],
      total: 1,
      appliedDenylist: [],
    })

    await store.search('create user')

    expect(mockApi).toHaveBeenCalledWith('/workspace/search', { query: { q: 'create user' } })
    expect(store.query).toBe('create user')
    expect(store.results.length).toBe(1)
    expect(store.isLoading).toBe(false)
  })

  it('handles search API failures gracefully', async () => {
    const store = useSearchStore()

    mockApi.mockRejectedValue(new Error('network fail'))

    await store.search('anything')

    expect(store.results).toEqual([])
    expect(store.isLoading).toBe(false)
  })

  it('supports keyboard selection helpers', () => {
    const store = useSearchStore()

    store.results = [
      { relevance: 20, suggestion: { id: '1', title: 'A', description: 'A', category: 'skill' } },
      { relevance: 10, suggestion: { id: '2', title: 'B', description: 'B', category: 'page' } },
    ]

    store.selectResult(0)
    expect(store.getSelectedResult()?.suggestion.id).toBe('1')

    store.navigateDown()
    expect(store.selectedIndex).toBe(1)

    store.navigateUp()
    expect(store.selectedIndex).toBe(0)

    store.clearSearch()
    expect(store.query).toBe('')
    expect(store.selectedIndex).toBe(-1)
  })
})


describe('useSearchStore - US1 Discovery Filtering', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('filters out frozen modules from search results', async () => {
    const store = useSearchStore()

    mockApi.mockResolvedValue({
      query: 'dashboard',
      results: [
        {
          suggestion: {
            id: 'secrets',
            title: 'Secrets',
            description: 'Configure workspace',
            category: 'page',
            href: '/secrets',
          },
          relevance: 0.9,
        },
      ],
      total: 1,
      appliedDenylist: ['dashboard', 'calendar', 'kanban'],
    })

    await store.search('dashboard')

    expect(store.results.length).toBe(1)
    expect(store.results[0].suggestion.id).toBe('secrets')
  })

  it('returns empty results when query matches only frozen modules', async () => {
    const store = useSearchStore()

    mockApi.mockResolvedValue({
      query: 'kanban',
      results: [],
      total: 0,
      appliedDenylist: ['kanban'],
    })

    await store.search('kanban')

    expect(store.results.length).toBe(0)
    expect(store.hasResults).toBe(false)
  })

  it('respects category limits in grouped results', async () => {
    const store = useSearchStore()

    const mockResults = Array.from({ length: 10 }, (_, i) => ({
      suggestion: {
        id: `skill-${i}`,
        title: `Skill ${i}`,
        description: `Description ${i}`,
        category: 'skill' as const,
        href: `/skills/${i}`,
      },
      relevance: 0.9 - i * 0.05,
    }))

    mockApi.mockResolvedValue({
      query: 'skill',
      results: mockResults,
      total: mockResults.length,
      appliedDenylist: [],
    })

    await store.search('skill')

    const grouped = store.groupedResults

    expect(grouped[0].items.length).toBeLessThanOrEqual(5)
  })
})

