import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { buildMyAccess, featureCatalog, permissionCatalog, roleCatalog } from './db'
import { handlerAccessControlRoles } from './index'

const server = setupServer(...handlerAccessControlRoles)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))



const pristinePermissions = structuredClone(roleCatalog.map(role => role.permissions))
beforeEach(() => {
  roleCatalog.forEach((role, index) => {
    role.permissions = structuredClone(pristinePermissions[index])
  })
})

afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const BASE = 'http://localhost/api/access-control'

/** Token fake no mesmo formato do auth handler (payload `{ id }`). */
function tokenFor(userId: number): string {
  const payload = btoa(JSON.stringify({ id: userId }))

  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.fake-signature`
}

describe('handlerAccessControlRoles — catálogo', () => {
  it('GET /roles retorna as 5 roles globais (owner/admin/developer/support/member)', async () => {
    const res = await fetch(`${BASE}/roles`)
    const body = await res.json()

    expect(body.roles.map((r: { id: string }) => r.id)).toEqual([
      'owner',
      'admin',
      'developer',
      'support',
      'member',
    ])
    expect(body.roles.length).toBe(roleCatalog.length)
  })

  it('owner e admin têm as 26 permissions; developer não gerencia users/roles/secrets', async () => {
    const res = await fetch(`${BASE}/roles`)
    const body = await res.json()

    const owner = body.roles.find((r: { id: string }) => r.id === 'owner')
    const admin = body.roles.find((r: { id: string }) => r.id === 'admin')
    const developer = body.roles.find((r: { id: string }) => r.id === 'developer')

    expect(owner.permissions).toHaveLength(permissionCatalog.length)
    expect(admin.permissions).toHaveLength(permissionCatalog.length)


    expect(developer.permissions).toContain('credentials.use')
    expect(developer.permissions).not.toContain('credentials.reveal')
    expect(developer.permissions).not.toContain('credentials.manage')

    expect(developer.permissions).not.toContain('roles.manage')
    expect(developer.permissions).not.toContain('users.manage')
  })

  it('member tem invoke/use mas NÃO view/manage (View ≠ Use ≠ Manage)', async () => {
    const res = await fetch(`${BASE}/roles`)
    const body = await res.json()

    const member = body.roles.find((r: { id: string }) => r.id === 'member')

    expect(member.permissions).toContain('mcp.invoke')
    expect(member.permissions).not.toContain('mcp.view')
    expect(member.permissions).not.toContain('mcp.manage')

    expect(member.permissions).toContain('gateway.invoke')
    expect(member.permissions).not.toContain('gateway.view')

    expect(member.permissions).toContain('ai.assistant.use')
    expect(member.permissions).not.toContain('ai.assistant.view')
  })

  it('GET /features retorna o catálogo com permission mapeada', async () => {
    const res = await fetch(`${BASE}/features`)
    const body = await res.json()

    expect(body.features.length).toBe(featureCatalog.length)

    const gatewayFeature = body.features.find((f: { key: string }) => f.key === 'integrations-gateway')
    expect(gatewayFeature.permission).toBe('gateway.view')

    const accountTab = body.features.find((f: { key: string }) => f.key === 'account')
    expect(accountTab.permission).toBe('public')
  })

  it('PATCH /roles/:id persiste as permissions da role (in-memory)', async () => {
    const res = await fetch(`${BASE}/roles/support`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-tenant-id': 'workspace-alpha',
        'Authorization': `Bearer ${tokenFor(1)}`,
      },
      body: JSON.stringify({
        permissions: ['users.view', 'gateway.logs.view'],
      }),
    })

    expect(res.status).toBe(200)

    const { role } = await res.json()
    expect(role.permissions).toEqual(['users.view', 'gateway.logs.view'])


    const list = await fetch(`${BASE}/roles`)
    const body = await list.json()
    const support = body.roles.find((r: { id: string }) => r.id === 'support')
    expect(support.permissions).toHaveLength(2)
  })

  it('PATCH ignora ids inválidos, retorna 404 para role inexistente e 403 sem roles.manage', async () => {
    const invalid = await fetch(`${BASE}/roles/support`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-tenant-id': 'workspace-alpha',
        'Authorization': `Bearer ${tokenFor(1)}`,
      },
      body: JSON.stringify({ permissions: ['nao-existe', 'gateway.view'] }),
    })
    const body = await invalid.json()
    expect(body.role.permissions).toEqual(['gateway.view'])

    const ghost = await fetch(`${BASE}/roles/ghost-role`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-tenant-id': 'workspace-alpha',
        'Authorization': `Bearer ${tokenFor(1)}`,
      },
      body: JSON.stringify({ permissions: [] }),
    })
    expect(ghost.status).toBe(404)


    const forbidden = await fetch(`${BASE}/roles/support`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'x-tenant-id': 'workspace-alpha',
        'Authorization': `Bearer ${tokenFor(2)}`,
      },
      body: JSON.stringify({ permissions: ['users.view'] }),
    })
    expect(forbidden.status).toBe(403)
  })
})


describe('handlerAccessControlRoles — my-access', () => {
  it('owner tem todas as permissions e as features completas', async () => {
    const res = await fetch(`${BASE}/my-access`, {
      headers: {
        'x-tenant-id': 'workspace-alpha',
        'Authorization': `Bearer ${tokenFor(8)}`,
      },
    })
    const access = await res.json()

    expect(access.role).toBe('owner')
    expect(access.permissions).toHaveLength(permissionCatalog.length)
    expect(access.permissions).toContain('roles.manage')
    expect(access.features).toContain('access-control-roles')
    expect(access.features).toContain('integrations-gateway')
    expect(access.gatewayRole).toBe('ADMIN')
  })

  it('admin tem a MESMA role nos dois tenants e acesso completo', async () => {
    const alpha = await (await fetch(`${BASE}/my-access`, {
      headers: {
        'x-tenant-id': 'workspace-alpha',
        'Authorization': `Bearer ${tokenFor(1)}`,
      },
    })).json()
    const beta = await (await fetch(`${BASE}/my-access`, {
      headers: {
        'x-tenant-id': 'workspace-beta',
        'Authorization': `Bearer ${tokenFor(1)}`,
      },
    })).json()

    expect(alpha.role).toBe('admin')
    expect(beta.role).toBe('admin')
    expect(alpha.permissions).toHaveLength(permissionCatalog.length)
    expect(alpha.features).toContain('access-control-roles')
    expect(alpha.gatewayRole).toBe('ADMIN')
  })

  it('developer usa MCP/Gateway/Credentials mas NÃO abre páginas de config sensíveis', async () => {
    const res = await fetch(`${BASE}/my-access`, {
      headers: {
        'x-tenant-id': 'workspace-alpha',
        'Authorization': `Bearer ${tokenFor(3)}`,
      },
    })
    const access = await res.json()

    expect(access.role).toBe('developer')
    expect(access.permissions).toContain('mcp.manage')
    expect(access.permissions).toContain('gateway.invoke')
    expect(access.permissions).toContain('credentials.use')
    expect(access.permissions).not.toContain('credentials.reveal')
    expect(access.features).toContain('integrations-gateway')
    expect(access.features).toContain('ai-assistant')

    expect(access.features).not.toContain('security-credentials')
    expect(access.features).not.toContain('access-control-roles')
    expect(access.gatewayRole).toBe('USER')
  })

  it('support vê users/gateway/assistant/knowledge (view), sem administração', async () => {
    const res = await fetch(`${BASE}/my-access`, {
      headers: {
        'x-tenant-id': 'workspace-alpha',
        'Authorization': `Bearer ${tokenFor(4)}`,
      },
    })
    const access = await res.json()

    expect(access.role).toBe('support')
    expect(access.permissions).toContain('users.view')
    expect(access.permissions).toContain('gateway.view')
    expect(access.permissions).not.toContain('gateway.manage')
    expect(access.permissions).not.toContain('roles.manage')

    expect(access.features).toContain('access-control-roles')
    expect(access.features).toContain('ai-assistant')
  })

  it('member (client demo) usa MCP/Gateway via Assistant sem ver configuração', async () => {
    const res = await fetch(`${BASE}/my-access`, {
      headers: {
        'x-tenant-id': 'workspace-alpha',
        'Authorization': `Bearer ${tokenFor(2)}`,
      },
    })
    const access = await res.json()

    expect(access.role).toBe('member')
    expect(access.permissions).toContain('ai.assistant.use')
    expect(access.permissions).toContain('mcp.invoke')
    expect(access.permissions).not.toContain('mcp.view')
    expect(access.permissions).not.toContain('gateway.view')
    expect(access.features).toContain('ai-assistant')
    expect(access.features).toContain('sales-chat')
    expect(access.features).toContain('tenants')
    expect(access.features).not.toContain('integrations-mcp')
    expect(access.features).not.toContain('integrations-gateway')
    expect(access.features).not.toContain('access-control-roles')
    expect(access.gatewayRole).toBe('USER')
  })

  it('sem token → mínimo privilégio (member)', async () => {
    const res = await fetch(`${BASE}/my-access`, {
      headers: { 'x-tenant-id': 'workspace-alpha' },
    })
    const access = await res.json()

    expect(access.role).toBe('member')
    expect(access.permissions).not.toContain('roles.manage')
  })
})

describe('buildMyAccess — resolutor da fake-api', () => {
  it('developer usa MCP/Gateway mas não gerencia credenciais', () => {
    const access = buildMyAccess('developer')

    expect(access.permissions).toContain('mcp.manage')
    expect(access.permissions).toContain('gateway.logs.view')
    expect(access.permissions).not.toContain('credentials.reveal')
    expect(access.features).toContain('integrations-gateway')
    expect(access.features).toContain('ai-assistant')
    expect(access.features).not.toContain('security-credentials')
    expect(access.gatewayRole).toBe('USER')
  })

  it('member não tem NENHUMA permission administrativa', () => {
    const access = buildMyAccess('member')

    expect(access.permissions).toEqual([
      'ai.assistant.use',
      'ai.skills.use',
      'ai.knowledge.use',
      'mcp.invoke',
      'gateway.invoke',
    ])
    expect(access.permissions).not.toContain('roles.view')
  })
})
