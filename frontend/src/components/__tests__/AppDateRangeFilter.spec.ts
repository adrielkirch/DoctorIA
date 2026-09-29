import AppDateRangeFilter from '@/components/AppDateRangeFilter.vue'
import type { DateRangeFilterValue } from '@/utils/dateRangePresets'
import { computeDateRangePreset } from '@/utils/dateRangePresets'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createVuetify } from 'vuetify'
import { VBtn } from 'vuetify/components/VBtn'
import { VCard } from 'vuetify/components/VCard'
import { VDatePicker } from 'vuetify/components/VDatePicker'
import { VDivider } from 'vuetify/components/VDivider'
import { VList, VListItem } from 'vuetify/components/VList'
import { VTextField } from 'vuetify/components/VTextField'

vi.stubGlobal('visualViewport', {
  width: 1024,
  height: 768,
  scale: 1,
  offsetLeft: 0,
  offsetTop: 0,
  pageLeft: 0,
  pageTop: 0,
  addEventListener: () => {},
  removeEventListener: () => {},
})

vi.stubGlobal('ResizeObserver', class {
  observe() {}
  unobserve() {}
  disconnect() {}
})

enableAutoUnmount(afterEach)

/** Stubs no lugar do Vuetify (mesmo padrão dos outros specs do projeto). */
const baseStubs = {
  VMenu: { template: '<div class="v-menu-stub"><slot name="activator" :props="{}" /><slot /></div>' },
  VCard: { template: '<div class="v-card-stub"><slot /></div>' },
  VList: { template: '<div class="v-list-stub"><slot /></div>' },
  VListItem: {
    props: { active: Boolean },
    emits: ['click'],
    template: '<button type="button" class="v-list-item-stub" @click="$emit(\'click\')"><slot /></button>',
  },
  VDivider: { template: '<hr class="v-divider-stub" />' },
  VIcon: { template: '<i class="v-icon-stub" />' },
  VTextField: {
    props: ['modelValue', 'label'],
    template: '<span class="v-text-field-stub" :data-label="label">{{ modelValue }}</span>',
  },
  VBtn: { template: '<button type="button" class="v-btn-stub"><slot /></button>' },
}

/**
 * `VDatePicker` falso: expõe o slot `day` e um botão que devolve um range
 * completo, como o componente real em `multiple="range"` faz.
 */
const pickerStub = {
  props: ['modelValue', 'multiple'],
  emits: ['update:modelValue'],
  data: () => ({ calendarDay: { date: new Date(2026, 8, 15), isToday: false } }),
  methods: {
    pickRange(this: any) {
      this.$emit('update:modelValue', [new Date(2026, 8, 10), new Date(2026, 8, 20)])
    },
    pickStart(this: any) {
      this.$emit('update:modelValue', [new Date(2026, 8, 10)])
    },
  },
  template: `
      <div class="v-date-picker-stub" :data-multiple="multiple">
        <slot name="day" :props="{ onClick: () => {} }" :item="calendarDay" :i="0" />
        <button type="button" class="pick-range" @click="pickRange" />
        <button type="button" class="pick-start" @click="pickStart" />
      </div>
    `,
}

function mountFilter(value: DateRangeFilterValue) {
  return mount(AppDateRangeFilter, {
    props: { modelValue: value },
    global: { stubs: { ...baseStubs, VDatePicker: pickerStub } },
  })
}

/**
 * Integração com o `VDatePicker` REAL: a assinatura do slot `day`
 * (`{ props, item }`), o modo `range` e a navegação de mês só existem no
 * componente de verdade — stub não reproduz. O `VMenu` continua stubbado para
 * o popover renderizar inline (sem teleport/lazy do VOverlay).
 */
