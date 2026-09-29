<script lang="ts" setup>
import { type DateRangeFilterValue, computeDateRangePreset } from '@/utils/dateRangePresets';
import { computed, ref, watch } from 'vue';

interface Props {
  modelValue: DateRangeFilterValue
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: DateRangeFilterValue): void
}>()

/**
 * Presets agrupados como no filtro de período de referência (janelas curtas,
 * janelas longas, recortes do calendário corrente e o range desenhado à mão) —
 * o divisor aparece entre os grupos, nunca antes do primeiro.
 */
const PRESET_GROUPS = [
  ['last7Days', 'last30Days'],
  ['last3Months', 'last6Months', 'lastYear'],
  ['thisWeek', 'thisMonth'],
  ['custom'],
] as const

const PRESET_LABELS: Record<string, string> = {
  last7Days: 'Last 7 days',
  last30Days: 'Last 30 days',
  last3Months: 'Last 3 months',
  last6Months: 'Last 6 months',
  lastYear: 'Last year',
  thisWeek: 'This week',
  thisMonth: 'This month',
  custom: 'Custom range',
}

const isOpen = ref(false)
const draftPreset = ref(props.modelValue.presetKey)
const draftStart = ref(props.modelValue.start)
const draftEnd = ref(props.modelValue.end)

/** Dia sob o cursor (só usado entre o 1º e o 2º clique — ver `previewBounds`). */
const hoveredIso = ref<string | null>(null)

/** `true` depois do 1º clique e antes do 2º: é o que liga o preview do range. */
const isPickingEnd = ref(false)

const presetLabel = computed(() => PRESET_LABELS[draftPreset.value] ?? 'Custom range')

