import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { db } from './db'
import { handlerAiSkills } from './index'

const server = setupServer(...handlerAiSkills)
const initialDb = structuredClone(db.skills)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  db.skills.splice(0, db.skills.length, ...structuredClone(initialDb))
})
afterAll(() => server.close())

const BASE = 'http://localhost/api/ai/skills'

/** Token fake (payload { id }) — admin (id 1) tem todas as permissions. */
function tokenFor(userId: number): string {
  const payload = btoa(JSON.stringify({ id: userId }))

  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.fake-signature`
}

describe('handlerAiSkills — tenant isolation', () => {
  it('lista apenas skills do tenant atual', async () => {
    const alpha = await fetch(BASE, { headers: { 'x-tenant-id': 'workspace-alpha', 'Authorization': `Bearer ${tokenFor(1)}` } })
    const alphaBody = await alpha.json()

    expect(alphaBody.skills.length).toBe(db.skills.filter(s => s.tenantId === 'workspace-alpha').length)

    const beta = await fetch(BASE, { headers: { 'x-tenant-id': 'workspace-beta', 'Authorization': `Bearer ${tokenFor(1)}` } })
    const betaBody = await beta.json()

    expect(betaBody.skills).toHaveLength(0)
  })

  it('POST cria skill no tenant do header', async () => {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-tenant-id': 'workspace-beta', 'Authorization': `Bearer ${tokenFor(1)}` },
      body: JSON.stringify({
        name: 'Beta Skill',
        command: '/beta-skill',
        category: 'Custom Logic',
        instructions: 'beta instructions',
        color: '#000000',
        icon: 'bx-code-alt',
      }),
    })

    expect(res.status).toBe(201)

    const body = await res.json()

    expect(body.skill.tenantId).toBe('workspace-beta')
  })

  it('PATCH/DELETE não alcançam skill de outro tenant', async () => {
    const alphaSkill = db.skills.find(s => s.tenantId === 'workspace-alpha')!

    expect(alphaSkill).toBeDefined()


    const putRes = await fetch(`${BASE}/${alphaSkill.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', 'x-tenant-id': 'workspace-beta', 'Authorization': `Bearer ${tokenFor(1)}` },
      body: JSON.stringify({ name: 'Tampered' }),
    })

    expect(putRes.status).toBe(404)


    const delRes = await fetch(`${BASE}/${alphaSkill.id}`, {
      method: 'DELETE',
      headers: { 'x-tenant-id': 'workspace-beta', 'Authorization': `Bearer ${tokenFor(1)}` },
    })

    expect(delRes.status).toBe(404)
    expect(db.skills.some(s => s.id === alphaSkill.id)).toBe(true)
  })

  it('busca/filtro por tipo no servidor + paginação (shape canônico)', async () => {

    const custom = await fetch(`${BASE}?type=CUSTOM&page=1&itemsPerPage=2`, { headers: { 'x-tenant-id': 'workspace-alpha', 'Authorization': `Bearer ${tokenFor(1)}` } })
    const customBody = await custom.json()

    expect(customBody.total).toBe(2)
    expect(customBody.totalPages).toBe(1)
    expect(customBody.skills.every((s: any) => s.type === 'CUSTOM')).toBe(true)


    const q = await fetch(`${BASE}?q=epic&page=1&itemsPerPage=12`, { headers: { 'x-tenant-id': 'workspace-alpha', 'Authorization': `Bearer ${tokenFor(1)}` } })
    const qBody = await q.json()

    expect(qBody.total).toBe(1)
    expect(qBody.skills[0].name).toBe('Skill Epic Paper')
    expect(qBody.page).toBe(1)
  })
})
