import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(__dirname, '../QuickActions.vue'), 'utf-8')

describe('QuickActions', () => {
  it('renders all expected quick action titles', () => {
    expect(source).toContain('title: \'View Users\'')
    expect(source).toContain('to: \'/users\'')
  })

  it('emits navigate when an action card is clicked', async () => {
    expect(source).toContain('emit(\'navigate\', to)')
    expect(source).toContain('@click="onNavigate(action.to)"')
    expect(source).toContain(':data-testid="`quick-action-${action.id}`"')
  })
})
