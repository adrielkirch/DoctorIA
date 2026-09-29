


export type SearchSuggestionCategory = 'skill' | 'page' | 'task' | 'user'

export interface SearchSuggestion {
  id: string
  title: string
  description: string
  category: SearchSuggestionCategory
  icon?: string
  href?: string
  keywords?: string[]
}

export interface SearchResult {
  suggestion: SearchSuggestion
  relevance: number
}

export interface WorkspaceSearchResponse {
  query: string
  results: SearchResult[]
  total: number
  appliedDenylist: string[]
}
