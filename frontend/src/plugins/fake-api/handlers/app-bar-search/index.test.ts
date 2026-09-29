import { handlerAppBarSearch } from '@db/app-bar-search/index'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

const server = setupServer(...handlerAppBarSearch)
const BASE = 'http://localhost/api/app-bar/search'

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('GET /api/app-bar/search', () => {
  it('returns an empty array when there is no query (sem sugestões)', async () => {
    const res = await fetch(BASE)

    expect(res.status).toBe(200)

    const body = await res.json()

    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(0)
  })

  it('filters group children by the search query (title)', async () => {
    const res = await fetch(`${BASE}?q=skills`)

    expect(res.status).toBe(200)

    const body = await res.json() as Array<{ children: Array<{ title: string }> }>

    expect(Array.isArray(body)).toBe(true)


    for (const group of body) {
      expect(group.children.length).toBeGreaterThan(0)

      for (const child of group.children)
        expect(child.title.toLowerCase()).toContain('skills')
    }
  })

  it('returns an empty array when no child matches', async () => {
    const res = await fetch(`${BASE}?q=zzz-inexistente-xyz`)

    expect(res.status).toBe(200)

    const body = await res.json()

    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(0)
  })
})
