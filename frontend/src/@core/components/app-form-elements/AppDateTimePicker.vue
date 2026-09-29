<script setup lang="ts">
import FlatPickr from 'vue-flatpickr-component'
import { useTheme } from 'vuetify'


import { VField, makeVFieldProps } from 'vuetify/lib/components/VField/VField'


import { VInput, makeVInputProps } from 'vuetify/lib/components/VInput/VInput'


import { filterInputAttrs } from 'vuetify/lib/util/helpers'

import { useConfigStore } from '@core/stores/config'


defineOptions({
  inheritAttrs: false,
})

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  autofocus: Boolean,
  counter: [Boolean, Number, String] as PropType<true | number | string>,
  counterValue: Function as PropType<(value: any) => number>,
  prefix: String,
  placeholder: String,
  persistentPlaceholder: Boolean,
  persistentCounter: Boolean,
  suffix: String,
  type: {
    type: String,
    default: 'text',
  },
  modelModifiers: Object as PropType<Record<string, boolean>>,
  ...makeVInputProps({
    density: 'comfortable',
    hideDetails: 'auto',
  }),
  ...makeVFieldProps({
    variant: 'outlined',
    color: 'primary',
  }),
})

const emit = defineEmits<Emit>()

interface Emit {
  (e: 'click:control', val: MouseEvent): true
  (e: 'mousedown:control', val: MouseEvent): true
  (e: 'update:focused', val: MouseEvent): true
  (e: 'update:modelValue', val: string): void
  (e: 'click:clear', el: MouseEvent): void
}

const configStore = useConfigStore()
const attrs = useAttrs()

const [rootAttrs, compAttrs] = filterInputAttrs(attrs)
const inputProps = ref(VInput.filterProps(props))
const fieldProps = ref(VField.filterProps(props))

const refFlatPicker = ref()

const { focused } = useFocus(refFlatPicker)
const isCalendarOpen = ref(false)
const isInlinePicker = ref(false)


if (compAttrs.config && compAttrs.config.inline) {
  isInlinePicker.value = compAttrs.config.inline
  Object.assign(compAttrs, { altInputClass: 'inlinePicker' })
}

compAttrs.config = {
  ...compAttrs.config,
  prevArrow: '<i class="bx-chevron-left v-icon" style="font-size: 20px; height: 20px; width: 20px;"></i>',
  nextArrow: '<i class="bx-chevron-right v-icon" style="font-size: 20px; height: 20px; width: 20px;"></i>',
}


const onClear = (el: MouseEvent) => {
  el.stopPropagation()

  nextTick(() => {
    emit('update:modelValue', '')

    emit('click:clear', el)
  })
}

const vuetifyTheme = useTheme()

const vuetifyThemesName = Object.keys(vuetifyTheme.themes.value)


const updateThemeClassInCalendar = () => {

  if (!refFlatPicker.value.fp.calendarContainer)
    return

  vuetifyThemesName.forEach(t => {
    refFlatPicker.value.fp.calendarContainer.classList.remove(`v-theme--${t}`)
  })
  refFlatPicker.value.fp.calendarContainer.classList.add(`v-theme--${vuetifyTheme.global.name.value}`)
}

watch(() => configStore.theme, updateThemeClassInCalendar)

onMounted(() => {
  updateThemeClassInCalendar()
})

const emitModelValue = (val: string) => {
  emit('update:modelValue', val)
}

watch(() => props, () => {
  fieldProps.value = VField.filterProps((props))
  inputProps.value = VInput.filterProps(props)
},
{
  deep: true,
  immediate: true,
})

const elementId = computed (() => {
  const _elementIdToken = fieldProps.id || fieldProps.label || inputProps.value.id

  const _id = useId()

  return _elementIdToken ? `app-picker-field-${_elementIdToken}` : _id
})
</script>

