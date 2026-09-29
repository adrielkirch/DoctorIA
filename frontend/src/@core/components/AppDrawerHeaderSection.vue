<script setup lang="ts">
const props = defineProps<{
  title: string
}>()

defineEmits<{
  (e: 'cancel', el: MouseEvent): void
}>()
</script>

<template>
  <div class="px-6 py-5 d-flex align-center">
    <h5 class="text-h5">
      {{ props.title }}
    </h5>
    <VSpacer />

    <slot name="beforeClose" />

    <IconBtn @click="$emit('cancel', $event)">
      <VIcon
        icon="bx-x"
        size="24"
      />
    </IconBtn>
  </div>
</template>
