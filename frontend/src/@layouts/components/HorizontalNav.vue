<script lang="ts" setup>
import { filterFeatureFlagNavItems } from '@/config/featureFlags'
import { useAccessControlStore } from '@/stores/useAccessControlStore'
import { filterAccessibleNavItems } from '@/utils/accessControlNav'
import { HorizontalNavGroup, HorizontalNavLink } from '@layouts/components'
import type { HorizontalNavItems, NavGroup, NavLink } from '@layouts/types'
import { computed } from 'vue'

const props = defineProps<{
  navItems: HorizontalNavItems
}>()


const flagFilteredNavItems = computed(() => filterFeatureFlagNavItems(props.navItems))


const accessControlStore = useAccessControlStore()
accessControlStore.ensureLoaded()

const filteredNavItems = computed(() =>
  filterAccessibleNavItems(
    flagFilteredNavItems.value,
    featureKey => accessControlStore.can(featureKey),
  ),
)

const resolveNavItemComponent = (item: NavLink | NavGroup) => {
  if ('children' in item)
    return HorizontalNavGroup

  return HorizontalNavLink
}
</script>

<template>
  <ul class="nav-items">
    <Component
      :is="resolveNavItemComponent(item)"
      v-for="(item, index) in filteredNavItems"
      :key="index"
      data-allow-mismatch
      :item="item"
    />
  </ul>
</template>

<style lang="scss">
.layout-wrapper.layout-nav-type-horizontal {
  .nav-items {
    display: flex;
    flex-wrap: wrap;
  }
}
</style>
