import { $api } from '@/utils/api'
import type { TeamView } from 'contracts/access-control/teams/types'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTeamsStore } from './useTeamsStore'

vi.mock('@/utils/api', () => ({
  $api: vi.fn(),
}))

const mockApi = vi.mocked($api)

const support: TeamView = {
  id: 'team-support',
  name: 'Support',
  description: 'Atendimento',
  color: 'success',
  createdAt: '2026-01-05T09:00:00.000Z',
  memberCount: 4,
}

const sales: TeamView = {
  id: 'team-sales',
  name: 'Sales',
  color: 'info',
  createdAt: '2026-01-06T09:00:00.000Z',
  memberCount: 0,
}

describe('useTeamsStore — catálogo + CRUD (skill access-control-teams)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockApi.mockReset()



    vi.stubGlobal('useCookie', (name: string) => {
      const cookies: Record<string, unknown> = { currentTenantId: 'workspace-alpha' }

      return { value: cookies[name] }
    })
  })

  it('fetchTeams ordena por nome (cards determinísticos) e expõe teamById/teamName', async () => {
    mockApi.mockResolvedValueOnce({ teams: [support, sales], totalTeams: 2, totalPages: 1, page: 1 })

    const store = useTeamsStore()

    await store.fetchTeams()

    expect(store.teams.map(team => team.id)).toEqual(['team-sales', 'team-support'])
    expect(store.totalTeams).toBe(2)
    expect(store.isLoaded).toBe(true)
    expect(store.hasTeams).toBe(true)
    expect(store.teamName('team-support')).toBe('Support')


    expect(store.teamName(null)).toBeNull()
    expect(store.teamName(undefined)).toBeNull()
    expect(store.teamName('team-do-globex')).toBeNull()
  })

  it('erro no fetch não derruba a seção: `error` setado, lista vazia e loading off', async () => {
    mockApi.mockRejectedValueOnce(new Error('boom'))

    const store = useTeamsStore()

    await store.fetchTeams()

    expect(store.error).toBe('boom')
    expect(store.teams).toEqual([])
    expect(store.isLoading).toBe(false)
  })

  it('createTeam faz POST, insere ordenado e devolve o time criado', async () => {
    const created: TeamView = {
      id: 'team-customer-success',
      name: 'Customer Success',
      color: 'warning',
      createdAt: '2026-09-20T12:00:00.000Z',
      memberCount: 0,
    }

    mockApi.mockResolvedValueOnce({ team: created })

    const store = useTeamsStore()

    store.teams = [support]

    const team = await store.createTeam({ name: 'Customer Success', color: 'warning' })

    expect(mockApi).toHaveBeenCalledWith('/access-control/teams', {
      method: 'POST',
      body: { name: 'Customer Success', color: 'warning' },
    })
    expect(team.id).toBe('team-customer-success')
    expect(store.teams.map(item => item.id)).toEqual(['team-customer-success', 'team-support'])
    expect(store.totalTeams).toBe(2)
  })

  it('updateTeam substitui o time no lugar (id imutável) e mantém `memberCount` do servidor', async () => {
    const renamed: TeamView = { ...support, name: 'Suporte', color: 'primary' }

    mockApi.mockResolvedValueOnce({ team: renamed })

    const store = useTeamsStore()

    store.teams = [support, sales]

    await store.updateTeam('team-support', { name: 'Suporte', color: 'primary' })

    expect(mockApi).toHaveBeenCalledWith('/access-control/teams/team-support', {
      method: 'PATCH',
      body: { name: 'Suporte', color: 'primary' },
    })
    expect(store.teamById.get('team-support')?.name).toBe('Suporte')
    expect(store.teamById.get('team-support')?.memberCount).toBe(4)
  })

  it('deleteTeam faz DELETE e recarrega (a cascata dos membros só o servidor conhece)', async () => {
    mockApi
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ teams: [sales], totalTeams: 1, totalPages: 1, page: 1 })

    const store = useTeamsStore()

    store.teams = [support, sales]

    await store.deleteTeam('team-support')

    expect(mockApi).toHaveBeenNthCalledWith(1, '/access-control/teams/team-support', { method: 'DELETE' })
    expect(mockApi.mock.calls[1]?.[0]).toBe('/access-control/teams')
    expect(store.teams.map(team => team.id)).toEqual(['team-sales'])
  })

  it('assignTeam faz PATCH no usuário (`null` = sem time) e recarrega os times', async () => {
    mockApi
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ teams: [support], totalTeams: 1, totalPages: 1, page: 1 })

    const store = useTeamsStore()

    await store.assignTeam(7, 'team-support')

    expect(mockApi).toHaveBeenNthCalledWith(1, '/access-control/users/7', {
      method: 'PATCH',
      body: { teamId: 'team-support' },
    })
    expect(mockApi.mock.calls[1]?.[0]).toBe('/access-control/teams')


    mockApi.mockReset()
    mockApi.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ teams: [], totalTeams: 0, totalPages: 0, page: 1 })

    await store.assignTeam(7, null)

    expect(mockApi).toHaveBeenNthCalledWith(1, '/access-control/users/7', {
      method: 'PATCH',
      body: { teamId: null },
    })
  })
})
