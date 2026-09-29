import { paginateArray } from '@api-utils/paginateArray'
import is from '@sindresorhus/is'
import { destr } from 'destr'
import { HttpResponse, http } from 'msw'
import { getPermissions } from './db'



export const handlerAccessControlPermissions = [

  http.get(('*/api/access-control/permissions'), ({ request }) => {
    const url = new URL(request.url)

    const q = url.searchParams.get('q') || ''
    const sortBy = url.searchParams.get('sortBy')
    const page = url.searchParams.get('page') || 1
    const itemsPerPage = url.searchParams.get('itemsPerPage') || 10
    const orderBy = url.searchParams.get('orderBy')

    const parsedSortBy = destr(sortBy)
    const sortByLocal = is.string(parsedSortBy) ? parsedSortBy : ''

    const parsedOrderBy = destr(orderBy)
    const orderByLocal = is.string(parsedOrderBy) ? parsedOrderBy : ''

    const parsedItemsPerPage = destr(itemsPerPage)
    const parsedPage = destr(page)

    const itemsPerPageLocal = is.number(parsedItemsPerPage) ? parsedItemsPerPage : 10
    const pageLocal = is.number(parsedPage) ? parsedPage : 1

    const queryLower = q.trim().toLowerCase()

    let filteredPermissions = getPermissions().filter(
      permission =>
        !queryLower
        || permission.id.toLowerCase().includes(queryLower)
        || permission.resource.toLowerCase().includes(queryLower)
        || permission.action.toLowerCase().includes(queryLower),
    )


    if (sortByLocal && sortByLocal === 'id') {
      filteredPermissions = filteredPermissions.sort((a, b) => {
        if (orderByLocal === 'asc')
          return a.id.localeCompare(b.id)

        return b.id.localeCompare(a.id)
      })
    }

    return HttpResponse.json(
      {
        permissions: paginateArray(filteredPermissions, itemsPerPageLocal, pageLocal),
        totalPermissions: filteredPermissions.length,
      },
      {
        status: 200,
      },
    )
  }),
]

