/**
 * Access Control — Times (teams): handlers MSW.
 *
 * - `GET    /api/access-control/teams`     → times do tenant (`teams.view`)
 * - `POST   /api/access-control/teams`     → cria (`teams.manage`)
 * - `PATCH  /api/access-control/teams/:id` → atualização parcial (`teams.manage`)
 * - `DELETE /api/access-control/teams/:id` → remove + cascata (`teams.manage`)
 *
 * Multi-tenant: tudo escopado por `getTenantId(request)`; a resposta usa
 * `TeamView` (sem `tenantId`, com `memberCount` derivado). O enforcement real é
 * `authorize()` — a UI é UX.
 *
 * @see .specify/skills/access-control-teams/skill.md
 */
import { authorize } from '@api-utils/authorize'
import { paginateArray } from '@api-utils/paginateArray'
import { getTenantId } from '@api-utils/tenant'
import is from '@sindresorhus/is'
import type {
  CreateTeamPayload,
  TeamView,
  UpdateTeamPayload,
} from 'contracts/access-control/teams/types'
import { destr } from 'destr'
import type { PathParams } from 'msw'
import { HttpResponse, http } from 'msw'
import {
  countMembers,
  createTeam,
  getTeam,
  isTeamNameTaken,
  listTeams,
  removeTeam,
  toTeamView,
  updateTeam,
} from './db'

const INVALID_NAME = { message: 'Team name is required', code: 'INVALID_NAME' }

export const handlerAccessControlTeams = [

  http.get('*/api/access-control/teams', ({ request }) => {
    const denied = authorize(request, 'teams.view')
    if (denied)
      return denied

    const url = new URL(request.url)
    const tenantId = getTenantId(request)

    const q = url.searchParams.get('q')
    const sortBy = url.searchParams.get('sortBy')
    const orderBy = url.searchParams.get('orderBy')
    const itemsPerPage = url.searchParams.get('itemsPerPage')
    const page = url.searchParams.get('page')

    const searchQuery = (is.string(q) ? q : '').trim().toLowerCase()

    const parsedSortBy = destr(sortBy)
    const sortByLocal = is.string(parsedSortBy) ? parsedSortBy : 'name'

    const parsedOrderBy = destr(orderBy)
    const orderByLocal = is.string(parsedOrderBy) ? parsedOrderBy : 'asc'

    const parsedItemsPerPage = destr(itemsPerPage)
    const parsedPage = destr(page)

    const itemsPerPageLocal = is.number(parsedItemsPerPage) ? parsedItemsPerPage : 10
    const pageLocal = is.number(parsedPage) ? parsedPage : 1

    const direction = orderByLocal === 'desc' ? -1 : 1

    let teams = listTeams(tenantId)

    if (searchQuery) {
      teams = teams.filter(
        team =>
          team.name.toLowerCase().includes(searchQuery)
          || (team.description ?? '').toLowerCase().includes(searchQuery),
      )
    }


    teams = [...teams].sort((a, b) => {
      if (sortByLocal === 'members')
        return direction * (countMembers(tenantId, a.id) - countMembers(tenantId, b.id))
      if (sortByLocal === 'createdAt')
        return direction * a.createdAt.localeCompare(b.createdAt)

      return direction * a.name.localeCompare(b.name)
    })

    const totalTeams = teams.length
    const totalPages = Math.ceil(totalTeams / itemsPerPageLocal)


    const teamViews = teams.map(team => toTeamView(team))

    return HttpResponse.json(
      {
        teams: paginateArray(teamViews, itemsPerPageLocal, pageLocal) as TeamView[],
        totalTeams,
        totalPages,


        page: pageLocal > Math.ceil(totalTeams / itemsPerPageLocal) ? 1 : pageLocal,
      },
      { status: 200 },
    )
  }),


  http.post('*/api/access-control/teams', async ({ request }) => {
    const denied = authorize(request, 'teams.manage')
    if (denied)
      return denied

    const tenantId = getTenantId(request)
    const payload = await request.json() as Partial<CreateTeamPayload>
    const name = is.string(payload.name) ? payload.name.trim() : ''

    if (!name)
      return HttpResponse.json(INVALID_NAME, { status: 400 })

    if (isTeamNameTaken(tenantId, name)) {
      return HttpResponse.json(
        { message: `Team '${name}' already exists in this workspace`, code: 'DUPLICATED_TEAM' },
        { status: 400 },
      )
    }

    const team = createTeam(tenantId, {
      name,
      description: is.string(payload.description) ? payload.description : undefined,
      color: is.string(payload.color) ? payload.color : undefined,
    })

    return HttpResponse.json({ team: toTeamView(team) }, { status: 201 })
  }),


  http.patch<PathParams>('*/api/access-control/teams/:id', async ({ request, params }) => {
    const denied = authorize(request, 'teams.manage')
    if (denied)
      return denied

    const tenantId = getTenantId(request)
    const teamId = String(params.id)


    if (!getTeam(tenantId, teamId))
      return HttpResponse.json({ message: 'Team not found' }, { status: 404 })

    const payload = await request.json() as Partial<UpdateTeamPayload>

    if (payload.name !== undefined) {
      const name = is.string(payload.name) ? payload.name.trim() : ''

      if (!name)
        return HttpResponse.json(INVALID_NAME, { status: 400 })

      if (isTeamNameTaken(tenantId, name, teamId)) {
        return HttpResponse.json(
          { message: `Team '${name}' already exists in this workspace`, code: 'DUPLICATED_TEAM' },
          { status: 400 },
        )
      }
    }

    const team = updateTeam(tenantId, teamId, {
      name: is.string(payload.name) ? payload.name : undefined,
      description: is.string(payload.description) ? payload.description : undefined,
      color: is.string(payload.color) ? payload.color : undefined,
    })

    return HttpResponse.json({ team: toTeamView(team!) }, { status: 200 })
  }),


  http.delete<PathParams>('*/api/access-control/teams/:id', ({ request, params }) => {
    const denied = authorize(request, 'teams.manage')
    if (denied)
      return denied

    const removed = removeTeam(getTenantId(request), String(params.id))

    if (!removed)
      return HttpResponse.json({ message: 'Team not found' }, { status: 404 })

    return new HttpResponse(null, { status: 204 })
  }),
]