function mountRealPicker(value: DateRangeFilterValue) {
  return mount(AppDateRangeFilter, {
    props: { modelValue: value },
    global: {
      plugins: [createVuetify()],
      components: { VBtn, VCard, VDatePicker, VDivider, VList, VListItem, VTextField },
      stubs: { VMenu: baseStubs.VMenu, VIcon: baseStubs.VIcon },
    },
  })
}

/** Same fixed English formatting used by the date-range filter fields. */
function formatIso(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)

  return new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day))
}

const last7Days = { presetKey: 'last7Days', ...computeDateRangePreset('last7Days') }

describe('AppDateRangeFilter', () => {
  it('mostra o preset atual e o range formatado no trigger', () => {
    const wrapper = mountFilter({ presetKey: 'last7Days', start: '2026-09-10', end: '2026-09-20' })

    expect(wrapper.find('.app-date-range-filter__trigger').text()).toContain('Last 7 days')
    expect(wrapper.find('.app-date-range-filter__trigger-range').text()).toContain('2026')
  })

  it('agrupa os presets em 4 blocos com divisor só entre eles', () => {
    const wrapper = mountFilter(last7Days)

    expect(wrapper.findAll('.v-list-item-stub')).toHaveLength(8)
    expect(wrapper.findAll('.v-divider-stub')).toHaveLength(3)
    expect(wrapper.find('.app-date-range-filter__presets-title').text()).toBe('Date range')
  })

  it('monta o calendário compacto: 1 mês, semana começando na segunda e mês adjacente visível', () => {
    const picker = mountFilter(last7Days).find('.v-date-picker-stub')

    expect(picker.attributes('data-multiple')).toBe('range')
    expect(picker.attributes('first-day-of-week')).toBe('1')
    expect(picker.attributes('hide-header')).toBeDefined()
    expect(picker.attributes('show-adjacent-months')).toBeDefined()
  })

  it('clicar num preset commita na hora e mantém o draft sincronizado', async () => {
    const wrapper = mountFilter(last7Days)
    const item = wrapper.findAll('.v-list-item-stub').find(node => node.text() === 'Last 30 days')

    await item?.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual({
      presetKey: 'last30Days',
      ...computeDateRangePreset('last30Days'),
    })
    expect(wrapper.find('.app-date-range-filter__trigger-label').text()).toBe('Last 30 days')
  })

  it('date selection updates the draft and commits when Apply is clicked', async () => {
    const wrapper = mountFilter(last7Days)

    await wrapper.find('.pick-range').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.findAll('.v-text-field-stub').map(field => field.text())).toEqual([
      formatIso('2026-09-10'),
      formatIso('2026-09-20'),
    ])

    const applyBtn = wrapper.findAll('.v-btn-stub').find(button => button.text().includes('Apply'))

    await applyBtn?.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual({
      presetKey: 'custom',
      start: '2026-09-10',
      end: '2026-09-20',
    })
  })

  it('realça as pontas e o miolo do range (estilo Chatwoot)', () => {
    const middle = mountFilter({ presetKey: 'custom', start: '2026-09-10', end: '2026-09-20' })
    const edge = mountFilter({ presetKey: 'custom', start: '2026-09-15', end: '2026-09-15' })


    expect(middle.find('.app-date-range-filter__day').classes()).toContain('app-date-range-filter__day--range')
    expect(edge.find('.app-date-range-filter__day').classes()).toContain('app-date-range-filter__day--start')
    expect(edge.find('.app-date-range-filter__day').classes()).toContain('app-date-range-filter__day--single')
  })

  it('Clear resets the filter to the last 7 days', async () => {
    const wrapper = mountFilter({ presetKey: 'custom', start: '2026-01-01', end: '2026-01-31' })
    const clearBtn = wrapper.findAll('.v-btn-stub').find(button => button.text().includes('Clear'))

    await clearBtn?.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual({
      presetKey: 'last7Days',
      ...computeDateRangePreset('last7Days'),
    })
  })

  it('preview: com o início já escolhido, o hover desenha o trecho até o dia sob o cursor', async () => {
    const wrapper = mountFilter(last7Days)

    await wrapper.find('.pick-start').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()


    await wrapper.find('.app-date-range-filter__day').trigger('mouseenter')

    expect(wrapper.find('.app-date-range-filter__day').classes()).toContain('app-date-range-filter__day--preview-edge')

    await wrapper.find('.app-date-range-filter__day').trigger('mouseleave')

    expect(wrapper.find('.app-date-range-filter__day').classes()).toContain('app-date-range-filter__day--default')
  })

  it('com o range já fechado, hover não inventa preview', async () => {
    const wrapper = mountFilter({ presetKey: 'custom', start: '2026-09-10', end: '2026-09-20' })
    const day = wrapper.find('.app-date-range-filter__day')

    await day.trigger('mouseenter')

    expect(day.classes()).toContain('app-date-range-filter__day--range')
    expect(day.classes()).not.toContain('app-date-range-filter__day--preview-edge')
  })
})

