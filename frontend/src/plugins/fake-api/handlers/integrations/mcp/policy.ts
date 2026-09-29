import type { McpCapabilityGrant } from 'contracts/integrations/mcp/types'

/** Returns the explicit allow-list for a principal, or null if no grant record exists (deny-by-default). */
export function resolveGrant(grants: McpCapabilityGrant[], connectionId: string, tenantId: string, principalType: string, principalId: string): string[] | null {
  const grant = grants.find(g => g.connectionId === connectionId && g.tenantId === tenantId && g.principalType === principalType && g.principalId === principalId)

  return grant ? grant.allowedCapabilities : null
}

export function isCapabilityAllowed(grants: McpCapabilityGrant[], connectionId: string, tenantId: string, principalType: string, principalId: string, capability: string): boolean {
  const allowed = resolveGrant(grants, connectionId, tenantId, principalType, principalId)

  return allowed !== null && allowed.includes(capability)
}
