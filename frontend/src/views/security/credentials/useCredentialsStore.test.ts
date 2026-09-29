import { useCredentialsStore } from '@/views/security/credentials/useCredentialsStore'
import type { CredentialEntry } from 'contracts/security/credentials/types'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiMock = vi.fn()

vi.mock('@/utils/api', () => ({
  $api: (...args: unknown[]) => apiMock(...args),
}))

const seeded: CredentialEntry[] = [
  {
    id: 1,
    tenantId: 'workspace-alpha',
    key: 'APP_REGION',
    type: 'VARIABLE',
    value: 'us-east-1',
    description: 'Region selector',
    updatedAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 2,
    tenantId: 'workspace-alpha',
    key: 'API_TIMEOUT',
    type: 'VARIABLE',
    value: '15s',
    description: 'Timeout value',
    updatedAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 11,
    tenantId: 'workspace-alpha',
    key: 'OPENAI_API_KEY',
    type: 'SECRET',
    maskedValue: '********',
    description: 'Main API key',
    updatedAt: '2026-08-01T10:00:00.000Z',
  },
]

describe('useCredentialsStore search/filter', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    apiMock.mockReset()
  })

  it('returns all records with empty query and all filter', () => {
    const store = useCredentialsStore()

    store.credentials = seeded

    store.searchQuery = ''
    store.activeFilter = 'all'

    expect(store.filteredCredentials).toHaveLength(3)
    expect(store.variables).toHaveLength(2)
    expect(store.secrets).toHaveLength(1)
  })

  it('filters by type for variable and secret tabs', () => {
    const store = useCredentialsStore()

    store.credentials = seeded

    store.activeFilter = 'variable'
    expect(store.filteredCredentials).toHaveLength(2)
    expect(store.secrets).toHaveLength(0)

    store.activeFilter = 'secret'
    expect(store.filteredCredentials).toHaveLength(1)
    expect(store.variables).toHaveLength(0)
  })

  it('combines search and active filter constraints', () => {
    const store = useCredentialsStore()

    store.credentials = seeded

    store.searchQuery = 'api'
    store.activeFilter = 'all'
    expect(store.filteredCredentials.map(item => item.key)).toEqual(['API_TIMEOUT', 'OPENAI_API_KEY'])

    store.activeFilter = 'secret'
    expect(store.filteredCredentials.map(item => item.key)).toEqual(['OPENAI_API_KEY'])

    store.activeFilter = 'variable'
    expect(store.filteredCredentials.map(item => item.key)).toEqual(['API_TIMEOUT'])
  })

  it('creates a variable and updates totals', async () => {
    const store = useCredentialsStore()

    store.credentials = [...seeded]
    store.pagination.total = seeded.length

    apiMock.mockResolvedValueOnce({
      credential: {
        id: 25,
        tenantId: 'workspace-alpha',
        key: 'NEW_VAR',
        type: 'VARIABLE',
        value: 'enabled',
        description: 'created in test',
        updatedAt: '2026-08-01T10:00:00.000Z',
      },
    })

    await store.createVariable({ key: 'NEW_VAR', value: 'enabled' })

    expect(store.credentials.some(item => item.id === 25)).toBe(true)
    expect(store.pagination.total).toBe(seeded.length + 1)
  })

  it('creates a secret and keeps masked projection', async () => {
    const store = useCredentialsStore()

    store.credentials = [...seeded]
    store.pagination.total = seeded.length

    apiMock.mockResolvedValueOnce({
      credential: {
        id: 26,
        tenantId: 'workspace-alpha',
        key: 'SUPABASE_NEW_KEY',
        type: 'SECRET',
        maskedValue: '********',
        description: 'created secret',
        updatedAt: '2026-08-01T10:00:00.000Z',
      },
    })

    await store.createSecret({ key: 'SUPABASE_NEW_KEY', value: 'actual-secret' })

    const created = store.credentials.find(item => item.id === 26)

    expect(created && created.type === 'SECRET' ? created.maskedValue : null).toBe('********')
    expect(store.pagination.total).toBe(seeded.length + 1)
  })

  it('updates a variable in-place', async () => {
    const store = useCredentialsStore()

    store.credentials = [...seeded]

    apiMock.mockResolvedValueOnce({
      credential: {
        ...seeded[0],
        value: 'eu-west-1',
      },
    })

    await store.updateVariable({
      id: 1,
      key: 'APP_REGION',
      value: 'eu-west-1',
    })

    const variable = store.credentials.find(item => item.id === 1)

    expect(variable && 'value' in variable ? variable.value : null).toBe('eu-west-1')
  })

  it('deletes a secret and decrements totals', async () => {
    const store = useCredentialsStore()

    store.credentials = [...seeded]
    store.pagination.total = seeded.length

    apiMock.mockResolvedValueOnce(undefined)

    await store.deleteSecret(11)

    expect(store.credentials.some(item => item.id === 11)).toBe(false)
    expect(store.pagination.total).toBe(seeded.length - 1)
  })
})
