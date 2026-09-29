import { getActorGlobalRole } from '@api-utils/actor'
import { getTenantId } from '@api-utils/tenant'
import { buildMyAccess } from '@db/access-control/roles/db'
import type { WorkspaceSearchResponse } from 'contracts/workspace/search/types'
import { HttpResponse, http } from 'msw'
import { searchSuggestions } from './db'

/**
 * Path → feature key do catálogo RBAC. Rotas ausentes (usuários, tenants,
 * profile…) são universais — todo autenticado vê.
 * COESÃO: a busca usa o MESMO contrato do my-access/nav (roles → features).
 */
const HREF_TO_FEATURE: Record<string, string> = {
  '/ai/assistant': 'ai-assistant',
  '/ai/skills': 'ai-skills',
  '/ai/knowledge': 'ai-knowledge',
  '/integrations/mcp': 'integrations-mcp',
  '/integrations/gateway': 'integrations-gateway',
  '/security/credentials': 'security-credentials',
  '/access-control/roles': 'access-control-roles',
  '/access-control/permissions': 'access-control-permissions',
}

export const handlerWorkspaceSearch = [


  http.get('*/api/workspace/search', ({ request }) => {
    const url = new URL(request.url)
    const tenantId = getTenantId(request)
    const q = url.searchParams.get('q') ?? ''

    const roleId = getActorGlobalRole(request, tenantId)
    const accessibleFeatures = buildMyAccess(roleId).features

    const isSuggestionAccessible = (href?: string): boolean => {
      if (!href)
        return true

      const featureKey = HREF_TO_FEATURE[href]


      if (!featureKey)
        return true

      return accessibleFeatures.includes(featureKey)
    }

    const results = searchSuggestions(tenantId, q)
      .filter(result => isSuggestionAccessible(result.suggestion.href))

    return HttpResponse.json<WorkspaceSearchResponse>({
      query: q,
      results,
      total: results.length,
      appliedDenylist: [],
    })
  }),
]
