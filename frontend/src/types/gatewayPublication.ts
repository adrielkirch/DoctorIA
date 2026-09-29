export type GatewayEnvironment = 'sandbox' | 'production'
export type GatewayTargetStatus = 'healthy' | 'degraded' | 'offline'
export type GatewayReleaseStatus = 'draft' | 'queued' | 'publishing' | 'published' | 'superseded' | 'rolled_back' | 'failed'

export interface GatewayEnvironmentTarget {
  environment: GatewayEnvironment
  gatewayId: string
  baseUrl: string
  status: GatewayTargetStatus
  activeReleaseId?: string
  lastPublishedAt?: string
}

export interface GatewayRelease {
  id: string
  workspaceId: string
  sourceEnvironment: 'sandbox'
  targetEnvironment: 'production'
  gatewayId: string
  version: string
  status: GatewayReleaseStatus
  routeCount: number
  checksum: string
  createdBy: string
  createdAt: string
  publishedBy?: string
  publishedAt?: string
  rollbackOfReleaseId?: string
  failureCode?: string
}
