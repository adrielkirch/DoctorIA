import type { McpConnection, McpProviderDefinition } from 'contracts/integrations/mcp/types'

export interface McpProviderCardVM {
  id: string
  title: string
  subtitle: string
  trustTier: string
  status: string
  capabilities: string[]
}

export interface McpConnectionCardVM {
  id: string
  title: string
  subtitle: string
  status: string
  healthStatus: string
  lastValidationStatus: string
  lastValidationAt?: string
}

export function mapProviderToCardVM(provider: McpProviderDefinition): McpProviderCardVM {
  return { id: provider.id, title: provider.displayName, subtitle: provider.category, trustTier: provider.trustTier, status: provider.status, capabilities: provider.capabilities }
}

export function mapConnectionToCardVM(connection: McpConnection): McpConnectionCardVM {
  return { id: connection.id, title: connection.displayName, subtitle: connection.providerSlug, status: connection.status, healthStatus: connection.healthStatus, lastValidationStatus: connection.lastValidationStatus, lastValidationAt: connection.lastValidationAt }
}
