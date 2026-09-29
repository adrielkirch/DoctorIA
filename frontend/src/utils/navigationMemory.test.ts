import { describe, expect, it, beforeEach } from 'vitest'
import { isSafeRedirectTarget, lastVisitedPath, rememberLastVisitedPath } from './navigationMemory'

describe('navigationMemory', () => {
  beforeEach(() => {
    lastVisitedPath.value = ''
  })

  it('recorda rotas tenant-scoped', () => {
    rememberLastVisitedPath('/ai/skills')
    expect(lastVisitedPath.value).toBe('/ai/skills')
  })

  it('preserva query string', () => {
    rememberLastVisitedPath('/access-control/roles?tab=permissions')
    expect(lastVisitedPath.value).toBe('/access-control/roles?tab=permissions')
  })

  it('ignora o próprio picker, /auth e as páginas de auth top-level', () => {
    rememberLastVisitedPath('/tenants')
    rememberLastVisitedPath('/auth/login')
    rememberLastVisitedPath('/login')
    rememberLastVisitedPath('/register')
    rememberLastVisitedPath('/forgot-password')
    expect(lastVisitedPath.value).toBe('')
  })

  it('ignora caminho vazio', () => {
    rememberLastVisitedPath('')
    expect(lastVisitedPath.value).toBe('')
  })
})

describe('isSafeRedirectTarget (anti-loop do tenant picker)', () => {
  it('aceita rotas internas tenant-scoped', () => {
    expect(isSafeRedirectTarget('/ai/skills')).toBe(true)
    expect(isSafeRedirectTarget('/integrations/gateway')).toBe(true)
    expect(isSafeRedirectTarget('/')).toBe(true)
  })

  it('bloqueia login/auth e o próprio picker (nunca voltar ao login)', () => {
    expect(isSafeRedirectTarget('/tenants')).toBe(false)
    expect(isSafeRedirectTarget('/auth/login')).toBe(false)
    expect(isSafeRedirectTarget('/login')).toBe(false)
    expect(isSafeRedirectTarget('/register')).toBe(false)
    expect(isSafeRedirectTarget('/forgot-password')).toBe(false)
  })

  it('bloqueia open redirect e schemes externos', () => {
    expect(isSafeRedirectTarget('https://evil.com')).toBe(false)
    expect(isSafeRedirectTarget('http://evil.com')).toBe(false)
    expect(isSafeRedirectTarget('//evil.com')).toBe(false)
    expect(isSafeRedirectTarget('javascript:alert(1)')).toBe(false)
    expect(isSafeRedirectTarget('data:text/html,x')).toBe(false)
  })

  it('bloqueia vazio', () => {
    expect(isSafeRedirectTarget('')).toBe(false)
  })
})
