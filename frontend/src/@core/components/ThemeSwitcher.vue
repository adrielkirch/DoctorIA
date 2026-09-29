<script setup lang="ts">
import { useConfigStore } from '@core/stores/config';
import type { ThemeSwitcherTheme } from '@layouts/types';

const props = defineProps<{
  themes: ThemeSwitcherTheme[]
}>()

const configStore = useConfigStore()

const selectedItem = ref([configStore.theme])


watch(
  () => configStore.theme,
  () => {
    selectedItem.value = [configStore.theme]
  },
  { deep: true },
)
</script>

<template>
  <IconBtn color="rgba(var(--v-theme-on-surface), var(--v-high-emphasis-opacity))">
    <VIcon
      :icon="props.themes.find((t) => t.name === configStore.theme)?.icon"
      size="22"
    />

    <VTooltip
      activator="parent"
      open-delay="1000"
      scroll-strategy="close"
    >
      <span class="text-capitalize">{{ configStore.theme }}</span>
    </VTooltip>

    <VMenu
      activator="parent"
      offset="21px"
      :width="180"
    >
      <VList
        v-model:selected="selectedItem"
        mandatory
      >
        <VListItem
          v-for="{ name, icon } in props.themes"
          :key="name"
          :value="name"
          color="primary"
          @click="
            () => {
              configStore.theme = name;
            }
          "
        >
          <template #prepend>
            <VIcon
              :icon="icon"
              size="22"
            />
          </template>
          <VListItemTitle class="text-capitalize">
            {{ name }}
          </VListItemTitle>
        </VListItem>
      </VList>
    </VMenu>
  </IconBtn>
</template>
