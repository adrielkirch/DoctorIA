import { authorize } from '@api-utils/authorize'
import { genId } from '@api-utils/genId'
import { paginateArray } from '@api-utils/paginateArray'
import { getTenantId } from '@api-utils/tenant'
import { teamExists } from '@db/access-control/teams/db'
import { db } from '@db/access-control/users/db'
import is from '@sindresorhus/is'
import type { CreateUserPayload, UserProperties } from 'contracts/access-control/users/types'
import { destr } from 'destr'
import type { PathParams } from 'msw'
import { HttpResponse, http } from 'msw'

export const handlerAccessControlUsers = [

  http.get(('*/api/access-control/users'), ({ request }) => {
    const denied = authorize(request, 'users.view')
    if (denied)
      return denied

    const url = new URL(request.url)
    const tenantId = getTenantId(request)

    const q = url.searchParams.get('q')
    const role = url.searchParams.get('role')
    const plan = url.searchParams.get('plan')
    const status = url.searchParams.get('status')
    const teamIdParam = url.searchParams.get('teamId')
    const sortBy = url.searchParams.get('sortBy')
    const itemsPerPage = url.searchParams.get('itemsPerPage')
    const page = url.searchParams.get('page')
    const orderBy = url.searchParams.get('orderBy')

    const searchQuery = is.string(q) ? q : undefined
    const queryLower = (searchQuery ?? '').toString().toLowerCase()

    const parsedSortBy = destr(sortBy)
    const sortByLocal = is.string(parsedSortBy) ? parsedSortBy : ''

    const parsedOrderBy = destr(orderBy)
    const orderByLocal = is.string(parsedOrderBy) ? parsedOrderBy : ''

    const parsedItemsPerPage = destr(itemsPerPage)
    const parsedPage = destr(page)

    const itemsPerPageLocal = is.number(parsedItemsPerPage) ? parsedItemsPerPage : 10
    const pageLocal = is.number(parsedPage) ? parsedPage : 1



    const teamId = is.string(teamIdParam) && teamIdParam !== '' ? teamIdParam : undefined


    let filteredUsers = db.users
      .filter(user => (
        user.tenantId === tenantId
        && (user.fullName.toLowerCase().includes(queryLower) || user.email.toLowerCase().includes(queryLower))
        && user.role === (role || user.role)
        && user.currentPlan === (plan || user.currentPlan)
        && user.status === (status || user.status)
        && (teamId === undefined
          || (teamId === 'none' ? !user.teamId : user.teamId === teamId))
      ))
      .reverse()


    if (sortByLocal) {
      if (sortByLocal === 'user') {
        filteredUsers = filteredUsers.sort((a, b) => {
          if (orderByLocal === 'asc')
            return a.fullName.localeCompare(b.fullName)
          else
            return b.fullName.localeCompare(a.fullName)
        })
      }
      if (sortByLocal === 'email') {
        filteredUsers = filteredUsers.sort((a, b) => {
          if (orderByLocal === 'asc')
            return a.email.localeCompare(b.email)
          else
            return b.email.localeCompare(a.email)
        })
      }
      if (sortByLocal === 'role') {
        filteredUsers = filteredUsers.sort((a, b) => {
          if (orderByLocal === 'asc')
            return a.role.localeCompare(b.role)
          else
            return b.role.localeCompare(a.role)
        })
      }
      if (sortByLocal === 'plan') {
        filteredUsers = filteredUsers.sort((a, b) => {
          if (orderByLocal === 'asc')
            return a.currentPlan.localeCompare(b.currentPlan)
          else
            return b.currentPlan.localeCompare(a.currentPlan)
        })
      }
      if (sortByLocal === 'status') {
        filteredUsers = filteredUsers.sort((a, b) => {
          if (orderByLocal === 'asc')
            return a.status.localeCompare(b.status)
          else
            return b.status.localeCompare(a.status)
        })
      }
      if (sortByLocal === 'billing') {
        filteredUsers = filteredUsers.sort((a, b) => {
          if (orderByLocal === 'asc')
            return a.billing.localeCompare(b.billing)
          else
            return b.billing.localeCompare(a.billing)
        })
      }
    }

    const totalUsers = filteredUsers.length


    const totalPages = Math.ceil(totalUsers / itemsPerPageLocal)

    return HttpResponse.json(
      {
        users: paginateArray(filteredUsers, itemsPerPageLocal, pageLocal),
        totalPages,
        totalUsers,

        page: pageLocal > Math.ceil(totalUsers / itemsPerPageLocal) ? 1 : pageLocal,
      },
      { status: 200 },
    )
  }),


  http.get<PathParams>(('*/api/access-control/users/:id'), ({ request, params }) => {
    const denied = authorize(request, 'users.view')
    if (denied)
      return denied

    const userId = Number(params.id)

    const user = db.users.find(e => e.id === userId && e.tenantId === getTenantId(request))

    if (!user) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 })
    }
    else {
      return HttpResponse.json(
        {
          ...user,
          ...{
            taskDone: 1230,
            projectDone: 568,
            taxId: 'Tax-8894',
            language: 'English',
          },
        },
        { status: 200 },
      )
    }
  }),


  http.delete(('*/api/access-control/users/:id'), ({ request, params }) => {
    const denied = authorize(request, 'users.manage')
    if (denied)
      return denied

    const userId = Number(params.id)

    const userIndex = db.users.findIndex(e => e.id === userId && e.tenantId === getTenantId(request))

    if (userIndex === -1) {
      return HttpResponse.json('User not found', { status: 404 })
    }
    else {
      db.users.splice(userIndex, 1)

      return new HttpResponse(null, {
        status: 204,
      })
    }
  }),


  http.post(('*/api/access-control/users'), async ({ request }) => {
    const denied = authorize(request, 'users.invite')
    if (denied)
      return denied

    const user = await request.json() as CreateUserPayload
    const tenantId = getTenantId(request)



    const teamId = is.string(user.teamId) && user.teamId !== '' ? user.teamId : null

    if (teamId && !teamExists(tenantId, teamId)) {
      return HttpResponse.json(
        { message: `Team '${teamId}' not found in this workspace`, code: 'INVALID_TEAM' },
        { status: 400 },
      )
    }

    db.users.push({
      ...user,
      id: genId(db.users),
      tenantId,
      teamId,
    })

    return HttpResponse.json(
      { body: user },
      { status: 201 },
    )
  }),


  http.patch<PathParams>('*/api/access-control/users/:id', async ({ request, params }) => {
    const denied = authorize(request, 'users.manage')
    if (denied)
      return denied

    const userId = Number(params.id)
    const tenantId = getTenantId(request)
    const user = db.users.find(e => e.id === userId && e.tenantId === tenantId)

    if (!user) {
      return HttpResponse.json({ message: 'User not found' }, { status: 404 })
    }

    const payload = await request.json() as Partial<Pick<UserProperties, 'fullName' | 'email' | 'role' | 'status' | 'teamId'>>

    if (payload.fullName !== undefined)
      user.fullName = payload.fullName
    if (payload.email !== undefined)
      user.email = payload.email
    if (payload.role !== undefined)
      user.role = payload.role
    if (payload.status !== undefined)
      user.status = payload.status




    if (payload.teamId !== undefined) {
      if (payload.teamId === null || payload.teamId === '') {
        user.teamId = null
      }
      else if (!teamExists(tenantId, payload.teamId)) {
        return HttpResponse.json(
          { message: `Team '${payload.teamId}' not found in this workspace`, code: 'INVALID_TEAM' },
          { status: 400 },
        )
      }
      else {
        user.teamId = payload.teamId
      }
    }

    return HttpResponse.json({ user }, { status: 200 })
  }),
]
