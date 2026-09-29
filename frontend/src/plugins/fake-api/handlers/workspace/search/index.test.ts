import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { handlerWorkspaceSearch } from './index'

const server = setupServer(...handlerWorkspaceSearch)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const BASE = 'http://localhost/api/workspace/search'

/** Token fake no mesmo formato do auth handler (payload `{ id }`). */
function tokenFor(userId: number): string {
  const payload = btoa(JSON.stringify({ id: userId }))

  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.fake-signature`
}



const HEADERS_OWNER = { 'x-tenant-id': 'workspace-alpha', 'Authorization': `Bearer ${tokenFor(1)}` }
const HEADERS_CLIENT = { 'x-tenant-id': 'workspace-alpha', 'Authorization': `Bearer ${tokenFor(2)}` }
const HEADERS_DEVELOPER = { 'x-tenant-id': 'workspace-alpha', 'Authorization': `Bearer ${tokenFor(3)}` }
const HEADERS_SUPPORT = { 'x-tenant-id': 'workspace-alpha', 'Authorization': `Bearer ${tokenFor(4)}` }

describe('handlerWorkspaceSearch', () => {
  it('owner busca por título: gateway visível (feature acessível)', async () => {
    const res = await fetch(`${BASE}?q=gateway`, { headers: HEADERS_OWNER })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.results.length).toBeGreaterThan(0)
    expect(body.results[0].suggestion.title).toBe('API Gateway')
    expect(body.total).toBe(body.results.length)
  })

  it('client busca "gateway"/"roles": resultados feature-gated escondidos', async () => {
    const gatewayRes = await fetch(`${BASE}?q=gateway`, { headers: HEADERS_CLIENT })
    const gatewayBody = await gatewayRes.json()
    expect(gatewayBody.results).toEqual([])

    const rolesRes = await fetch(`${BASE}?q=roles`, { headers: HEADERS_CLIENT })
    const rolesBody = await rolesRes.json()
    expect(rolesBody.results).toEqual([])
  })

  it('client ainda vê rotas universais (switch workspace)', async () => {
    const res = await fetch(`${BASE}?q=workspace`, { headers: HEADERS_CLIENT })
    const body = await res.json()

    expect(body.results.length).toBeGreaterThan(0)
    expect(body.results[0].suggestion.href).toBe('/tenants')
  })

  it('query vazia retorna lista vazia', async () => {
    const res = await fetch(`${BASE}?q=`, { headers: HEADERS_OWNER })
    const body = await res.json()
    expect(body.results).toEqual([])
  })

  it('MATRIZ developer: vê gateway/mcp (view) mas NÃO roles/credentials (sem view)', async () => {
    const gateway = await (await fetch(`${BASE}?q=gateway`, { headers: HEADERS_DEVELOPER })).json()
    const gatewayTitles = (gateway.results as Array<{ suggestion: { title: string } }>).map(r => r.suggestion.title)
    expect(gatewayTitles).toContain('API Gateway')

    const mcp = await (await fetch(`${BASE}?q=mcp`, { headers: HEADERS_DEVELOPER })).json()
    expect((mcp.results as unknown[]).length).toBeGreaterThan(0)



    const creds = await (await fetch(`${BASE}?q=credentials`, { headers: HEADERS_DEVELOPER })).json()
    expect((creds.results as unknown[])).toEqual([])

    const roles = await (await fetch(`${BASE}?q=roles`, { headers: HEADERS_DEVELOPER })).json()
    expect((roles.results as unknown[])).toEqual([])
  })

  it('MATRIZ support: vê gateway/roles/knowledge (view) mas NÃO mcp/credentials', async () => {
    const gateway = await (await fetch(`${BASE}?q=gateway`, { headers: HEADERS_SUPPORT })).json()
    expect(gateway.results.length).toBeGreaterThan(0)

    const roles = await (await fetch(`${BASE}?q=roles`, { headers: HEADERS_SUPPORT })).json()
    expect(roles.results.length).toBeGreaterThan(0)

    const mcp = await (await fetch(`${BASE}?q=mcp`, { headers: HEADERS_SUPPORT })).json()
    expect(mcp.results).toEqual([])

    const creds = await (await fetch(`${BASE}?q=credentials`, { headers: HEADERS_SUPPORT })).json()
    expect(creds.results).toEqual([])


    const knowledge = await (await fetch(`${BASE}?q=knowledge`, { headers: HEADERS_SUPPORT })).json()
    expect(knowledge.results.length).toBeGreaterThan(0)
  })

  it('MATRIZ client: NÃO vê conteúdo de ops nem AI, mas vê rotas universais', async () => {
    const knowledge = await (await fetch(`${BASE}?q=knowledge`, { headers: HEADERS_CLIENT })).json()
    expect(knowledge.results).toEqual([])

    const john = await (await fetch(`${BASE}?q=john`, { headers: HEADERS_CLIENT })).json()
    expect(john.results.length).toBeGreaterThan(0)
  })

  it('isola tenants: item do beta não aparece no alpha', async () => {
    const alphaRes = await fetch(`${BASE}?q=sandbox`, { headers: HEADERS_OWNER })
    const alphaBody = await alphaRes.json()
    expect(alphaBody.results).toEqual([])

    const betaRes = await fetch(`${BASE}?q=sandbox`, {
      headers: { 'x-tenant-id': 'workspace-beta', 'Authorization': `Bearer ${tokenFor(1)}` },
    })
    const betaBody = await betaRes.json()
    expect(betaBody.results.length).toBe(1)
    expect(betaBody.results[0].suggestion.title).toBe('Gateway Sandbox')
  })
})
