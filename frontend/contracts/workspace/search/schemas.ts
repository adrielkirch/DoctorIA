import { z } from 'zod'
import { Expect, IsEqual } from '../../_parity'
import type {
  SearchResult,
  SearchSuggestion,
  SearchSuggestionCategory,
  WorkspaceSearchResponse,
} from './types'

export const searchSuggestionCategorySchema = z.enum(['skill', 'page', 'task', 'user'])

export const searchSuggestionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: searchSuggestionCategorySchema,
  icon: z.string().optional(),
  href: z.string().optional(),
  keywords: z.array(z.string()).optional(),
})

export const searchResultSchema = z.object({
  suggestion: searchSuggestionSchema,
  relevance: z.number(),
})

export const workspaceSearchResponseSchema = z.object({
  query: z.string(),
  results: z.array(searchResultSchema),
  total: z.number(),
  appliedDenylist: z.array(z.string()),
})

type _WS1 = Expect<IsEqual<z.infer<typeof searchSuggestionCategorySchema>, SearchSuggestionCategory>>
type _WS2 = Expect<IsEqual<z.infer<typeof searchSuggestionSchema>, SearchSuggestion>>
type _WS3 = Expect<IsEqual<z.infer<typeof searchResultSchema>, SearchResult>>
type _WS4 = Expect<IsEqual<z.infer<typeof workspaceSearchResponseSchema>, WorkspaceSearchResponse>>
