<script lang="ts" setup>
interface Props {
  menuList?: unknown[]
  itemProps?: boolean
  iconSize?: string
  class?: string
}

const props = withDefaults(defineProps<Props>(), {
  class: 'text-disabled',
})
</script>

<template>
  <IconBtn :class="props.class">
    <VIcon
      :size="iconSize"
      icon="bx-dots-vertical-rounded"
    />

    <VMenu
      v-if="props.menuList"
      activator="parent"
    >
      <VList
        :items="props.menuList"
        :item-props="props.itemProps"
      />
    </VMenu>
  </IconBtn>
</template>
