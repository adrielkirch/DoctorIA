import { decodeTokenUserId } from '@api-utils/actor'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { handlerAuth } from './index'

const server = setupServer(...handlerAuth)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('handlerAuth — abilities do login', () => {
  it('admin@demo.com retorna userAbilityRules manage all', async () => {
    const res = await fetch('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@demo.com', password: 'admin' }),
    })

    expect(res.status).toBe(200)

    const body = await res.json()


    expect(body.userAbilityRules).toEqual([{ action: 'manage', subject: 'all' }])



    expect(body.userData.role).toBeUndefined()
    expect(body.accessToken).toBeTruthy()




    expect(decodeTokenUserId(body.accessToken)).toBe(1)
  })

  it('client@demo.com retorna userAbilityRules derivadas do catálogo (member: Assistant + públicas)', async () => {
    const res = await fetch('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'client@demo.com', password: 'client' }),
    })

    const body = await res.json()






    expect(body.userAbilityRules).toEqual([
      { action: 'read', subject: 'dashboards-analytics' },
      { action: 'read', subject: 'dashboards-crm' },
      { action: 'read', subject: 'dashboards-ecommerce' },
      { action: 'read', subject: 'sales-chat' },
      { action: 'read', subject: 'sales-contacts' },
      { action: 'read', subject: 'sales-campaigns' },
      { action: 'read', subject: 'ai-assistant' },
      { action: 'read', subject: 'tenants' },
      { action: 'read', subject: 'account' },
      { action: 'read', subject: 'security' },
      { action: 'read', subject: 'billing-plans' },
    ])
    expect(body.userAbilityRules).not.toContainEqual({ action: 'read', subject: 'integrations-gateway' })
    expect(body.userAbilityRules).not.toContainEqual({ action: 'read', subject: 'access-control-roles' })
    expect(body.userAbilityRules).not.toContainEqual({ action: 'read', subject: 'notification' })
    expect(body.userData.role).toBeUndefined()
    expect(decodeTokenUserId(body.accessToken)).toBe(2)
  })
})

describe('handlerAuth — register', () => {
  const newUser = {
    username: 'novousuario',
    email: 'novo@demo.com',
    password: 'senha123',
  }

  it('cria um usuário admin com workspace próprio e retorna sessão', async () => {
    const res = await fetch('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    })

    expect(res.status).toBe(201)

    const body = await res.json()

    expect(body.userAbilityRules).toEqual([{ action: 'manage', subject: 'all' }])
    expect(body.userData.email).toBe(newUser.email)
    expect(body.userData.password).toBeUndefined()
    expect(body.accessToken).toBeTruthy()
    expect(body.memberships).toHaveLength(1)
    expect(body.memberships[0].role).toBe('owner')
    expect(body.currentTenantId).toBe('')
  })

  it('o usuário registrado consegue fazer login em seguida', async () => {
    const res = await fetch('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newUser.email, password: newUser.password }),
    })

    expect(res.status).toBe(200)

    const body = await res.json()

    expect(body.userData.username).toBe('novousuario')
    expect(body.accessToken).toBeTruthy()
  })

  it('rejeita cadastro com email já existente', async () => {
    const res = await fetch('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'duplicado',
        email: 'admin@demo.com',
        password: 'senha123',
      }),
    })

    expect(res.status).toBe(400)

    const body = await res.json()

    expect(body.errors.email).toBeTruthy()
  })

  it('rejeita cadastro com senha curta', async () => {
    const res = await fetch('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'senhacurta',
        email: 'curta@demo.com',
        password: '123',
      }),
    })

    expect(res.status).toBe(400)

    const body = await res.json()

    expect(body.errors.password).toBeTruthy()
  })
})

describe('handlerAuth — forgot password', () => {
  it('responde 200 para um email válido (anti-enumeração)', async () => {
    const res = await fetch('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@demo.com' }),
    })

    expect(res.status).toBe(200)

    const body = await res.json()

    expect(body.message).toBeTruthy()
  })

  it('responde 200 mesmo para email inexistente (não vaza contas)', async () => {
    const res = await fetch('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nao-existe@demo.com' }),
    })

    expect(res.status).toBe(200)
  })

  it('rejeita email inválido/ausente', async () => {
    const res = await fetch('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sem-arroba' }),
    })

    expect(res.status).toBe(400)

    const body = await res.json()

    expect(body.errors.email).toBeTruthy()
  })
})

describe('handlerAuth — reset password', () => {
  it('reseta a senha com o token demo e permite login com a nova senha', async () => {
    const res = await fetch('http://localhost/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'client@demo.com',
        token: 'demo-reset-token',
        password: 'nova-senha-123',
      }),
    })

    expect(res.status).toBe(200)


    const loginRes = await fetch('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'client@demo.com', password: 'nova-senha-123' }),
    })

    expect(loginRes.status).toBe(200)
  })

  it('rejeita token inválido', async () => {
    const res = await fetch('http://localhost/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'token-errado',
        password: 'nova-senha-123',
      }),
    })

    expect(res.status).toBe(400)

    const body = await res.json()

    expect(body.errors.token).toBeTruthy()
  })

  it('rejeita senha curta', async () => {
    const res = await fetch('http://localhost/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'demo-reset-token',
        password: '123',
      }),
    })

    expect(res.status).toBe(400)

    const body = await res.json()

    expect(body.errors.password).toBeTruthy()
  })
})

describe('handlerAuth — two-step verification (2FA)', () => {
  it('valida o código OTP e retorna a sessão', async () => {
    const res = await fetch('http://localhost/api/auth/two-step-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@demo.com', code: '123456' }),
    })

    expect(res.status).toBe(200)

    const body = await res.json()

    expect(body.userData.email).toBe('admin@demo.com')
    expect(body.userAbilityRules).toEqual([{ action: 'manage', subject: 'all' }])
    expect(body.accessToken).toBeTruthy()
  })

  it('rejeita código OTP incorreto', async () => {
    const res = await fetch('http://localhost/api/auth/two-step-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@demo.com', code: '000000' }),
    })

    expect(res.status).toBe(400)

    const body = await res.json()

    expect(body.errors.code).toBeTruthy()
  })

  it('rejeita email sem conta', async () => {
    const res = await fetch('http://localhost/api/auth/two-step-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ghost@demo.com', code: '123456' }),
    })

    expect(res.status).toBe(400)

    const body = await res.json()

    expect(body.errors.email).toBeTruthy()
  })
})
