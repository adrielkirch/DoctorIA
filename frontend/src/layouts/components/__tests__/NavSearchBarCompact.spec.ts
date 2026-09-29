import { resolveNavIconProps } from '@layouts/iconResolver'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('NavSearchBar compact behavior', () => {
  it('resolves invalid icon tokens to bx-circle fallback', () => {
    expect(resolveNavIconProps({ icon: 'mdi-home' }, { icon: 'bx-circle' }).icon).toBe('bx-circle')
    expect(resolveNavIconProps({ icon: 'bx-search' }, { icon: 'bx-circle' }).icon).toBe('bx-search')
  })

  it('applies compact dialog classes and truncation styles in search rows', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/layouts/components/NavSearchBar.vue'), 'utf8')

    expect(source).toContain('compactSearchDialogClasses')
    expect(source).toContain('compact-nav-enabled')
    expect(source).toContain('compact-nav-dense')
    expect(source).toContain('compact-nav-search-title')
    expect(source).toContain(':title="item.title"')
  })

  it('gates the API Gateway suggestion by route name (RBAC) instead of a bare href', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/layouts/components/NavSearchBar.vue'), 'utf8')




    expect(source).toContain("url: { name: 'integrations-gateway' }")
    expect(source).not.toContain("url: { href: '/api/gateway' }")
  })
})
