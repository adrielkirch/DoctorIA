import type { GatewayEnvironmentTarget, GatewayRelease } from '@/types/gatewayPublication'

const now = new Date().toISOString()

export const environments: GatewayEnvironmentTarget[] = [
  {
    environment: 'sandbox',
    gatewayId: 'gw-sandbox-dev-workspace-alpha',
    baseUrl: 'https://gw-sandbox.doctoria.io/api/gw',
    status: 'healthy',
    activeReleaseId: undefined,
    lastPublishedAt: undefined,
  },
  {
    environment: 'production',
    gatewayId: 'gw-prod-v1-workspace-alpha',
    baseUrl: 'https://gw.doctoria.io/api/gw',
    status: 'healthy',
    activeReleaseId: 'release-prod-v2-initial',
    lastPublishedAt: '2026-09-01T08:00:00.000Z',
  },
]

export const releases: GatewayRelease[] = [
  {
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
    publishedBy: 'user-1',
    publishedAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'release-sandbox-draft-1',
    workspaceId: 'workspace-alpha',
    sourceEnvironment: 'sandbox',
    targetEnvironment: 'production',
    gatewayId: 'gw-sandbox-dev-workspace-alpha',
    version: 'v2.1.0-candidate',
    status: 'draft',
    routeCount: 14,
    checksum: 'sha256:xyz789uvw012',
    createdBy: 'user-1',
    createdAt: now,
  },
]
