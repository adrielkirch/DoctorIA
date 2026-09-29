import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveNavIconProps } from '@layouts/iconResolver'

describe('VerticalNav compact behavior', () => {
  it('uses bx-circle when icon token is missing or invalid', () => {
    expect(resolveNavIconProps(undefined, { icon: 'bx-circle' }).icon).toBe('bx-circle')
    expect(resolveNavIconProps({ icon: 'mdi-home' }, { icon: 'bx-circle' }).icon).toBe('bx-circle')
  })

  it('keeps valid Boxicons tokens', () => {
    expect(resolveNavIconProps({ icon: 'bx-home-smile' }, { icon: 'bx-circle' }).icon).toBe('bx-home-smile')
  })

  it('allows active label two-line style while keeping default truncation style', () => {
    const linkSource = readFileSync(resolve(process.cwd(), 'src/@layouts/components/VerticalNavLink.vue'), 'utf8')

    expect(linkSource).toContain('nav-item-title-active-wrap')
    expect(linkSource).toContain('text-overflow: ellipsis')
    expect(linkSource).toContain('-webkit-line-clamp: 2')
  })
})