<template>
  <div class="app-picker-field">
    <!-- v-input -->
    <VLabel
      v-if="fieldProps.label"
      class="mb-1 text-body-2"
      :for="elementId"
      :text="fieldProps.label"
      style="line-height: 15px;"
    />

    <VInput
      v-bind="{ ...inputProps, ...rootAttrs }"
      :model-value="props.modelValue"
      :hide-details="props.hideDetails"
      :class="[{
        'v-text-field--prefixed': props.prefix,
        'v-text-field--suffixed': props.suffix,
        'v-text-field--flush-details': ['plain', 'underlined'].includes(props.variant),
      }, props.class]"
      class="position-relative v-text-field"
      :style="props.style"
    >
      <template #default="{ id, isDirty, isValid, isDisabled, isReadonly, validate }">
        <!-- v-field -->
        <VField
          v-bind="{ ...fieldProps, label: undefined }"
          :id="id.value"
          role="textbox"
          :active="focused || isDirty.value || isCalendarOpen"
          :focused="focused || isCalendarOpen"
          :dirty="isDirty.value || props.dirty"
          :error="isValid.value === false"
          :disabled="isDisabled.value"
          @click:clear="onClear"
        >
          <template #default="{ props: vFieldProps }">
            <div v-bind="vFieldProps">
              <!-- flat-picker  -->
              <FlatPickr
                v-if="!isInlinePicker"
                v-bind="compAttrs"
                ref="refFlatPicker"
                :model-value="props.modelValue"
                :placeholder="props.placeholder"
                :readonly="isReadonly.value"
                class="flat-picker-custom-style h-100 w-100"
                :disabled="isReadonly.value"
                @on-open="isCalendarOpen = true"
                @on-close="isCalendarOpen = false; validate()"
                @update:model-value="emitModelValue"
              />

              <!-- simple input for inline prop -->
              <input
                v-if="isInlinePicker"
                :value="props.modelValue"
                :placeholder="props.placeholder"
                :readonly="isReadonly.value"
                class="flat-picker-custom-style h-100 w-100"
                type="text"
              >
            </div>
          </template>
        </VField>
      </template>
    </VInput>

    <!-- flat picker for inline props -->
    <FlatPickr
      v-if="isInlinePicker"
      v-bind="compAttrs"
      ref="refFlatPicker"
      :model-value="props.modelValue"
      @update:model-value="emitModelValue"
      @on-open="isCalendarOpen = true"
      @on-close="isCalendarOpen = false"
    />
  </div>
</template>

<style lang="scss">
@use "@core/scss/template/mixins" as templateMixins;
/* stylelint-disable no-descending-specificity */
@use "flatpickr/dist/flatpickr.css";
@use "@core/scss/base/mixins";

.flat-picker-custom-style {
  position: absolute;
  color: inherit;
  inline-size: 100%;
  inset: 0;
  outline: none;
  padding-block: 0;
  padding-inline: var(--v-field-padding-start);
}

$heading-color: rgba(var(--v-theme-on-background), var(--v-high-emphasis-opacity));
$body-color: rgba(var(--v-theme-on-background), var(--v-medium-emphasis-opacity));


input[altinputclass="inlinePicker"] {
  display: none;
}

