/**
 * Resolve o tenant atual a partir do header enviado pelo cliente.
 * Prioridade: x-tenant-id → x-workspace-id (compatibilidade) → fallback workspace-alpha.
 */
export function getTenantId(request: Request): string {
  return request.headers.get('x-tenant-id')?.trim()
    || request.headers.get('x-workspace-id')?.trim()
    || 'workspace-alpha'
}
