import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { getPermissions } from './db'
import { handlerAccessControlPermissions } from './index'

const server = setupServer(...handlerAccessControlPermissions)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const BASE = 'http://localhost/api/access-control/permissions'

describe('handlerAccessControlPermissions — catálogo granular (Parte 10)', () => {
  it('retorna as 28 permissions granulares do RBAC (global, não tenant-scoped)', async () => {
    const res = await fetch(`${BASE}?itemsPerPage=100`)
    const body = await res.json()

    expect(body.totalPermissions).toBe(getPermissions().length)
    expect(body.totalPermissions).toBe(28)
    expect(body.permissions.map((p: { id: string }) => p.id)).toContain('mcp.view')
    expect(body.permissions.map((p: { id: string }) => p.id)).toContain('gateway.invoke')
    expect(body.permissions.map((p: { id: string }) => p.id)).toContain('credentials.reveal')

    expect(body.permissions.map((p: { id: string }) => p.id)).toContain('teams.view')
    expect(body.permissions.map((p: { id: string }) => p.id)).toContain('teams.manage')

    expect(body.permissions.map((p: { id: string }) => p.id)).not.toContain('payroll')
  })

  it('vincula as permissions às features gated e às roles que as possuem', async () => {
    const res = await fetch(`${BASE}?itemsPerPage=100`)
    const body = await res.json()

    const mcpView = body.permissions.find((p: { id: string }) => p.id === 'mcp.view')
    expect(mcpView.features).toContain('integrations-mcp')
    expect(mcpView.assignedTo).toContain('developer')
    expect(mcpView.assignedTo).toContain('admin')
    expect(mcpView.assignedTo).not.toContain('member')


    const mcpInvoke = body.permissions.find((p: { id: string }) => p.id === 'mcp.invoke')
    expect(mcpInvoke.assignedTo).toContain('member')


    const reveal = body.permissions.find((p: { id: string }) => p.id === 'credentials.reveal')
    expect(reveal.assignedTo).toEqual(expect.arrayContaining(['owner', 'admin']))
    expect(reveal.assignedTo).not.toContain('developer')
  })

  it('filtra por busca (q) no id/resource/action', async () => {
    const res = await fetch(`${BASE}?q=gateway`)
    const body = await res.json()

    expect(body.permissions.length).toBeGreaterThanOrEqual(4)
    expect(body.permissions.every((p: { id: string }) => p.id.startsWith('gateway'))).toBe(true)
  })
})
