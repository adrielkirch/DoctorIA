const MCP_ERROR_MESSAGES: Record<string, string> = {
  'Failed to load MCP store': 'Failed to load MCP store',
  'Failed to load connected MCP records': 'Failed to load connected MCP records',
  'Failed to connect provider': 'Failed to connect provider',
  'Failed to revalidate connection': 'Failed to revalidate connection',
  'Failed to update capability grants': 'Failed to update capability grants',
  'Failed to publish provider': 'Failed to publish provider',
  'Provider slug already exists': 'Provider slug already exists',
  'Validation failed': 'Validation failed',
  INVALID_CAPABILITY: 'Invalid capability',
  'Connection failed': 'Connection failed',
  'Grant update failed': 'Grant update failed',
}

const MCP_ENUM_LABELS: Record<string, Record<string, string>> = {
  'pages.mcp.trust': { verified: 'Verified', community: 'Community', internal: 'Internal' },
  'pages.mcp.connectionStatus': {
    draft: 'Draft', validating: 'Validating', active: 'Active', failed: 'Failed', paused: 'Paused', retired: 'Retired',
  },
  'pages.mcp.healthStatus': { healthy: 'Healthy', degraded: 'Degraded', unreachable: 'Unreachable' },
}

export function mcpErrorMessage(error: unknown): string {
  const raw = error instanceof Error
    ? error.message
    : typeof error === 'string' ? error : ''

  if (!raw)
    return 'Something went wrong'

  return MCP_ERROR_MESSAGES[raw] ?? 'Something went wrong'
}

export function mcpEnumLabel(
  prefix: string,
  value: string,
): string {
  return MCP_ENUM_LABELS[prefix]?.[value] ?? value
}

