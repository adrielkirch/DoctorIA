import type { KnowledgeChunkingSettings } from '@/types/knowledge'
import { createDefaultKnowledgeSettings } from '@/types/knowledge'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createVuetify } from 'vuetify'
import { VAlert } from 'vuetify/components/VAlert'
import { VCard, VCardText } from 'vuetify/components/VCard'
import { VChip } from 'vuetify/components/VChip'
import { VDivider } from 'vuetify/components/VDivider'
import { VCol, VRow } from 'vuetify/components/VGrid'
import { VIcon } from 'vuetify/components/VIcon'
import { VRadio } from 'vuetify/components/VRadio'
import { VRadioGroup } from 'vuetify/components/VRadioGroup'
import { VSelect } from 'vuetify/components/VSelect'
import { VSwitch } from 'vuetify/components/VSwitch'
import { VTextField } from 'vuetify/components/VTextField'
import KnowledgeChunkSettings from './KnowledgeChunkSettings.vue'

/**
 * Configurações de fragmentação com o Vuetify REAL.
 *
 * ℹ️ O bug de overflow deste componente só aparece com os estilos de verdade:
 * `.v-selection-control` é `flex: 1 0` (não encolhe) e a label (`word-break`)
 * clipa o conteúdo. Os chips ("Recomendado" / "Não disponível para Índice
 * pai-filho") precisam de `flex-wrap` e os radios multi-linha de `align-start`,
 * caso contrário o conteúdo estoura o card.
 */
const vuetifyComponents = {
  VAlert,
  VCard,
  VCardText,
  VChip,
  VCol,
  VDivider,
  VIcon,
  VRadio,
  VRadioGroup,
  VRow,
  VSelect,
  VSwitch,
  VTextField,
}


const vuetify = createVuetify()


enableAutoUnmount(afterEach)

function mountSettings(overrides: Partial<KnowledgeChunkingSettings> = {}) {
  const modelValue: KnowledgeChunkingSettings = {
    ...createDefaultKnowledgeSettings(),
    ...overrides,
  }

  const wrapper = mount(KnowledgeChunkSettings, {
    props: { modelValue },
    global: {
      plugins: [vuetify,],
      components: vuetifyComponents,
    },
  })

  return { wrapper }
}

/** Última configuração emitida pelo componente (payload do `v-model`). */
function lastEmittedSettings(wrapper: ReturnType<typeof mountSettings>['wrapper']) {
  const emitted = wrapper.emitted('update:modelValue')

  expect(emitted).toBeTruthy()

  return emitted!.at(-1)![0] as KnowledgeChunkingSettings
}

describe('KnowledgeChunkSettings — modo geral', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    })
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('renderiza os campos do modo geral com os limites do domínio', () => {
    const { wrapper } = mountSettings()

    expect(wrapper.text()).toContain('Chunking method')
    expect(wrapper.text()).toContain('Segment identifier')
    expect(wrapper.text()).toContain('Text pre-processing rules')
    expect(wrapper.text()).not.toContain('Parent chunk for context')

    const numbers = wrapper.findAll('input[type="number"]')

    expect(numbers).toHaveLength(2)
    expect(numbers[0].attributes()).toMatchObject({ min: '1', max: '4000' })
    expect(numbers[1].attributes()).toMatchObject({ min: '0', max: '1000' })
  })

  it('troca o método de fragmentação pelo card de opção', async () => {
    const { wrapper } = mountSettings()

    expect(wrapper.find('[data-testid="knowledge-mode-GENERAL"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="knowledge-mode-PARENT_CHILD"]').exists()).toBe(true)

    await wrapper.find('[data-testid="knowledge-mode-PARENT_CHILD"]').trigger('click')

    expect(lastEmittedSettings(wrapper).mode).toBe('PARENT_CHILD')
  })

  it('emite um patch imutável ao ligar uma regra de pré-processamento', async () => {
    const { wrapper } = mountSettings()

    const switches = wrapper.findAll('.v-switch input[type="checkbox"]')

    expect(switches).toHaveLength(4)

    await switches[0].setValue(true)

    const emitted = lastEmittedSettings(wrapper)

    expect(emitted.general.preProcessing.replaceConsecutiveWhitespace).toBe(true)
    expect(emitted.general.segmentIdentifier).toBe('\\n')
    expect(emitted.mode).toBe('GENERAL')
  })

  it('só mostra o idioma do formato Q&A quando o switch está ligado', () => {
    const { wrapper } = mountSettings()

    const { wrapper: withQa } = mountSettings({
      general: { ...createDefaultKnowledgeSettings().general, qaFormat: true },
    })

    expect(wrapper.text()).not.toContain('Language')
    expect(withQa.text()).toContain('Language')
  })
})

describe('KnowledgeChunkSettings — modo pai-filho e índice', () => {
  it('mostra as seções de pai e filho e esconde os campos do modo geral', () => {
    const { wrapper } = mountSettings({ mode: 'PARENT_CHILD' })

    expect(wrapper.text()).toContain('Parent chunk for context')
    expect(wrapper.text()).toContain('Child chunk for retrieval')
    expect(wrapper.text()).not.toContain('Segment identifier')


    expect(wrapper.findAll('[data-testid^="knowledge-parent-mode-"]')).toHaveLength(2)
    expect(wrapper.findAll('input[type="number"]')).toHaveLength(2)
  })

  it('esconde os campos do pai no modo documento completo', async () => {
    const { wrapper } = mountSettings({ mode: 'PARENT_CHILD' })
    const input = wrapper.find('[data-testid="knowledge-parent-mode-FULL_DOC"] input')

    await input.setValue(true)

    expect(lastEmittedSettings(wrapper).parentChild.parentMode).toBe('FULL_DOC')

    const fullDoc = mountSettings({
      mode: 'PARENT_CHILD',
      parentChild: {
        ...createDefaultKnowledgeSettings().parentChild,
        parentMode: 'FULL_DOC',
      },
    })

    expect(fullDoc.wrapper.text()).not.toContain('Parent max chunk length')
    expect(fullDoc.wrapper.text()).toContain('Child chunk for retrieval')
  })

  it('não oferece o índice econômico (MVP: só alta qualidade)', () => {
    const { wrapper } = mountSettings()

    expect(wrapper.find('[data-testid="knowledge-index-high-quality"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('High quality')
    expect(wrapper.text()).not.toContain('Economical')
  })

  it('quebra linha em vez de estourar o card (chips e labels multi-linha)', () => {
    const { wrapper } = mountSettings({ mode: 'PARENT_CHILD' })




    const parentRadios = wrapper.findAll('[data-testid^="knowledge-parent-mode-"]')

    expect(parentRadios.every(radio => radio.classes().includes('align-start'))).toBe(true)
    expect(wrapper.findAll('[data-testid^="knowledge-parent-mode-"] .v-label div.text-wrap')).toHaveLength(2)


    expect(wrapper.findAll('.d-flex.flex-wrap.align-center.gap-2').length).toBeGreaterThan(0)
  })
})