function formatDate(value: string): string {
  if (!value)
    return ''

  const [year, month, day] = value.split('-').map(Number)

  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

const formattedRange = computed(() => `${formatDate(draftStart.value)} - ${formatDate(draftEnd.value)}`)

/** ISO `yyyy-mm-dd` a partir das partes locais da data (ver `dateRangePresets.toIso`). */
function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

/** Modelo do `VDatePicker`: `[início]` enquanto o fim não foi escolhido, `[início, fim]` depois. */
const pickerValue = computed(() => [...new Set([draftStart.value, draftEnd.value].filter(Boolean))])

type CalendarDayState = 'default' | 'end' | 'preview' | 'preview-edge' | 'range' | 'start'

/** Fim "tentativo" (dia sob o cursor) enquanto o segundo clique não chega. */
const previewEnd = computed(() => {
  if (!isPickingEnd.value || !hoveredIso.value || !draftStart.value || hoveredIso.value === draftStart.value)
    return null

  return hoveredIso.value
})

/** Limites do range em preview — aceita seleção "para trás". */
const previewBounds = computed(() => {
  const end = previewEnd.value

  if (!end)
    return null

  return draftStart.value < end
    ? { start: draftStart.value, end }
    : { start: end, end: draftStart.value }
})

/** Pílula fechada: range de um único dia, aplicada apenas nas pontas. */
function isDaySingle(date: Date): boolean {
  const state = calendarDayState(date)

  return (state === 'start' || state === 'end') && !!draftStart.value && draftStart.value === draftEnd.value
}

/**
 * Estado de cada célula do calendário — dirige o realce (faixa contínua com
 * pontas suaves e preview do trecho enquanto o fim não é escolhido).
 * Em `multiple="range"` o `VDatePicker` marca todos os dias do intervalo como
 * selecionados; aqui o realce é desenhado por nós (faixa + tampas suaves).
 */
function calendarDayState(date: Date): CalendarDayState {
  const iso = toIsoDate(date)
  const bounds = previewBounds.value

  if (bounds && iso !== draftStart.value && iso >= bounds.start && iso <= bounds.end)
    return iso === previewEnd.value ? 'preview-edge' : 'preview'
  if (iso === draftStart.value)
    return 'start'
  if (draftStart.value && draftEnd.value && iso > draftStart.value && iso < draftEnd.value)
    return 'range'
  if (iso === draftEnd.value)
    return 'end'

  return 'default'
}

function onDayHover(date: Date) {
  if (!isPickingEnd.value)
    return

  hoveredIso.value = toIsoDate(date)
}

function onDayLeave() {
  hoveredIso.value = null
}

watch(
  () => props.modelValue,
  value => {
    draftPreset.value = value.presetKey
    draftStart.value = value.start
    draftEnd.value = value.end
    isPickingEnd.value = false
  },
  { deep: true },
)

/** Fechar o menu limpa o preview do range. */
watch(isOpen, open => {
  if (open)
    return

  hoveredIso.value = null
  isPickingEnd.value = false
})

/**
 * O `VDatePicker` em `multiple="range"` devolve **todos** os dias do intervalo
 * (a última ponta vem com `endOfDay`) — para o draft só interessam as pontas.
 */
function onCalendarChange(selected: unknown) {
  if (!Array.isArray(selected) || selected.length === 0)
    return

  const isoDates = selected.map(value => (value instanceof Date ? toIsoDate(value) : String(value).slice(0, 10)))

  draftStart.value = isoDates[0]
  draftEnd.value = isoDates.at(-1) ?? isoDates[0]
  draftPreset.value = 'custom'


  isPickingEnd.value = isoDates.length === 1
}

/** Preset que não seja `custom` aplica e fecha na hora; `custom` só destrava o calendário. */
function selectPreset(key: string) {
  draftPreset.value = key

  if (key === 'custom')
    return

  const { start, end } = computeDateRangePreset(key)

  isPickingEnd.value = false
  draftStart.value = start
  draftEnd.value = end
  emit('update:modelValue', { presetKey: key, start, end })
  isOpen.value = false
}

/** Escolher no calendário mexe só no draft — quem commita é o "Aplicar". */
function apply() {
  emit('update:modelValue', {
    presetKey: draftPreset.value,
    start: draftStart.value,
    end: draftEnd.value,
  })
  isOpen.value = false
}

function clear() {
  selectPreset('last7Days')
}
</script>

<template>
  <VMenu v-model="isOpen" :close-on-content-click="false" location="bottom start">
    <template #activator="{ props: activatorProps }">
      <VBtn v-bind="activatorProps" class="app-date-range-filter__trigger text-none"
        :class="{ 'app-date-range-filter__trigger--open': isOpen }" variant="tonal" aria-label="Change date range">
        <VIcon class="app-date-range-filter__trigger-icon me-2" icon="bx-calendar" size="18" />
        <span class="app-date-range-filter__trigger-copy">
          <span class="app-date-range-filter__trigger-label">
            {{ presetLabel }}
          </span>
          <span class="app-date-range-filter__trigger-range">
            {{ formattedRange }}
          </span>
        </span>
        <VIcon class="app-date-range-filter__trigger-chevron ms-2" icon="bx-chevron-down" size="18" />
      </VBtn>
    </template>

    <VCard class="app-date-range-filter" elevation="8">
      <div class="app-date-range-filter__body">
        <div class="app-date-range-filter__presets">
          <p class="app-date-range-filter__presets-title">
            {{ "Date range" }}
          </p>

          <VList class="app-date-range-filter__presets-list" density="compact" nav>
            <template v-for="(group, index) in PRESET_GROUPS" :key="index">
              <VDivider v-if="index > 0" class="app-date-range-filter__presets-divider" />

              <VListItem v-for="key in group" :key="key" :active="draftPreset === key" @click="selectPreset(key)">
                {{ PRESET_LABELS[key] }}
              </VListItem>
            </template>
          </VList>
        </div>

        <div class="app-date-range-filter__calendar">
          <div class="app-date-range-filter__fields">
            <VTextField :model-value="formatDate(draftStart)" label="Start date" density="compact" variant="outlined"
              readonly hide-details />
            <VTextField :model-value="formatDate(draftEnd)" label="End date" density="compact" variant="outlined"
              readonly hide-details />
          </div>

          <VDatePicker :model-value="pickerValue" class="app-date-range-filter__picker" multiple="range" hide-header
            show-adjacent-months :first-day-of-week="1" @update:model-value="onCalendarChange">
            <template #day="{ props: dayProps, item }">
              <VBtn v-bind="dayProps" class="app-date-range-filter__day" :class="[
                `app-date-range-filter__day--${calendarDayState(item.date)}`,
                {
                  'app-date-range-filter__day--single': isDaySingle(item.date),
                  'app-date-range-filter__day--today': item.isToday,
                },
              ]" variant="text" color="" @mouseenter="onDayHover(item.date)" @mouseleave="onDayLeave"
                @focus="onDayHover(item.date)" @blur="onDayLeave" />
            </template>
          </VDatePicker>

          <div class="app-date-range-filter__actions">
            <VBtn variant="text" size="small" @click="clear">
              {{ "Clear" }}
            </VBtn>
            <VBtn color="primary" size="small" @click="apply">
              {{ "Apply" }}
            </VBtn>
          </div>
        </div>
      </div>
    </VCard>
  </VMenu>
