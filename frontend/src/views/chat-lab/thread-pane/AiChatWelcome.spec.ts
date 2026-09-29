import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import AiChatWelcome from './AiChatWelcome.vue'

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => ({ user: { fullName: 'John Doe' } }),
}))

const mountWelcome = () => mount(AiChatWelcome, {
  global: {
    stubs: {
      VIcon: { template: '<span class="icon-stub" />' },
      VBtn: { template: '<button class="btn-stub" @click="$emit(\'click\')"><slot /></button>' },
    },
  },
})

describe('AiChatWelcome — subtítulo legível em claro + escuro', () => {
  it('renders the welcome message and subtitle in English', () => {
    const wrapper = mountWelcome()

    expect(wrapper.find('.ai-chat-welcome__title').text()).toBe('Hi John Doe, what\'s on your mind?')
    expect(wrapper.find('.ai-chat-welcome__subtitle').text())
      .toBe('I\'m here to help you with any question or task. How can I be useful?')
  })

  it('usa ênfase média de `on-surface` no subtítulo (nunca `on-surface-variant`)', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/views/chat-lab/thread-pane/AiChatWelcome.vue'), 'utf8')

    const subtitleRule = source
      .slice(source.indexOf('&__subtitle'), source.indexOf('&__suggestions'))


      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')





    expect(subtitleRule).not.toContain('on-surface-variant')
    expect(subtitleRule).toContain('rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity))')
  })

  it('emite `startChat` com a sugestão escolhida', async () => {
    const wrapper = mountWelcome()

    await wrapper.findAll('button')[0].trigger('click')

    expect(wrapper.emitted('startChat')?.[0]).toEqual(['Help me write a professional email'])
  })
})
