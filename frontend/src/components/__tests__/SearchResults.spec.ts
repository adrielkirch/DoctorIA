import { useSearchStore } from '@/stores/useSearchStore'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SearchResults from '../SearchResults.vue'

const pushMock = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

describe('SearchResults', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    pushMock.mockReset()
  })

  function mountComponent() {
    return mount(SearchResults, {
      global: {
        stubs: {
          VIcon: { template: '<i><slot /></i>' },
          VChip: { template: '<span><slot /></span>' },
          VProgressCircular: { template: '<span>loading</span>' },
        },
      },
    })
  }

  it('renders grouped results when store has matches', async () => {
    const store = useSearchStore()

    store.results = [
      {
        relevance: 80,
        suggestion: {
          id: 'task_1',
          title: 'Create User',
          description: 'Create workspace user',
          category: 'task',
          href: '/users',
          icon: 'bx-user-plus',
        },
      },
      {
        relevance: 60,
        suggestion: {
          id: 'page_1',
          title: 'Users',
          description: 'Workspace users page',
          category: 'page',
          href: '/users',
        },
      },
    ]

    const wrapper = mountComponent()

    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Tasks')
    expect(wrapper.text()).toContain('Pages')
    expect(wrapper.text()).toContain('Create User')
  })

  it('navigates on click and clears search', async () => {
    const store = useSearchStore()

    store.results = [
      {
        relevance: 88,
        suggestion: {
          id: 'task_1',
          title: 'Create User',
          description: 'Create workspace user',
          category: 'task',
          href: '/users',
        },
      },
    ]

    const wrapper = mountComponent()

    await wrapper.find('.search-result-item').trigger('click')

    expect(pushMock).toHaveBeenCalledWith('/users')
    expect(store.query).toBe('')
    expect(store.results).toEqual([])
  })

  it('handles keyboard navigation and enter selection', async () => {
    const store = useSearchStore()

    store.results = [
      {
        relevance: 72,
        suggestion: {
          id: 'task_1',
          title: 'Create User',
          description: 'Create workspace user',
          category: 'task',
          href: '/users',
        },
      },
      {
        relevance: 70,
        suggestion: {
          id: 'task_2',
          title: 'Send Campaign',
          description: 'Send campaign',
          category: 'task',
          href: '/ai/assistant',
        },
      },
    ]

    const wrapper = mountComponent()

    await wrapper.vm.$nextTick()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    expect(store.selectedIndex).toBe(0)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
    expect(store.selectedIndex).toBe(0)

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(pushMock).toHaveBeenCalledWith('/users')
  })

  it('clears search on escape key and removes keydown listener on unmount', async () => {
    const store = useSearchStore()

    store.results = [
      {
        relevance: 64,
        suggestion: {
          id: 'user_1',
          title: 'Admin User',
          description: 'Workspace admin',
          category: 'user',
          href: '/users/1',
        },
      },
    ]

    const wrapper = mountComponent()

    store.query = 'admin'

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(store.query).toBe('')

    wrapper.unmount()

    store.results = [
      {
        relevance: 64,
        suggestion: {
          id: 'user_2',
          title: 'Manager',
          description: 'Workspace manager',
          category: 'user',
          href: '/users/2',
        },
      },
    ]


    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    expect(store.selectedIndex).toBe(-1)
  })
})
