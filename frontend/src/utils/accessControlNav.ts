/**
 * Filtro de itens de navegação por **acesso RBAC**.
 *
 * Reusa a árvore de feature flags (`filterNavTreeBy` + `pruneEmptyHeadings`)
 * para manter um único algoritmo de filtragem recursiva. O predicado de acesso
 * é injetado pelo chamador (`useAccessControlStore().can`), mantendo este
 * módulo puro e testável.
 *
 * @see .specify/skills/rbac-global-roles/skill.md
 */
import type { FeatureFlagNavItemLike } from '@/config/featureFlags'
import {
    extractRouteName,
    filterNavTreeBy,
    getSafeHomeRoute,
    pruneEmptyHeadings,
} from '@/config/featureFlags'
import { getActiveAbility } from '@/plugins/casl'
import type { RouteLocationNamedRaw } from 'vue-router'

/**
 * Filtro de itens de nav cujo route name não é acessível (`can` falso), poda
 * grupos vazios e headings órfãos.
 */
export function filterAccessibleNavItems<T extends FeatureFlagNavItemLike>(
  items: T[],
  can: (featureKey: string | null) => boolean,
): T[] {
  return pruneEmptyHeadings(
    filterNavTreeBy(items, item => can(extractRouteName(item.to))),
  ) as T[]
}

/**
 * Home acessível ao usuário atual (RBAC-aware). COESÃO: um `client` (ou
 * qualquer role sem home gated) NÃO deve cair em `not-authorized` após
 * escolher o workspace — aterrissa em Account Settings (universal: todo
 * autenticado pode editar o perfil).
 *
 * Retorna `null` sem sessão (o chamador decide o redirect p/ login).
 */
export function resolveAccessibleHomeRoute(): RouteLocationNamedRaw | null {
  if (!useCookie('userData').value)
    return null





  let can: (route: string) => boolean = () => true

  const ability = getActiveAbility()
  if (ability)
    can = routeName => ability.can('read', routeName)

  const safeHome = getSafeHomeRoute(can)

  if (safeHome === 'tenants')
    return { name: 'pages-account-settings-tab', params: { tab: 'account' } }

  return { name: safeHome }
}
