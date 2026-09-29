import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { db } from './db'
import { handlerAccessControlUsers } from './index'

const server = setupServer(...handlerAccessControlUsers)
const initialDb = structuredClone(db.users)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  db.users.splice(0, db.users.length, ...structuredClone(initialDb))
})
afterAll(() => server.close())

const BASE = 'http://localhost/api/access-control/users'

/** Token fake no mesmo formato do auth handler (payload `{ id }`). */
function tokenFor(userId: number): string {
  const payload = btoa(JSON.stringify({ id: userId }))

  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.fake-signature`
}

/** Headers padrão de um admin (id 1 — tem users.view/invite/manage). */
function adminHeaders(tenantId = 'workspace-alpha'): Record<string, string> {
  return {
    'x-tenant-id': tenantId,
    'Authorization': `Bearer ${tokenFor(1)}`,
  }
}

describe('handlerAccessControlUsers — tenant isolation', () => {
  it('lista apenas usuários do tenant atual', async () => {
    const alpha = await fetch(BASE, { headers: adminHeaders('workspace-alpha') })
    const alphaBody = await alpha.json()
    expect(alphaBody.totalUsers).toBe(db.users.filter(u => u.tenantId === 'workspace-alpha').length)


    const beta = await fetch(BASE, { headers: adminHeaders('workspace-beta') })
    const betaBody = await beta.json()
    expect(betaBody.users).toHaveLength(0)
  })

  it('DELETE só remove usuário do próprio tenant (cross-tenant = 404)', async () => {
    const alphaUser = db.users.find(u => u.tenantId === 'workspace-alpha')!
    expect(alphaUser).toBeDefined()


    const crossDelete = await fetch(`${BASE}/${alphaUser.id}`, {
      method: 'DELETE',
      headers: adminHeaders('workspace-beta'),
    })
    expect(crossDelete.status).toBe(404)
    expect(db.users.some(u => u.id === alphaUser.id)).toBe(true)


    const ownDelete = await fetch(`${BASE}/${alphaUser.id}`, {
      method: 'DELETE',
      headers: adminHeaders('workspace-alpha'),
    })
    expect(ownDelete.status).toBe(204)
    expect(db.users.find(u => u.id === alphaUser.id)).toBeUndefined()
  })

  it('GET por id não vaza usuário de outro tenant', async () => {
    const alphaUser = db.users.find(u => u.tenantId === 'workspace-alpha')!
    const res = await fetch(`${BASE}/${alphaUser.id}`, {
      headers: adminHeaders('workspace-beta'),
    })
    expect(res.status).toBe(404)
  })

  it('POST cria usuário no tenant do header (não no fallback global)', async () => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...adminHeaders('workspace-beta'),
      },
      body: JSON.stringify({
        fullName: 'Globex Member',
        company: 'Globex Corp',
        role: 'admin',
        username: 'globexmember',
        country: 'Brazil',
        contact: '(999) 000-0000',
        email: 'member@globex.com',
        currentPlan: 'company',
        status: 'active',
        avatar: '',
        billing: 'Manual-Credit Card',
      }),
    })

    expect(res.status).toBe(201)

    const created = db.users.at(-1)
    expect(created?.tenantId).toBe('workspace-beta')
    expect(created?.fullName).toBe('Globex Member')


    const alpha = await fetch(BASE, { headers: adminHeaders('workspace-alpha') })
    const alphaBody = await alpha.json()
    expect(alphaBody.users.some((u: any) => u.email === 'member@globex.com')).toBe(false)
  })

  it('member (sem users.view) recebe 403 — enforcement no backend', async () => {
    const res = await fetch(BASE, {
      headers: {
        'x-tenant-id': 'workspace-alpha',
        'Authorization': `Bearer ${tokenFor(2)}`,
      },
    })

    expect(res.status).toBe(403)
  })
})

describe('handlerAccessControlUsers — PATCH (edição de usuário, G4)', () => {
  it('atualiza role/status do próprio tenant (200 + persistência)', async () => {
    const target = db.users.find(u => u.tenantId === 'workspace-alpha')!

    const res = await fetch(`${BASE}/${target.id}`, {
      method: 'PATCH',
      headers: { ...adminHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'developer', status: 'active' }),
    })

    expect(res.status).toBe(200)

    const body = await res.json()

    expect(body.user.role).toBe('developer')
    expect(body.user.status).toBe('active')
    expect(db.users.find(u => u.id === target.id)?.role).toBe('developer')
  })

  it('cross-tenant → 404 (não edita usuário de outro workspace)', async () => {
    const target = db.users.find(u => u.tenantId === 'workspace-alpha')!

    const res = await fetch(`${BASE}/${target.id}`, {
      method: 'PATCH',
      headers: { ...adminHeaders('workspace-beta'), 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'owner' }),
    })

    expect(res.status).toBe(404)
    expect(db.users.find(u => u.id === target.id)?.role).toBe(target.role)
  })

  it('member (sem users.manage) recebe 403 — enforcement no backend', async () => {
    const target = db.users.find(u => u.tenantId === 'workspace-alpha')!

    const res = await fetch(`${BASE}/${target.id}`, {
      method: 'PATCH',
      headers: { 'x-tenant-id': 'workspace-alpha', 'Authorization': `Bearer ${tokenFor(2)}`, 'content-type': 'application/json' },
      body: JSON.stringify({ role: 'owner' }),
    })

    expect(res.status).toBe(403)
  })
})

describe('handlerAccessControlUsers — time do membro (skill access-control-teams)', () => {
  it('seed tem os DOIS estados e filtra por `teamId=<id>` / `teamId=none`', async () => {
    const withTeam = await fetch(`${BASE}?teamId=team-support&itemsPerPage=100`, { headers: adminHeaders() })
    const withTeamBody = await withTeam.json()

    expect(withTeam.status).toBe(200)
    expect(withTeamBody.totalUsers)
      .toBe(db.users.filter(u => u.tenantId === 'workspace-alpha' && u.teamId === 'team-support').length)
    expect(withTeamBody.totalUsers).toBeGreaterThan(0)
    expect(withTeamBody.users.every((u: { teamId: string }) => u.teamId === 'team-support')).toBe(true)


    const none = await fetch(`${BASE}?teamId=none&itemsPerPage=100`, { headers: adminHeaders() })
    const noneBody = await none.json()

    expect(noneBody.totalUsers)
      .toBe(db.users.filter(u => u.tenantId === 'workspace-alpha' && !u.teamId).length)
    expect(noneBody.totalUsers).toBeGreaterThan(0)
    expect(noneBody.users.every((u: { teamId?: string | null }) => !u.teamId)).toBe(true)


    const seededTeamIds = new Set(db.users
      .map(u => u.teamId)
      .filter((teamId): teamId is string => Boolean(teamId)))
    expect([...seededTeamIds].sort()).toEqual(['team-engineering', 'team-sales', 'team-support'])
  })

  it('PATCH move o membro de time, `null` limpa e time inválido → 400 INVALID_TEAM', async () => {
    const target = db.users.find(u => u.tenantId === 'workspace-alpha' && u.teamId === null)!

    const moved = await fetch(`${BASE}/${target.id}`, {
      method: 'PATCH',
      headers: { ...adminHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ teamId: 'team-sales' }),
    })

    expect(moved.status).toBe(200)
    expect((await moved.json()).user.teamId).toBe('team-sales')
    expect(db.users.find(u => u.id === target.id)?.teamId).toBe('team-sales')

    const cleared = await fetch(`${BASE}/${target.id}`, {
      method: 'PATCH',
      headers: { ...adminHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ teamId: null }),
    })

    expect(cleared.status).toBe(200)
    expect(db.users.find(u => u.id === target.id)?.teamId).toBeNull()

    const invalid = await fetch(`${BASE}/${target.id}`, {
      method: 'PATCH',
      headers: { ...adminHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ teamId: 'team-do-globex' }),
    })

    expect(invalid.status).toBe(400)
    expect((await invalid.json()).code).toBe('INVALID_TEAM')
    expect(db.users.find(u => u.id === target.id)?.teamId).toBeNull()
  })

  it('POST (invite) grava `teamId` e valida contra o tenant do request', async () => {
    const payload = {
      fullName: 'Team Member',
      company: 'Yotz PVT LTD',
      role: 'member',
      username: 'teammember',
      country: 'Brazil',
      contact: '(000) 000-0000',
      email: 'team.member@alpha.com',
      currentPlan: 'team',
      status: 'active',
      avatar: '',
      billing: 'Auto debit',
    }

    const res = await fetch(BASE, {
      method: 'POST',
      headers: { ...adminHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ ...payload, teamId: 'team-engineering' }),
    })

    expect(res.status).toBe(201)
    expect(db.users.find(u => u.email === 'team.member@alpha.com')?.teamId).toBe('team-engineering')


    const crossTenant = await fetch(BASE, {
      method: 'POST',
      headers: { ...adminHeaders('workspace-beta'), 'content-type': 'application/json' },
      body: JSON.stringify({ ...payload, email: 'team.member@beta.com', teamId: 'team-support' }),
    })

    expect(crossTenant.status).toBe(400)
    expect((await crossTenant.json()).code).toBe('INVALID_TEAM')
    expect(db.users.find(u => u.email === 'team.member@beta.com')).toBeUndefined()
  })

  it('convite SEM time é válido (time é opcional) e grava `null`', async () => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { ...adminHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({
        fullName: 'No Team Member',
        company: 'Oozz PVT LTD',
        role: 'member',
        username: 'noteammember',
        country: 'Brazil',
        contact: '(111) 111-1111',
        email: 'no.team@alpha.com',
        currentPlan: 'team',
        status: 'active',
        avatar: '',
        billing: 'Auto debit',
      }),
    })

    expect(res.status).toBe(201)
    expect(db.users.find(u => u.email === 'no.team@alpha.com')?.teamId).toBeNull()
  })
})
