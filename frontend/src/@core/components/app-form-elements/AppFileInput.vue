<script lang="ts" setup>
defineOptions({
  name: 'AppFileInput',
  inheritAttrs: false,
})

const elementId = computed (() => {
  const attrs = useAttrs()
  const _elementIdToken = attrs.id || attrs.label

  const _id = useId()

  return _elementIdToken ? `app-file-input-${_elementIdToken}` : _id
})

const label = computed(() => useAttrs().label as string | undefined)
</script>

<template>
  <div
    class="app-file-input flex-grow-1"
    :class="$attrs.class"
  >
    <VLabel
      v-if="label"
      :for="elementId"
      class="mb-1 text-body-2 text-wrap"
      style="line-height: 15px;"
      :text="label"
    />
    <VFileInput
      v-bind="{
        ...$attrs,
        class: null,
        label: undefined,
        variant: 'outlined',
        id: elementId,
      }"
    >
      <template
        v-for="(_, name) in $slots"
        #[name]="slotProps"
      >
        <slot
          :name="name"
          v-bind="slotProps || {}"
        />
      </template>
    </VFileInput>
  </div>
</template>
