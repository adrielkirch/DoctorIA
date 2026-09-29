import type { McpConnectionStatus, McpHealthStatus, McpPrincipalType, McpTrustTier } from 'contracts/integrations/mcp/types'

export const MCP_PAGE_SIZE_DEFAULT = 20
export const MCP_PAGE_SIZE_MAX = 100

export const MCP_TRUST_TIERS: McpTrustTier[] = ['verified', 'community', 'internal']
export const MCP_CONNECTION_STATUSES: McpConnectionStatus[] = ['draft', 'validating', 'active', 'failed', 'paused', 'retired']
export const MCP_HEALTH_STATUSES: McpHealthStatus[] = ['healthy', 'degraded', 'unreachable']
export const MCP_PRINCIPAL_TYPES: McpPrincipalType[] = ['agent', 'role']
