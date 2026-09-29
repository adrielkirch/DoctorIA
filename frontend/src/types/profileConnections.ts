export type ConnectionProvider = 'github' | 'gitlab'

export interface ProfileConnectionProvider {
  id: ConnectionProvider
  name: string
  description: string
  icon: string
  availableScopes: string[]
}

export interface ProfileConnection {
  id: string
  provider: ConnectionProvider
  accountName: string
  accountLogin: string
  avatarUrl?: string
  scopes: string[]
  repositoryScope: 'all' | 'selected'
  health: 'healthy' | 'degraded' | 'unreachable'
  lastValidatedAt?: string
  lastError?: string
}

export interface ProfileConnectionsPayload {
  scopes: string[]
  repositoryScope: 'all' | 'selected'
}
