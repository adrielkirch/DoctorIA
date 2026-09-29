import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import MarkdownRenderer from './MarkdownRenderer.vue'

function mountRenderer(content: string, streaming = false) {
  return mount(MarkdownRenderer, {
    props: { content, streaming },
  })
}

describe('MarkdownRenderer — markdown rico (Fase 3)', () => {
  enableAutoUnmount(afterEach)

  it('renderiza headings, negrito e código inline', () => {
    const wrapper = mountRenderer('# Título\n\n**negrito** e `codigo`')

    expect(wrapper.find('h1').text()).toBe('Título')
    expect(wrapper.find('strong').text()).toBe('negrito')
    expect(wrapper.find('code').text()).toBe('codigo')
  })

  it('renderiza listas, blockquote e tabela', () => {
    const wrapper = mountRenderer('- item\n\n> citação\n\n| A | B |\n| --- | --- |\n| 1 | 2 |')

    expect(wrapper.find('ul li').text()).toBe('item')
    expect(wrapper.find('blockquote').text()).toBe('citação')
    expect(wrapper.find('table').exists()).toBe(true)
    expect(wrapper.find('td').text()).toBe('1')
  })

  it('renderiza bloco de código com fences', () => {
    const wrapper = mountRenderer('```typescript\nconst a = 1\n```')

    expect(wrapper.find('pre').exists()).toBe(true)
    expect(wrapper.find('pre').text()).toContain('const a = 1')
  })

  it('renderiza LaTeX em bloco e inline', () => {
    const wrapper = mountRenderer('$$E = mc^2$$\n\ninline $f(x) = x^2$')

    expect(wrapper.find('.md-latex-block').text()).toBe('E = mc^2')
    expect(wrapper.find('.md-latex-inline').text()).toBe('f(x) = x^2')
  })

  it('sanitiza HTML perigoso (XSS-safe)', () => {
    const wrapper = mountRenderer('**ok** <script>alert(1)</script>')

    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.find('strong').text()).toBe('ok')
  })

  it('streaming: markdown incompleto não quebra o render', () => {
    const wrapper = mountRenderer('## Título parcial\n\n**negrito sem fechar', true)

    expect(wrapper.find('h2').text()).toBe('Título parcial')
    expect(wrapper.text()).toContain('negrito')
  })
})
