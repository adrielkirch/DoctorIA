import { db } from '@db/security/credentials/db'
import { handlerSecurityCredentials } from '@db/security/credentials/index'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

const server = setupServer(...handlerSecurityCredentials)
const initialDb = structuredClone(db.credentials)

async function parseJson(response: Response): Promise<any> {
  return response.json()
}


/** Token fake (payload { id }) — admin (id 1) tem todas as permissions. */

/** fetch com Authorization de admin (id 1 — tem credentials.view/manage). */
function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init?.headers)
  headers.set('Authorization', `Bearer ${tokenFor(1)}`)
  if (!headers.has('x-tenant-id') && !headers.has('x-workspace-id'))
    headers.set('x-tenant-id', 'workspace-alpha')

  return globalThis.fetch(input, { ...init, headers })
}

function tokenFor(userId: number): string {
  const payload = btoa(JSON.stringify({ id: userId }))

  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}.fake-signature`
}

describe('credentials fake API handlers', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

  afterEach(() => {
    server.resetHandlers()
    db.credentials.splice(0, db.credentials.length, ...structuredClone(initialDb))
  })

  afterAll(() => server.close())

  it('never returns plaintext secret values in GET response', async () => {
    const response = await authFetch('http://localhost/api/security/credentials')
    const body = await parseJson(response)

    expect(Array.isArray(body.credentials)).toBe(true)

    const secrets = body.credentials.filter((item: any) => item.type === 'SECRET')

    for (const secret of secrets) {
      expect(secret.maskedValue).toBeDefined()
      expect(secret.value).toBeUndefined()
    }

    expect(body.credentials.some((item: any) => item.value !== undefined && item.type === 'SECRET')).toBe(false)
  })

  it('supports variable create, variable update, and secret delete contracts', async () => {
    const createResponse = await authFetch('http://localhost/api/security/credentials/variables', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-workspace-id': 'workspace-alpha',
      },
      body: JSON.stringify({
        key: 'APP_NEW_KEY',
        value: 'enabled',
        description: 'new variable',
      }),
    })

    expect(createResponse.status).toBe(201)

    const createBody = await parseJson(createResponse)

    expect(createBody.credential.type).toBe('VARIABLE')
    expect(createBody.credential.value).toBe('enabled')

    const updateResponse = await authFetch(`http://localhost/api/security/credentials/variables/${createBody.credential.id}`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'x-workspace-id': 'workspace-alpha',
      },
      body: JSON.stringify({ value: 'disabled' }),
    })

    expect(updateResponse.status).toBe(200)

    const updateBody = await parseJson(updateResponse)

    expect(updateBody.credential.value).toBe('disabled')

    const secret = db.credentials.find(item => item.type === 'SECRET')

    expect(secret).toBeDefined()

    const deleteResponse = await authFetch(`http://localhost/api/security/credentials/secrets/${secret!.id}`, {
      method: 'DELETE',
      headers: {
        'x-workspace-id': 'workspace-alpha',
      },
    })

    expect(deleteResponse.status).toBe(204)
    expect(db.credentials.find(item => item.id === secret!.id)).toBeUndefined()
  })

  it('creates secrets with password payload and returns masked value only', async () => {
    const response = await authFetch('http://localhost/api/security/credentials/secrets', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-workspace-id': 'workspace-alpha',
      },
      body: JSON.stringify({
        key: 'NEW_SECRET_TOKEN',
        value: 'super-secret-token',
        description: 'secret from create form',
      }),
    })

    expect(response.status).toBe(201)

    const body = await parseJson(response)

    expect(body.credential.type).toBe('SECRET')
    expect(body.credential.maskedValue).toBe('********')
    expect(body.credential.value).toBeUndefined()
  })

  it('blocks cross-tenant read and write operations', async () => {
    const readResponse = await authFetch('http://localhost/api/security/credentials', {
      headers: {
        'x-workspace-id': 'workspace-beta',
      },
    })

    expect(readResponse.status).toBe(200)

    const readBody = await parseJson(readResponse)

    expect(readBody.credentials).toHaveLength(0)

    const secret = db.credentials.find(item => item.type === 'SECRET')

    expect(secret).toBeDefined()

    const deleteResponse = await authFetch(`http://localhost/api/security/credentials/secrets/${secret!.id}`, {
      method: 'DELETE',
      headers: {
        'x-workspace-id': 'workspace-beta',
      },
    })

    expect(deleteResponse.status).toBe(403)

    const variable = db.credentials.find(item => item.type === 'VARIABLE')

    expect(variable).toBeDefined()

    const updateResponse = await authFetch(`http://localhost/api/security/credentials/variables/${variable!.id}`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'x-workspace-id': 'workspace-beta',
      },
      body: JSON.stringify({ value: 'tampered' }),
    })

    expect(updateResponse.status).toBe(403)
  })


  it('DELETE /variables/:id remove (204) e cross-tenant → 403', async () => {
    const variable = db.credentials.find(item => item.type === 'VARIABLE')!
    expect(variable).toBeDefined()


    const beta = await authFetch(`http://localhost/api/security/credentials/variables/${variable.id}`, {
      method: 'DELETE',
      headers: { 'x-workspace-id': 'workspace-beta' },
    })

    expect(beta.status).toBe(403)


    const res = await authFetch(`http://localhost/api/security/credentials/variables/${variable.id}`, {
      method: 'DELETE',
      headers: { 'x-workspace-id': 'workspace-alpha' },
    })

    expect(res.status).toBe(204)
    expect(db.credentials.find(item => item.id === variable.id)).toBeUndefined()
  })

  it('PUT /secrets/:id atualiza key/description sem expor valor (masked)', async () => {
    const secret = db.credentials.find(item => item.type === 'SECRET')!
    expect(secret).toBeDefined()

    const res = await authFetch(`http://localhost/api/security/credentials/secrets/${secret.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'x-workspace-id': 'workspace-alpha' },
      body: JSON.stringify({ key: 'RENAMED_SECRET', description: 'updated via PUT' }),
    })

    expect(res.status).toBe(200)

    const body = await res.json()

    expect(body.credential.key).toBe('RENAMED_SECRET')
    expect(body.credential.description).toBe('updated via PUT')
    expect(body.credential.maskedValue).toBe(secret.maskedValue)
    expect(body.credential.value).toBeUndefined()
  })
})

