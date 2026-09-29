/**
 * Race do cookie (useCookie assíncrono) — causa "clico no tenant e não há URL".
 *
 * O guard e o `$api` criam refs NOVAS lendo `document.cookie` a cada chamada.
 * Se `useCookie().value = x` só grava via `watch` (assíncrono), um leitor novo
 * imediato lê o valor ANTIGO → a 1ª troca de tenant é engolida pelo guard
 * (volta para /tenants). Este spec trava que a gravação é síncrona.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { useCookie } from '@/@core/composable/useCookie'

describe('useCookie — gravação síncrona (sem race para novos leitores)', () => {
  beforeEach(() => {
    document.cookie.split(';').forEach(c => {
      const name = c.split('=')[0].trim()

      if (name)
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
    })
  })

  it('um leitor novo vê o valor imediatamente (guard/$api não leem cookie velho)', () => {
    useCookie('currentTenantId').value = 'workspace-alpha'

    expect(useCookie('currentTenantId').value).toBe('workspace-alpha')
  })

  it('logout (null) remove o cookie imediatamente', () => {
    useCookie('currentTenantId').value = 'workspace-alpha'
    useCookie('currentTenantId').value = null

    expect(useCookie('currentTenantId').value).toBeUndefined()
  })
})
