import { ref } from 'vue'










const EXCLUDED_PREFIXES = [
  '/tenants',
  '/auth',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
]

export const lastVisitedPath = ref('')

export function rememberLastVisitedPath(path: string): void {
  if (!path)
    return

  if (EXCLUDED_PREFIXES.some(prefix => path.startsWith(prefix)))
    return

  lastVisitedPath.value = path
}

/**
 * Valida um alvo de redirect do tenant picker.
 * - Rejeita o próprio picker e páginas de auth (nunca voltar para o login —
 *   se vier do login, cai no default home → AI Assistant).
 * - Rejeita open redirect / schemes externos (a query `to` é controlável).
 */
export function isSafeRedirectTarget(target: string): boolean {
  if (!target)
    return false

  if (EXCLUDED_PREFIXES.some(prefix => target.startsWith(prefix)))
    return false

  if (target.startsWith('http://') || target.startsWith('https://') || target.startsWith('//') || target.startsWith('javascript:') || target.startsWith('data:'))
    return false

  return true
}

