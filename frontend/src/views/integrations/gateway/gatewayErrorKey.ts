const GATEWAY_ERROR_MESSAGES: Record<string, string> = {
  'Failed to load namespaces': 'Failed to load namespaces',
  'Failed to load routes': 'Failed to load routes',
  'Extraction failed': 'Extraction failed',
  'Failed to load gateway activity': 'Failed to load gateway activity',
  'Failed to create API key': 'Failed to create API key',
  'Failed to revoke API key': 'Failed to revoke API key',
  'Failed to load tool specs': 'Failed to load tool specs',
  'Provisioning failed': 'Provisioning failed',
  'Request failed': 'Request failed',
  'Select a namespace first': 'Select a namespace first',
}

export function gatewayErrorMessage(error: unknown): string {
  const raw = error instanceof Error
    ? error.message
    : typeof error === 'string' ? error : ''

  if (!raw)
    return 'Something went wrong'

  return GATEWAY_ERROR_MESSAGES[raw] ?? 'Something went wrong'
}
