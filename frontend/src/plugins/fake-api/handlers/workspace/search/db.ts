import type { SearchResult, SearchSuggestion } from 'contracts/workspace/search/types'





const workspaceAlphaSuggestions: SearchSuggestion[] = [

  {
    id: 'skill-knowledge',
    title: 'Knowledge Base',
    description: 'Query and manage the AI knowledge base',
    category: 'skill',
    icon: 'bx-book-content',
    href: '/ai/knowledge',
    keywords: ['knowledge', 'kb', 'docs', 'base'],
  },
  {
    id: 'skill-skills',
    title: 'AI Skills',
    description: 'Manage slash-commands and AI instructions',
    category: 'skill',
    icon: 'bx-code-alt',
    href: '/ai/skills',
    keywords: ['skill', 'command', 'prompt', 'instructions'],
  },

  {
    id: 'page-gateway',
    title: 'API Gateway',
    description: 'Configure namespaces, routes and providers',
    category: 'page',
    icon: 'bx-transfer-alt',
    href: '/integrations/gateway',
    keywords: ['gateway', 'api', 'proxy', 'route', 'namespace'],
  },
  {
    id: 'page-mcp',
    title: 'MCP Hub',
    description: 'Connect MCP providers and tools',
    category: 'page',
    icon: 'bx-server',
    href: '/integrations/mcp',
    keywords: ['mcp', 'model context protocol', 'tools', 'provider'],
  },
  {
    id: 'page-credentials',
    title: 'Credentials',
    description: 'Manage secrets and variables',
    category: 'page',
    icon: 'bx-key',
    href: '/security/credentials',
    keywords: ['secret', 'variable', 'key', 'token'],
  },
  {
    id: 'page-roles',
    title: 'Roles & Permissions',
    description: 'Manage workspace access roles',
    category: 'page',
    icon: 'bx-check-shield',
    href: '/access-control/roles',
    keywords: ['role', 'permission', 'access', 'rbac'],
  },
  {
    id: 'page-tenants',
    title: 'Switch workspace',
    description: 'Browse and create workspaces',
    category: 'page',
    icon: 'bx-buildings',
    href: '/tenants',
    keywords: ['tenant', 'workspace', 'company', 'switch'],
  },

  {
    id: 'task-knowledge',
    title: 'Create Knowledge Entry',
    description: 'Add a new entry to the knowledge base',
    category: 'task',
    icon: 'bx-plus-circle',
    href: '/ai/knowledge',
    keywords: ['add', 'new', 'entry', 'create'],
  },
  {
    id: 'task-gateway',
    title: 'Review Gateway Route',
    description: 'Approve a proposed proxy route',
    category: 'task',
    icon: 'bx-check',
    href: '/integrations/gateway',
    keywords: ['approve', 'route', 'review', 'quick-setup'],
  },

  {
    id: 'user-john',
    title: 'John Doe',
    description: 'admin@demo.com · owner',
    category: 'user',
    icon: 'bx-user',
    keywords: ['admin', 'owner', 'john'],
  },
  {
    id: 'user-sarah',
    title: 'Sarah Connor',
    description: 'sarah@acme.com · member',
    category: 'user',
    icon: 'bx-user',
    keywords: ['member', 'sarah'],
  },
]




const workspaceBetaSuggestions: SearchSuggestion[] = [
  {
    id: 'beta-page-gateway-sandbox',
    title: 'Gateway Sandbox',
    description: 'Beta-exclusive gateway test namespace',
    category: 'page',
    icon: 'bx-transfer-alt',
    href: '/integrations/gateway',
    keywords: ['sandbox', 'beta', 'gateway', 'test'],
  },
  {
    id: 'beta-user-globex',
    title: 'Globex Admin',
    description: 'globex@admin.com · owner',
    category: 'user',
    icon: 'bx-user',
    keywords: ['globex', 'admin'],
  },
]

export const suggestionsByTenant: Record<string, SearchSuggestion[]> = {
  'workspace-alpha': workspaceAlphaSuggestions,
  'workspace-beta': workspaceBetaSuggestions,
}



export function searchSuggestions(tenantId: string, query: string): SearchResult[] {
  const q = query.trim().toLowerCase()
  if (!q)
    return []

  const all = suggestionsByTenant[tenantId] ?? []
  const results: SearchResult[] = []

  for (const suggestion of all) {
    let relevance = 0
    if (suggestion.title.toLowerCase().includes(q))
      relevance += 3
    if (suggestion.description.toLowerCase().includes(q))
      relevance += 2
    if (suggestion.keywords?.some(k => k.toLowerCase().includes(q)))
      relevance += 1
    if (relevance > 0)
      results.push({ suggestion, relevance })
  }

  return results.sort((a, b) => b.relevance - a.relevance)
}
