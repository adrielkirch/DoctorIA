import { db } from '@db/app-bar-search/db'
import is from '@sindresorhus/is'
import type { SearchResults } from 'contracts/app-bar-search/types'
import { HttpResponse, http } from 'msw'

export const handlerAppBarSearch = [

  http.get('*/api/app-bar/search', ({ request }) => {
    const url = new URL(request.url)

    const q = url.searchParams.get('q') ?? ''
    const searchQuery = is.string(q) ? q : undefined
    const queryLowered = (searchQuery ?? '').toString().toLowerCase()

    const filteredSearchData = [] as SearchResults[]


    if (queryLowered.trim().length === 0) {

      return HttpResponse.json([], { status: 200 })
    }

    db.searchItems.forEach(item => {
      if (item.children) {
        const matchingChildren = item.children.filter(
          child => child.title.toLowerCase().includes(queryLowered),
        )

        if (matchingChildren.length > 0) {
          const parentCopy = { ...item }

          if (matchingChildren.length > 5)
            parentCopy.children = matchingChildren.slice(0, 5)
          else
            parentCopy.children = matchingChildren

          filteredSearchData.push(parentCopy)
        }
      }
    })

    return HttpResponse.json([...filteredSearchData], { status: 200 })
  }),
]
