import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import CapabilitiesPanel from './CapabilitiesPanel.vue'

function mountPanel() {
  return mount(CapabilitiesPanel, {
    global: {
      stubs: {
        VTextField: { template: '<input class="search-stub" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
        VIcon: { template: '<span class="icon-stub" />' },
      },
    },
  })
}

describe('CapabilitiesPanel — recursos integrados', () => {
  enableAutoUnmount(afterEach)

  it('renderiza o título e os 3 cards (Knowledge, MCP, API Gateway)', async () => {
    const wrapper = mountPanel()

    await flushPromises()

    expect(wrapper.text()).toContain('Available Resources')
    expect(wrapper.text()).toContain('Knowledge')
    expect(wrapper.text()).toContain('MCP Integrations')
    expect(wrapper.text()).toContain('API Gateway')
    expect(wrapper.text()).toContain('Connected')
    expect(wrapper.findAll('.capability-card')).toHaveLength(3)
  })

  it('selecionar um card emite selectCapability', async () => {
    const wrapper = mountPanel()

    await flushPromises()

    await wrapper.findAll('.capability-card')[1].trigger('click')

    expect(wrapper.emitted('selectCapability')).toEqual([['mcp']])
  })

  it('botão fechar emite close', async () => {
    const wrapper = mountPanel()

    await flushPromises()

    await wrapper.find('.capabilities-panel__close').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('busca filtra os cards e mostra vazio sem resultados', async () => {
    const wrapper = mountPanel()

    await flushPromises()

    await wrapper.find('.search-stub').setValue('gateway')
    expect(wrapper.findAll('.capability-card')).toHaveLength(1)
    expect(wrapper.text()).toContain('API Gateway')

    await wrapper.find('.search-stub').setValue('xyz')
    expect(wrapper.findAll('.capability-card')).toHaveLength(0)
    expect(wrapper.text()).toContain('No resources found.')
  })
})
