import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGatewayPublicationStore } from './useGatewayPublicationStore'
import type { GatewayEnvironmentTarget, GatewayRelease } from '@/types/gatewayPublication'
import { $api } from '@/utils/api'

vi.mock('@/utils/api', () => ({
  $api: vi.fn(),
}))

const mockApi = vi.mocked($api)

function environment(overrides: Partial<GatewayEnvironmentTarget> = {}): GatewayEnvironmentTarget {
  return {
    environment: 'production',
    gatewayId: 'gw-prod-v1-workspace-alpha',
    baseUrl: 'https://gw.doctoria.io/api/gw',
    status: 'healthy',
    ...overrides,
  }
}

function release(overrides: Partial<GatewayRelease> = {}): GatewayRelease {
  return {
    id: 'release-prod-v2-initial',
    workspaceId: 'workspace-alpha',
    sourceEnvironment: 'sandbox',
    targetEnvironment: 'production',
    gatewayId: 'gw-prod-v1-workspace-alpha',
    version: 'v2.0.0',
    status: 'published',
    routeCount: 12,
    checksum: 'sha256:abc123def456',
    createdBy: 'user-1',
    createdAt: '2026-08-20T14:30:00.000Z',
    ...overrides,
  }
}

describe('useGatewayPublicationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('loads environments and releases and derives the active release', async () => {
    const store = useGatewayPublicationStore()

    mockApi.mockResolvedValueOnce({ environments: [environment({ activeReleaseId: 'v1' })] })
    mockApi.mockResolvedValueOnce({ releases: [release({ id: 'v1' })] })

    await store.load()

    expect(mockApi).toHaveBeenNthCalledWith(1, '/integrations/gateway/environments')
    expect(mockApi).toHaveBeenNthCalledWith(2, '/integrations/gateway/releases')
    expect(store.environments).toHaveLength(1)
    expect(store.releases).toHaveLength(1)
    expect(store.activeRelease?.id).toBe('v1')
    expect(store.isLoading).toBe(false)
  })

  it('records the failure message and drops the loading flag', async () => {
    const store = useGatewayPublicationStore()

    mockApi.mockRejectedValue(new Error('boom'))

    await store.load()

    expect(store.error).toBe('boom')
    expect(store.isLoading).toBe(false)
    expect(store.environments).toEqual([])
    expect(store.releases).toEqual([])
  })

  it('creates a release and appends it to the list', async () => {
    const store = useGatewayPublicationStore()

    mockApi.mockResolvedValue({ release: release({ id: 'v2', status: 'draft' }) })

    const created = await store.createRelease(6)

    expect(mockApi).toHaveBeenCalledWith('/integrations/gateway/releases', {
      method: 'POST',
      body: { routeCount: 6 },
    })
    expect(created.id).toBe('v2')
    expect(store.releases.map(item => item.id)).toEqual(['v2'])
  })

  it('publishes a release and points production at it', async () => {
    const store = useGatewayPublicationStore()

    mockApi.mockResolvedValue({ release: release({ id: 'v2', status: 'published' }) })

    store.environments = [environment()]
    store.releases = [release({ id: 'v2', status: 'draft' })]

    await store.publish('v2')

    expect(store.releases[0].status).toBe('published')
    expect(store.productionEnvironment?.activeReleaseId).toBe('v2')
    expect(store.isPublishing).toBe(false)
  })

  it('rolls back to an earlier release', async () => {
    const store = useGatewayPublicationStore()

    mockApi.mockResolvedValue({ release: release({ id: 'v1', status: 'rolled_back' }) })

    store.environments = [environment()]
    store.releases = [
      release({ id: 'v1' }),
      release({ id: 'v2' }),
    ]

    await store.rollback('v1')

    expect(store.releases[0].status).toBe('rolled_back')
    expect(store.productionEnvironment?.activeReleaseId).toBe('v1')
  })

  it('unpublishes production and clears the active release pointer', async () => {
    const store = useGatewayPublicationStore()

    mockApi.mockResolvedValue({ unpublished: true })

    store.environments = [
      environment({ activeReleaseId: 'v1', lastPublishedAt: '2026-09-01T08:00:00.000Z' }),
    ]

    await store.unpublish('Maintenance window')

    expect(store.productionEnvironment?.activeReleaseId).toBeUndefined()
    expect(store.productionEnvironment?.lastPublishedAt).toBeUndefined()
  })

  it('computes candidate and published releases', () => {
    const store = useGatewayPublicationStore()

    store.releases = [
      release({ id: 'v1', status: 'published' }),
      release({ id: 'v2', status: 'draft' }),
      release({ id: 'v3', status: 'failed' }),
    ]

    expect(store.candidateReleases.map(item => item.id)).toEqual(['v2', 'v3'])
    expect(store.publishedReleases.map(item => item.id)).toEqual(['v1'])
  })
})
