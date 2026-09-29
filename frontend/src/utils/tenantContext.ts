/**
 * Global tenant-context guard.
 *
 * Rule: tenant-scoped resources must never be reached without an active tenant.
 * Route navigation is already redirected by the router guard
 * (src/plugins/1.router/guards.ts). This utility additionally intercepts API
 * requests at a global level and forces the user back to `/tenants` whenever an
 * authenticated session has no active tenant.
 */

type TenantMissingHandler = () => void

let tenantMissingHandler: TenantMissingHandler | null = null

/**
 * Register the SPA-friendly redirect handler (called once from the router setup
 * to avoid full page reloads). Falls back to `window.location.assign('/tenants')`.
 * Pass `null` to reset (used in tests).
 */
export function setTenantMissingHandler(handler: TenantMissingHandler | null): void {
  tenantMissingHandler = handler
}

export function redirectToTenantPicker(): void {
  if (tenantMissingHandler) {
    tenantMissingHandler()

    return
  }

  if (typeof window !== 'undefined')
    window.location.assign('/tenants')
}

/** Endpoints that are valid without an active tenant context. */
const TENANT_LESS_PATHS = ['/tenants', '/auth/']

export function isTenantScopedPath(rawUrl: string): boolean {
  const path = rawUrl.split('?')[0]

  return !TENANT_LESS_PATHS.some(prefix => path.startsWith(prefix))
}