.flatpickr-calendar {
  border-radius: 0.375rem;
  background-color: rgb(var(--v-theme-surface));
  inline-size: 16.875rem;

  @include mixins.elevation(8);

  .flatpickr-day:focus {
    border-color: rgba(var(--v-border-color), var(--v-border-opacity));
    background: rgba(var(--v-border-color), var(--v-border-opacity));
  }

  .flatpickr-rContainer {
    inline-size: 16.875rem;

    .flatpickr-weekdays {
      padding-inline: 0.5rem;
    }

    .flatpickr-days {
      font-size: 0.9375rem;
      min-inline-size: 16.875rem;

      .dayContainer {
        justify-content: center !important;
        inline-size: 16.875rem !important;
        min-inline-size: 16.875rem !important;
        padding-block: 0.75rem 0.5rem;

        .flatpickr-day {
          border-radius: 6px;
          block-size: 36px;
          line-height: 36px;
          margin-block-start: 0 !important;
          max-inline-size: 36px;
        }
      }
    }
  }

  .flatpickr-day {
    color: $heading-color;

    &.today {
      &,
      &:hover {
        border-color: transparent;
        background-color: rgb(var(--v-theme-primary), 0.24);
        color: rgba(var(--v-theme-primary));
      }
    }

    &.selected,
    &.selected:hover {
      border-color: rgb(var(--v-theme-primary));
      background: rgb(var(--v-theme-primary));
      color: rgb(var(--v-theme-on-primary)) !important;

      @include templateMixins.custom-elevation(var(--v-theme-primary), "sm");
    }

    &.inRange,
    &.inRange:hover {
      border: none;
      border-radius: 0 !important;
      background: rgba(var(--v-theme-primary), 0.1) !important;
      box-shadow: none !important;
      color: rgb(var(--v-theme-primary));
    }

    &.inRange.today {
      background: rgba(var(--v-theme-primary), 0.24) !important;
    }

    &.startRange {
      @include templateMixins.custom-elevation(var(--v-theme-primary), "sm");

      border-end-end-radius: 0 !important;
      border-start-end-radius: 0 !important;
    }

    &.endRange {
      @include templateMixins.custom-elevation(var(--v-theme-primary), "sm");

      border-end-start-radius: 0 !important;
      border-start-start-radius: 0 !important;
    }

    &.startRange,
    &.endRange,
    &.startRange:hover,
    &.endRange:hover {
      border-color: rgb(var(--v-theme-primary));
      background: rgb(var(--v-theme-primary));
      color: rgb(var(--v-theme-on-primary));
    }

    &.selected.startRange + .endRange:not(:nth-child(7n + 1)),
    &.startRange.startRange + .endRange:not(:nth-child(7n + 1)),
    &.endRange.startRange + .endRange:not(:nth-child(7n + 1)) {
      box-shadow: -10px 0 0 rgb(var(--v-theme-primary));
    }

    &.flatpickr-disabled,
    &.prevMonthDay:not(.startRange,.inRange),
    &.nextMonthDay:not(.endRange,.inRange) {
      color: rgba(var(--v-theme-on-background), var(--v-disabled-opacity));
    }

    &:hover {
      border-color: transparent;
      background: rgba(var(--v-theme-on-surface), var(--v-hover-opacity));
      color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
    }
  }

  .flatpickr-weekday {
    color: $heading-color;
    font-size: 13px;
    font-weight: 400;
    line-height: 20px;
  }

  &::after,
  &::before {
    display: none;
  }

  .flatpickr-months {
    align-items: center;
    padding-block: 0.75rem;
    padding-inline: 1rem;

    .flatpickr-prev-month,
    .flatpickr-next-month {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border-radius: 4px;
      background: rgba(var(--v-theme-on-surface), var(--v-selected-opacity));
      block-size: 30px;
      color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
      inline-size: 30px;

      svg {
        block-size: 13px;
        inline-size: 13px;
        stroke: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
      }

      &:hover i,
      &:hover svg {
        fill: $body-color;
      }
    }
  }

  .flatpickr-current-month {
    inline-size: 100%;
    inset-inline-start: 0;
    padding-block: 6px 0;
    padding-inline: 0;

    span.cur-month {
      font-weight: 400;
    }
  }

  &.open {

    z-index: 2401;
  }

  &.hasTime.open {
    .flatpickr-time {
      border: none;
      block-size: auto;
    }
  }

  &.hasTime .flatpickr-time:first-child {
    border-color: transparent;
  }
}


.flatpickr-time input:hover,
.flatpickr-time .flatpickr-am-pm:hover,
.flatpickr-time input:focus,
.flatpickr-time .flatpickr-am-pm:focus {
  background: transparent;
}


.flatpickr-time {
  input.flatpickr-hour {
    font-weight: 400;
  }

  .flatpickr-am-pm,
  .flatpickr-time-separator,
  input {
    color: $heading-color;
  }

  .numInputWrapper {
    span {
      &.arrowUp {
        &::after {
          border-block-end-color: rgb(var(--v-border-color));
        }
      }

      &.arrowDown {
        &::after {
          border-block-start-color: rgb(var(--v-border-color));
        }
      }
    }
  }
}


.flatpickr-input[readonly],
.flatpickr-input ~ .form-control[readonly],
.flatpickr-human-friendly[readonly] {
  background-color: inherit;
}


.flatpickr-weekdays {
  block-size: auto;
  margin-block: 0.375rem !important;
}


.flatpickr-current-month {
  .flatpickr-monthDropdown-months {
    appearance: none;
    block-size: 24px;
  }

  .flatpickr-monthDropdown-months,
  .numInputWrapper {
    padding: 2px;
    border-radius: 4px;
    color: $heading-color;
    font-size: 0.9375rem;
    font-weight: 400;
    transition: all 0.15s ease-out;

    span {
      display: none;
    }

    input.cur-year {
      font-weight: 400 !important;
    }

    .flatpickr-monthDropdown-month {
      background-color: rgb(var(--v-theme-surface));
    }
  }
}

.flatpickr-day.flatpickr-disabled,
.flatpickr-day.flatpickr-disabled:hover {
  color: $body-color;
}
</style>
