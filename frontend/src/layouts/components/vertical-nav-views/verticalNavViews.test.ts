import { describe, expect, it } from 'vitest'
import { resolveVerticalNavView, verticalNavViews } from './verticalNavViews'

describe('vertical-nav-views registry', () => {
  it('resolveVerticalNavView: ai-assistant e c-chatId → chats; demais rotas → default', () => {
    expect(resolveVerticalNavView('ai-assistant')).toBe('chats')
    expect(resolveVerticalNavView('c-chatId')).toBe('chats')
    expect(resolveVerticalNavView('ai-skills')).toBe('default')
    expect(resolveVerticalNavView('ai-knowledge')).toBe('default')
    expect(resolveVerticalNavView('integrations-mcp')).toBe('default')
    expect(resolveVerticalNavView('tenants')).toBe('default')
  })

  it('view default é o fallback universal e NÃO define header/items (nav admin nativa)', () => {
    const byId = Object.fromEntries(verticalNavViews.map(v => [v.id, v]))

    expect(verticalNavViews[0].id).toBe('default')
    expect(byId.default.header).toBeUndefined()
    expect(byId.default.items).toBeUndefined()
  })

  it('view chats define header + items (componentização por view)', () => {
    const byId = Object.fromEntries(verticalNavViews.map(v => [v.id, v]))

    expect(byId.chats.header).toBeDefined()
    expect(byId.chats.items).toBeDefined()
  })
})
