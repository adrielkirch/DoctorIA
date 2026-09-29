/**
 * Feature flags — single source of truth.
 *
 * Reads a single Vite env var (`VITE_DISABLE_FEATURE_FLAGS`) holding a
 * comma-separated list of feature keys that must be hidden and blocked.
 *
 * Convention: the feature key IS the route name it gates, e.g.
 *
 *   VITE_DISABLE_FEATURE_FLAGS="ai-assistant,ai-knowledge,pages-misc-under-maintenance"
 *
 * When the variable is empty or missing, every feature stays enabled.
 */

/**
 * Split and normalize the raw env value into a set of disabled feature keys.
 * Surrounding whitespace is trimmed and empty entries are ignored.
 */
export function parseDisabledFeatures(raw: string | undefined | null): Set<string> {
  return new Set(
    (raw ?? '')
      .split(',')
      .map(feature => feature.trim())
      .filter(Boolean),
  )
}

/**
 * Feature keys currently disabled.
 * This is the single source of truth consumed by navigation, search and the
 * router guard.
 */
export const disabledFeatures: ReadonlySet<string> = parseDisabledFeatures(
  import.meta.env.VITE_DISABLE_FEATURE_FLAGS,
)

/** Whether the given feature is enabled. */
export function isFeatureEnabled(feature: string): boolean {
  return !disabledFeatures.has(feature)
}

/** Whether the given feature is disabled. */
export function isFeatureDisabled(feature: string): boolean {
  return disabledFeatures.has(feature)
}

/** List of disabled feature keys (useful for debugging or display). */
export function getDisabledFeatures(): string[] {
  return [...disabledFeatures]
}

/**
 * Extract the route name from a `to`/`url` value.
 * Supports both the shorthand string form (`'ai-assistant'`) and location
 * objects (`{ name: 'ai-assistant' }`). Returns `null` for external hrefs
 * and path-only locations.
 */
export function extractRouteName(location: unknown): string | null {
  if (typeof location === 'string')
    return location

  if (location && typeof location === 'object' && 'name' in location) {
    const name = (location as { name?: unknown }).name

    if (typeof name === 'string')
      return name
  }

  return null
}

/** Whether a route location targets a disabled feature. */
export function isRouteLocationDisabled(location: unknown): boolean {
  const routeName = extractRouteName(location)

  return routeName !== null && isFeatureDisabled(routeName)
}

/**
 * Rotas que HERDAM o feature flag de outro recurso.
 *
 * ℹ️ O recurso `/ai/knowledge` agora tem páginas próprias
 * (`/ai/knowledge/new` e `/ai/knowledge/:id`) com nomes de rota derivados do
 * arquivo (`ai-knowledge-new`, `ai-knowledge-id`). Sem este alias, desabilitar
 * `ai-knowledge` esconderia o menu mas deixaria o deep-link do editor vivo.
 */
export const FEATURE_FLAG_ALIASES: Readonly<Record<string, string>> = {
  'ai-knowledge-id': 'ai-knowledge',
  'ai-knowledge-new': 'ai-knowledge',
}

/**
 * Resolve the feature key that gates a route name — a rota filha pode herdar
 * o flag do recurso pai (`FEATURE_FLAG_ALIASES`).
 */
export function resolveFeatureKey(routeName: string | null | undefined): string | null {
  if (!routeName)
    return null

  return FEATURE_FLAG_ALIASES[routeName] ?? routeName
}

/** Whether a route NAME targets a disabled feature (aliases included). */
export function isRouteNameDisabled(routeName: string | null | undefined): boolean {
  const featureKey = resolveFeatureKey(routeName)

  return featureKey !== null && isFeatureDisabled(featureKey)
}

/**
 * Shape accepted by `filterFeatureFlagNavItems`.
 * Covers Sneat nav items: links (`to`), groups (`children`) and section
 * headings (`heading`).
 */
export interface FeatureFlagNavItemLike {
  to?: unknown
  heading?: string
  children?: FeatureFlagNavItemLike[]
}

/**
 * Recursively filter a nav tree by a `shouldKeep` predicate.
 * Groups with no remaining children are removed; links removed when the
 * predicate is falsy. Used by both feature flags and RBAC nav filtering.
 */
export function filterNavTreeBy<T extends FeatureFlagNavItemLike>(
  items: T[],
  shouldKeep: (item: T) => boolean,
): T[] {
  return items
    .map(item => {
      if (Array.isArray(item.children)) {
        return {
          ...item,
          children: filterNavTreeBy(item.children as T[], shouldKeep),
        }
      }

      return item
    })
    .filter(item => {
      const hasRemainingChildren = !Array.isArray(item.children) || item.children.length > 0

      return hasRemainingChildren && shouldKeep(item)
    })
}

/** Recursively remove links/groups whose target feature is disabled. */
function filterNavTree<T extends FeatureFlagNavItemLike>(items: T[]): T[] {
  return filterNavTreeBy(items, item => !isRouteLocationDisabled(item.to))
}

/** Drop section headings that no longer have any content below them. */
export function pruneEmptyHeadings<T extends FeatureFlagNavItemLike>(items: T[]): T[] {
  const pruned: T[] = []

  for (let index = 0; index < items.length; index++) {
    const item = items[index]

    if (item.heading) {
      const remaining = items.slice(index + 1)
      const nextHeadingIndex = remaining.findIndex(next => next.heading)

      const section = nextHeadingIndex === -1
        ? remaining
        : remaining.slice(0, nextHeadingIndex)

      const hasContent = section.some(next => !next.heading)

      if (hasContent)
        pruned.push(item)
    }
    else {
      pruned.push(item)
    }
  }

  return pruned
}

/**
 * Filter an array of nav items (vertical or horizontal) so that:
 *
 * 1. Items whose `to` targets a disabled feature are removed.
 * 2. Groups that become empty are removed.
 * 3. Section headings left without content are removed.
 */
export function filterFeatureFlagNavItems<T>(items: T[]): T[] {
  return pruneEmptyHeadings(
    filterNavTree(items as FeatureFlagNavItemLike[]),
  ) as T[]
}

/** Ordered candidates used to pick the app home when AI features are disabled. */
const HOME_ROUTE_CANDIDATES = ['ai-assistant', 'ai-knowledge', 'ai-skills', 'integrations'] as const

/**
 * First enabled route among the home candidates.
 * Used as a safe redirect target for disabled routes and as the logged-in
 * landing route. Falls back to the tenant picker when everything is disabled.
 *
 * `can` (opcional) é um predicado RBAC-aware (`route => boolean`) — permite
 * escolher uma home que o usuário REALMENTE pode navegar (um `client` não cai
 * em `not-authorized` ao escolher o workspace).
 */
export function getSafeHomeRoute(can?: (route: string) => boolean): string {
  return HOME_ROUTE_CANDIDATES
    .find(route => isFeatureEnabled(route) && (!can || can(route)))
    ?? 'tenants'
}
