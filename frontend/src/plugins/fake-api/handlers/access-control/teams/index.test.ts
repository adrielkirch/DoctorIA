import { db as usersDb } from '@db/access-control/users/db'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { db, listTeams } from './db'
import { handlerAccessControlTeams } from './index'

const server = setupServer(...handlerAccessControlTeams)
const initialTeams = structuredClone(db.teams)
const initialUsers = structuredClone(usersDb.users)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  db.teams.splice(0, db.teams.length, ...structuredClone(initialTeams))
  usersDb.users.splice(0, usersDb.users.length, ...structuredClone(initialUsers))
})
afterAll(() => server.close())

const BASE = 'http://localhost/api/access-control/teams'

/** Token fake no mesmo formato do auth handler (payload `{ id }`). */
function tokenFor(userId: number): string {
  const payload = btoa(JSON.stringify({ id: userId }))

  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.fake-signature`
}

/**
 * Membership do tenant db: id 1 → admin (todas), id 4 → support (só `teams.view`),
 * id 2 → member (nenhuma permission de times).
 */
function headersFor(userId: number, tenantId = 'workspace-alpha'): Record<string, string> {
  return {
    'x-tenant-id': tenantId,
    'Authorization': `Bearer ${tokenFor(userId)}`,
  }
}

const adminHeaders = (tenantId = 'workspace-alpha') => headersFor(1, tenantId)
const supportHeaders = () => headersFor(4)
const memberHeaders = () => headersFor(2)

const jsonHeaders = (userId = 1, tenantId = 'workspace-alpha') => ({
  ...headersFor(userId, tenantId),
  'Content-Type': 'application/json',
})

const membersOf = (teamId: string, tenantId = 'workspace-alpha') =>
  usersDb.users.filter(user => user.tenantId === tenantId && user.teamId === teamId)

describe('handlerAccessControlTeams — catálogo por tenant', () => {
  it('lista os times do tenant, sem `tenantId` e com `memberCount` derivado', async () => {
    const res = await fetch(BASE, { headers: adminHeaders() })

    expect(res.status).toBe(200)

    const body = await res.json()


    expect(body.teams.map((team: { id: string }) => team.id)).toEqual([
      'team-engineering',
      'team-sales',
      'team-support',
    ])
    expect(body.totalTeams).toBe(listTeams('workspace-alpha').length)


    expect(body.teams[0].tenantId).toBeUndefined()


    const support = body.teams.find((team: { id: string }) => team.id === 'team-support')

    expect(support.members).toBeUndefined()
    expect(support.memberCount).toBe(membersOf('team-support').length)
    expect(support.memberCount).toBeGreaterThan(0)
  })

  it('isola por tenant: workspace-beta não vê (nem cria sobre) os times do alpha', async () => {
    const res = await fetch(BASE, { headers: adminHeaders('workspace-beta') })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.totalTeams).toBe(0)
    expect(body.teams).toEqual([])

    const patch = await fetch(`${BASE}/team-support`, {
      method: 'PATCH',
      headers: jsonHeaders(1, 'workspace-beta'),
      body: JSON.stringify({ name: 'Invadido' }),
    })

    expect(patch.status).toBe(404)
  })

  it('busca por nome/descrição via `q`', async () => {
    const res = await fetch(`${BASE}?q=sales`, { headers: adminHeaders() })
    const body = await res.json()

    expect(body.totalTeams).toBe(1)
    expect(body.teams[0].id).toBe('team-sales')
  })

  it('ordena por número de membros (`sortBy=members`)', async () => {
    const res = await fetch(`${BASE}?sortBy=members&orderBy=desc`, { headers: adminHeaders() })
    const body = await res.json()

    const counts = body.teams.map((team: { memberCount: number }) => team.memberCount)

    expect([...counts].sort((a, b) => b - a)).toEqual(counts)
  })
})

describe('handlerAccessControlTeams — CRUD (teams.manage)', () => {
  it('cria time (201) com id `team-<slug>` e memberCount 0', async () => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ name: 'Customer Success', description: 'Pós-venda', color: 'warning' }),
    })

    expect(res.status).toBe(201)

    const body = await res.json()

    expect(body.team).toMatchObject({
      id: 'team-customer-success',
      name: 'Customer Success',
      description: 'Pós-venda',
      color: 'warning',
      memberCount: 0,
    })
    expect(body.team.tenantId).toBeUndefined()
    expect(typeof body.team.createdAt).toBe('string')
    expect(listTeams('workspace-alpha')).toHaveLength(initialTeams.length + 1)
  })

  it('rejeita nome vazio (400) e nome duplicado no tenant (400)', async () => {
    const empty = await fetch(BASE, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ name: '   ' }),
    })

    expect(empty.status).toBe(400)
    expect((await empty.json()).code).toBe('INVALID_NAME')


    const duplicated = await fetch(BASE, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ name: 'support' }),
    })

    expect(duplicated.status).toBe(400)
    expect((await duplicated.json()).code).toBe('DUPLICATED_TEAM')
  })

  it('PATCH é parcial: renomeia sem apagar descrição/cor e mantém o id imutável', async () => {
    const res = await fetch(`${BASE}/team-sales`, {
      method: 'PATCH',
      headers: jsonHeaders(),
      body: JSON.stringify({ name: 'Receita' }),
    })

    expect(res.status).toBe(200)

    const body = await res.json()

    expect(body.team.id).toBe('team-sales')
    expect(body.team.name).toBe('Receita')
    expect(body.team.description).toBe('Operação comercial e novos negócios.')
    expect(body.team.color).toBe('info')
  })

  it('PATCH em time inexistente → 404; nome duplicado → 400', async () => {
    const missing = await fetch(`${BASE}/team-nao-existe`, {
      method: 'PATCH',
      headers: jsonHeaders(),
      body: JSON.stringify({ name: 'X' }),
    })

    expect(missing.status).toBe(404)

    const duplicated = await fetch(`${BASE}/team-sales`, {
      method: 'PATCH',
      headers: jsonHeaders(),
      body: JSON.stringify({ name: 'Support' }),
    })

    expect(duplicated.status).toBe(400)
    expect((await duplicated.json()).code).toBe('DUPLICATED_TEAM')
  })

  it('DELETE remove o time e faz CASCATA: os membros ficam sem time (nunca órfãos)', async () => {
    const removedMembers = membersOf('team-support').length

    expect(removedMembers).toBeGreaterThan(0)

    const res = await fetch(`${BASE}/team-support`, { method: 'DELETE', headers: adminHeaders() })

    expect(res.status).toBe(204)
    expect(listTeams('workspace-alpha').map(team => team.id)).not.toContain('team-support')
    expect(membersOf('team-support')).toHaveLength(0)


    const teamIds = new Set(listTeams('workspace-alpha').map(team => team.id))

    for (const user of usersDb.users.filter(u => u.tenantId === 'workspace-alpha')) {
      if (user.teamId)
        expect(teamIds.has(user.teamId)).toBe(true)
    }


    const withoutTeam = usersDb.users.filter(u => u.tenantId === 'workspace-alpha' && !u.teamId)

    expect(withoutTeam.length).toBeGreaterThanOrEqual(removedMembers)
  })

  it('DELETE em time de outro tenant/inexistente → 404', async () => {
    const res = await fetch(`${BASE}/team-support`, {
      method: 'DELETE',
      headers: adminHeaders('workspace-beta'),
    })

    expect(res.status).toBe(404)
    expect(listTeams('workspace-alpha')).toHaveLength(initialTeams.length)
  })
})

describe('handlerAccessControlTeams — RBAC (deny-by-default)', () => {
  it('support tem `teams.view` (lê) mas NÃO `teams.manage` (403 em criar/editar/remover)', async () => {
    const read = await fetch(BASE, { headers: supportHeaders() })

    expect(read.status).toBe(200)

    const create = await fetch(BASE, {
      method: 'POST',
      headers: jsonHeaders(4),
      body: JSON.stringify({ name: 'Suporte N2' }),
    })

    expect(create.status).toBe(403)

    const patch = await fetch(`${BASE}/team-sales`, {
      method: 'PATCH',
      headers: jsonHeaders(4),
      body: JSON.stringify({ name: 'X' }),
    })

    expect(patch.status).toBe(403)

    const remove = await fetch(`${BASE}/team-sales`, { method: 'DELETE', headers: supportHeaders() })

    expect(remove.status).toBe(403)
  })

  it('member (sem `teams.view`) não lê nem gerencia (403)', async () => {
    const read = await fetch(BASE, { headers: memberHeaders() })

    expect(read.status).toBe(403)

    const create = await fetch(BASE, {
      method: 'POST',
      headers: jsonHeaders(2),
      body: JSON.stringify({ name: 'Time do membro' }),
    })

    expect(create.status).toBe(403)
  })

  it('sem token/tenant → 403 (mínimo privilégio)', async () => {
    const res = await fetch(BASE)

    expect(res.status).toBe(403)
  })
})