</template>

<style lang="scss" scoped>
.app-date-range-filter {
  display: flex;
  overflow: hidden;
  flex-direction: column;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
  inline-size: min(560px, calc(100vw - 24px));
  max-block-size: min(620px, calc(100vh - 96px));



  &__trigger {
    border: 1px solid rgba(var(--v-theme-primary), 0.5);
    border-radius: 999px;
    background: rgba(var(--v-theme-primary), 0.14);
    box-shadow: 0 1px 2px rgba(var(--v-theme-on-surface), 0.08);
    color: rgba(var(--v-theme-on-surface), 0.92);
    min-block-size: 46px;
    min-inline-size: 236px;
    padding-block: 6px;
    padding-inline: 16px;
    transition: background 0.15s ease, border-color 0.15s ease;

    &:hover {
      border-color: rgba(var(--v-theme-primary), 0.62);
      background: rgba(var(--v-theme-primary), 0.2);
    }
  }

  &__trigger--open {
    border-color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.22);
    box-shadow: 0 0 0 3px rgba(var(--v-theme-primary), 0.16);
  }

  &__trigger-copy {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    line-height: 1.2;
  }

  &__trigger-label {
    color: rgba(var(--v-theme-on-surface), 0.95);
    font-size: 0.8125rem;
    font-weight: 700;
  }

  &__trigger-range {
    color: rgba(var(--v-theme-on-surface), 0.68);
    font-size: 0.6875rem;
    font-weight: 500;
    margin-block-start: 3px;
  }

  &__trigger-icon {
    color: rgb(var(--v-theme-primary));
  }

  &__trigger-chevron {
    color: rgba(var(--v-theme-on-surface), 0.6);
  }

  &__body {
    display: flex;
    overflow: hidden;
    flex: 1 1 auto;
    min-block-size: 0;
  }

  &__presets {
    display: flex;
    flex: 0 0 168px;
    flex-direction: column;
    background: rgba(var(--v-theme-on-surface), 0.025);
    border-inline-end: 1px solid rgba(var(--v-theme-on-surface), 0.08);
    padding-block: 8px 10px;
    padding-inline: 8px;
  }

  &__presets-title {
    color: rgba(var(--v-theme-on-surface), 0.6);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    margin-block: 0;
    padding-block: 4px 6px;
    padding-inline: 10px;
    text-transform: uppercase;
  }

  &__presets-list {
    flex: 1 1 auto;
    background: transparent;
    overflow-y: auto;
    padding-block: 0;
    padding-inline: 0;

    :deep(.v-list-item) {
      border-radius: 6px;
      color: rgba(var(--v-theme-on-surface), 0.78);
      font-size: 0.8125rem;
      min-block-size: 32px;
      padding-inline: 10px;
    }

    :deep(.v-list-item--active) {
      background: rgba(var(--v-theme-primary), 0.14);
      color: rgb(var(--v-theme-primary-darken-1));
      font-weight: 700;
    }
  }

  &__presets-divider {
    margin-block: 4px;
  }

  &__calendar {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 10px;
    min-inline-size: 0;
    overflow-y: auto;
    padding-block: 12px 10px;
    padding-inline: 12px;



    :deep(.v-picker) {
      border-radius: 0;
      background: transparent;
    }

    :deep(.v-date-picker) {
      box-shadow: none;
      inline-size: 100%;
    }

    :deep(.v-date-picker-controls) {
      block-size: 40px;
      font-size: 0.8125rem;
      padding-block: 0;
      padding-inline: 4px 0;
    }

    :deep(.v-date-picker-month) {
      padding-block: 0 4px;
      padding-inline: 0;
    }




    :deep(.v-date-picker-month__days) {
      column-gap: 0;
    }

    :deep(.v-date-picker-month__day) {
      block-size: 36px;
      font-size: 0.75rem;
      inline-size: 36px;
    }

    :deep(.v-date-picker-month__day-btn) {
      border-radius: 9px;
    }
  }

  &__fields {
    display: flex;
    gap: 8px;

    :deep(.v-field__input) {
      min-block-size: 24px;
      padding-block: 4px;
    }

    :deep(.v-field) {
      font-size: 0.8125rem;
    }

    :deep(.v-field-label) {
      font-size: 0.75rem;
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-block-start: auto;
    padding-block-start: 6px;
  }






  .app-date-range-filter__day {
    border-radius: 9px;
    block-size: 32px;
    font-size: 0.8125rem;
    inline-size: 32px;
    margin-inline: auto;
    min-inline-size: 32px;
  }





  .app-date-range-filter__day--start,
  .app-date-range-filter__day--end {
    background: rgba(var(--v-theme-primary), 0.32);
    box-shadow: inset 0 0 0 1.5px rgba(var(--v-theme-primary), 0.55);
    color: rgba(var(--v-theme-on-surface), 0.95);
    font-weight: 700;
    inline-size: 100%;
    margin-inline: 0;
  }

  .app-date-range-filter__day--start {
    border-end-start-radius: 999px;
    border-start-start-radius: 999px;
  }

  .app-date-range-filter__day--end {
    border-end-end-radius: 999px;
    border-start-end-radius: 999px;
  }


  .app-date-range-filter__day--single {
    border-end-end-radius: 999px;
    border-end-start-radius: 999px;
    border-start-end-radius: 999px;
    border-start-start-radius: 999px;
  }


  .app-date-range-filter__day--range,
  .app-date-range-filter__day--preview {
    border-radius: 0;
    color: rgba(var(--v-theme-on-surface), 0.85);
    inline-size: 100%;
    margin-inline: 0;
  }

  .app-date-range-filter__day--range {
    background: rgba(var(--v-theme-primary), 0.13);
  }

  .app-date-range-filter__day--preview {
    background: rgba(var(--v-theme-primary), 0.09);
    color: rgba(var(--v-theme-on-surface), 0.7);
  }


  .app-date-range-filter__day--preview-edge {
    border-radius: 0;
    background: rgba(var(--v-theme-primary), 0.22);
    box-shadow: inset 0 0 0 1.5px rgba(var(--v-theme-primary), 0.45);
    color: rgba(var(--v-theme-on-surface), 0.92);
    font-weight: 600;
    inline-size: 100%;
    margin-inline: 0;
  }

  .app-date-range-filter__day--today:not(.app-date-range-filter__day--start, .app-date-range-filter__day--end) {
    box-shadow: inset 0 0 0 1.5px rgba(var(--v-theme-primary), 0.45);
  }
}

@media (max-width: 640px) {
  .app-date-range-filter {
    inline-size: calc(100vw - 24px);
    max-block-size: calc(100vh - 48px);

    &__body {
      display: block;
      overflow-y: auto;
    }

    &__presets {
      border-block-end: 1px solid rgba(var(--v-theme-on-surface), 0.08);
      border-inline-end: none;
    }

    &__presets-list,
    &__calendar {
      overflow-y: visible;
    }
  }
}
</style>