describe('AppDateRangeFilter — VDatePicker real', () => {
  /** Botão do dia `label` no mês exibido (ignora as células do mês adjacente). */
  function dayButton(wrapper: ReturnType<typeof mountRealPicker>, label: string) {
    const cell = wrapper
      .findAll('.v-date-picker-month__day')
      .find(node => !node.classes().includes('v-date-picker-month__day--adjacent') && node.text() === label)

    return cell?.find('.app-date-range-filter__day')
  }

  it('desenha o mês inteiro (6 semanas × 7 dias) com pontas e miolo realçados', () => {
    const wrapper = mountRealPicker({ presetKey: 'custom', start: '2026-09-10', end: '2026-09-20' })

    expect(wrapper.findAll('.v-date-picker-month__day-btn')).toHaveLength(42)
    expect(dayButton(wrapper, '10')?.classes()).toContain('app-date-range-filter__day--start')
    expect(dayButton(wrapper, '15')?.classes()).toContain('app-date-range-filter__day--range')
    expect(dayButton(wrapper, '20')?.classes()).toContain('app-date-range-filter__day--end')
    expect(dayButton(wrapper, '25')?.classes()).toContain('app-date-range-filter__day--default')
  })

  it('navega de mês pelas setas do cabeçalho do picker', async () => {
    const wrapper = mountRealPicker({ presetKey: 'custom', start: '2026-09-10', end: '2026-09-20' })
    const title = () => wrapper.find('.v-date-picker-controls__month-btn').text()

    expect(title()).toContain('2026')

    const before = title()

    await wrapper.find('[data-testid="next-month"]').trigger('click')

    expect(title()).not.toBe(before)
  })

  it('preview com o VDatePicker real: 1º clique + hover mostra o trecho até o dia apontado', async () => {
    const wrapper = mountRealPicker({ presetKey: 'custom', start: '2026-09-10', end: '2026-09-20' })

    await dayButton(wrapper, '8')?.trigger('click')
    await dayButton(wrapper, '18')?.trigger('mouseenter')

    expect(dayButton(wrapper, '8')?.classes()).toContain('app-date-range-filter__day--start')
    expect(dayButton(wrapper, '15')?.classes()).toContain('app-date-range-filter__day--preview')
    expect(dayButton(wrapper, '18')?.classes()).toContain('app-date-range-filter__day--preview-edge')

    await dayButton(wrapper, '18')?.trigger('mouseleave')

    expect(dayButton(wrapper, '18')?.classes()).toContain('app-date-range-filter__day--default')
  })

  it('clicar num dia atualiza só o draft (start = end) e não emite', async () => {
    const wrapper = mountRealPicker({ presetKey: 'custom', start: '2026-09-10', end: '2026-09-20' })

    await dayButton(wrapper, '15')?.trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.find('.app-date-range-filter__trigger-range').text()).toContain(formatIso('2026-09-15'))
  })
})
