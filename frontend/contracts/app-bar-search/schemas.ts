import { z } from 'zod'
import { Expect, IsEqual } from '../_parity'
import { jsonObjectSchema } from '../types/schemas'
import type { SearchItem, SearchResults } from './types'

export const searchItemSchema = z.object({
  url: jsonObjectSchema,
  icon: z.string(),
  title: z.string(),
})

export const searchResultsSchema = z.object({
  title: z.string(),
  category: z.string(),
  children: z.array(searchItemSchema),
})

type _AS1 = Expect<IsEqual<z.infer<typeof searchItemSchema>, SearchItem>>
type _AS2 = Expect<IsEqual<z.infer<typeof searchResultsSchema>, SearchResults>>
