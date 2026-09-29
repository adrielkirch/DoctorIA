import { db as knowledgeDb } from '@db/ai/knowledge/db'
import { handlerAiKnowledge } from '@db/ai/knowledge/index'
import { db as skillsDb } from '@db/ai/skills/db'
import { handlerAiSkills } from '@db/ai/skills/index'
import { db as credentialsDb } from '@db/security/credentials/db'
import { setupServer } from 'msw/node'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

const allHandlers = [...handlerAiKnowledge, ...handlerAiSkills]
const server = setupServer(...allHandlers)

const initialKnowledge = structuredClone(knowledgeDb.knowledge)
const initialTags = structuredClone(knowledgeDb.tags)
const initialSkills = structuredClone(skillsDb.skills)

const KNOW = 'http://localhost/api/ai/knowledge'
const SKILLS = 'http://localhost/api/ai/skills'

/** Token fake (payload { id }) — admin (id 1) tem todas as permissions. */
function tokenFor(userId: number): string {
  const payload = btoa(JSON.stringify({ id: userId }))

  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.fake-signature`
}

const HEADERS = { 'content-type': 'application/json', 'x-tenant-id': 'workspace-alpha' ,
  'Authorization': `Bearer ${tokenFor(1)}`,}
const HEADERS_BETA = { ...HEADERS, 'x-tenant-id': 'workspace-beta' ,
  'Authorization': `Bearer ${tokenFor(1)}`,}

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => {
  server.resetHandlers()
  knowledgeDb.knowledge.splice(0, knowledgeDb.knowledge.length, ...structuredClone(initialKnowledge))
  knowledgeDb.tags.splice(0, knowledgeDb.tags.length, ...structuredClone(initialTags))
  skillsDb.skills.splice(0, skillsDb.skills.length, ...structuredClone(initialSkills))
})
afterAll(() => server.close())






describe('knowledge ↔ skills marriage (AI domain)', () => {
  it('cria knowledge + skill no mesmo tenant e ambos respondem coesos', async () => {

    const knRes = await fetch(KNOW, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        title: 'Auth Pattern Guide',
        content: 'How to scope API requests by tenant header.',
        tags: ['auth', 'tenant'],
        sourceType: 'MANUAL',
      }),
    })
    expect(knRes.status).toBe(201)
    const { entry } = await knRes.json()
    expect(entry.linkedSecretName).toBeNull()


    const skRes = await fetch(SKILLS, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        name: 'Auth Reviewer',
        command: '/auth-review',
        category: 'Security',
        instructions: 'Use the Auth Pattern Guide knowledge entry to review tenant scoping.',
        color: '#1A4A8A',
        icon: 'bx-shield-alt-2',
      }),
    })
    expect(skRes.status).toBe(201)
    const { skill } = await skRes.json()


    const knList = await (await fetch(KNOW, { headers: HEADERS })).json()
    expect(knList.knowledge.some((k: any) => k.id === entry.id)).toBe(true)

    const skList = await (await fetch(SKILLS, { headers: HEADERS })).json()
    expect(skList.skills.some((s: any) => s.id === skill.id)).toBe(true)
  })

  it('consistência de tenant: seeds e itens novos ficam isolados por tenant', async () => {

    const alphaKn = await (await fetch(KNOW, { headers: HEADERS })).json()
    expect(alphaKn.knowledge.every((k: any) => k.tenantId === 'workspace-alpha')).toBe(true)

    const betaKn = await (await fetch(KNOW, { headers: HEADERS_BETA })).json()
    expect(betaKn.knowledge.every((k: any) => k.tenantId === 'workspace-beta')).toBe(true)
    expect(betaKn.knowledge.length).toBe(2)


    const betaSk = await (await fetch(SKILLS, { headers: HEADERS_BETA })).json()
    expect(betaSk.skills).toHaveLength(0)


    const created = await fetch(KNOW, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        title: 'Alpha-Only Doc',
        content: 'internal alpha documentation',
        tags: ['alpha'],
        sourceType: 'MANUAL',
      }),
    })
    expect(created.status).toBe(201)
    const { entry } = await created.json()

    const betaAfter = await (await fetch(KNOW, { headers: HEADERS_BETA })).json()
    expect(betaAfter.knowledge.some((k: any) => k.id === entry.id)).toBe(false)
  })

  it('sub-contrato linkedSecretName: knowledge referencia credencial existente (knowledge ↔ credentials)', async () => {
    const linked = knowledgeDb.knowledge.find(k => k.linkedSecretName)
    expect(linked?.linkedSecretName).toBeDefined()


    const key = linked!.linkedSecretName!
    expect(credentialsDb.credentials.some(c => c.key === key && c.type === 'SECRET')).toBe(true)
  })

  it('fronteira de domínio: handlers de IA não importam o db de outro módulo de IA', () => {
    const readSource = (relPath: string) => readFileSync(join(process.cwd(), relPath), 'utf8')
    const knowledgeSrc = readSource('src/plugins/fake-api/handlers/ai/knowledge/index.ts')
    const skillsSrc = readSource('src/plugins/fake-api/handlers/ai/skills/index.ts')
    const inboxSrc = readSource('src/plugins/fake-api/handlers/inbox/index.ts')

    expect(knowledgeSrc).not.toMatch(/from ['"]@db\/ai\/(skills|chat)\/db/)
    expect(skillsSrc).not.toMatch(/from ['"]@db\/ai\/(knowledge|chat)\/db/)
    expect(inboxSrc).not.toMatch(/from ['"]@db\/ai\/(knowledge|skills)\/db/)
  })
})
