import { useAiChatMessagesStore } from '@/stores/useAiChatMessagesStore'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import ModelSelector from './ModelSelector.vue'

function mountSelector() {

  const pinia = createPinia()

  setActivePinia(pinia)

  return mount(ModelSelector, {
    global: {
      plugins: [pinia],
      stubs: {


        VMenu: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<div class="menu-stub"><slot name="activator" :props="{ onClick: () => $emit(\'update:modelValue\', !modelValue) }" /><div v-if="modelValue" class="menu-content"><slot /></div></div>',
        },
        VBtn: { template: '<button class="btn-stub"><slot /></button>' },
        VIcon: { template: '<span class="icon-stub" />' },
        VChip: { template: '<span class="chip-stub"><slot /></span>' },
        VCard: { template: '<div class="card-stub"><slot /></div>' },
        VCardText: { template: '<div class="card-text-stub"><slot /></div>' },
        VList: { template: '<div class="list-stub"><slot /></div>' },
        VListSubheader: { template: '<div class="subheader-stub"><slot /></div>' },
        VListItem: { template: '<div class="list-item-stub"><slot name="prepend" /><slot /><slot name="append" /></div>' },
        VListItemTitle: { template: '<div class="item-title-stub"><slot /></div>' },
        VListItemSubtitle: { template: '<div class="item-subtitle-stub"><slot /></div>' },
      },
    },
  })
}

describe('ModelSelector — dropdown de modelos IA', () => {
  enableAutoUnmount(afterEach)

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('mostra o modelo atual e, ao abrir, lista providers + modelos', async () => {
    const wrapper = mountSelector()

    await flushPromises()


    expect(wrapper.find('.btn-stub').text()).toContain('GPT-5.6')


    expect(wrapper.find('.menu-content').exists()).toBe(false)

    await wrapper.find('.btn-stub').trigger('click')
    await flushPromises()

    expect(wrapper.find('.menu-content').exists()).toBe(true)
    expect(wrapper.text()).toContain('OpenAI')
    expect(wrapper.text()).toContain('Anthropic')
    expect(wrapper.text()).toContain('Google')
    expect(wrapper.text()).toContain('DeepSeek')
    expect(wrapper.text()).toContain('Moonshot AI')
    expect(wrapper.text()).toContain('GPT-4o Mini')
    expect(wrapper.text()).toContain('Claude Haiku 4.5')
    expect(wrapper.text()).toContain('Gemini 3 Pro')
  })

  it('seleciona um modelo, atualiza a store e fecha o menu', async () => {
    const wrapper = mountSelector()

    await flushPromises()


    const store = useAiChatMessagesStore()

    await wrapper.find('.btn-stub').trigger('click')
    await flushPromises()

    const items = wrapper.findAll('.list-item-stub')
    const target = items.find(i => i.text().includes('Claude Opus 5'))!

    await target.trigger('click')
    await flushPromises()

    expect(store.selectedModel).toBe('claude-opus-5')
    expect(wrapper.find('.menu-content').exists()).toBe(false)
    expect(wrapper.find('.btn-stub').text()).toContain('Claude Opus 5')
  })

  it('mostra a descrição do modelo no item (sem badge de tier)', async () => {
    const wrapper = mountSelector()

    await flushPromises()

    await wrapper.find('.btn-stub').trigger('click')
    await flushPromises()

    const gpt = wrapper.findAll('.list-item-stub').find(i => i.text().includes('GPT-4o'))!

    expect(gpt.text()).toContain("OpenAI's versatile multimodal model")
    expect(gpt.text()).not.toContain('Premium')
  })
})
