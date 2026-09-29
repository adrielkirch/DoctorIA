<script lang="ts" setup>
import { layoutConfig } from '@layouts'
import { can } from '@layouts/plugins/casl'
import type { NavLink } from '@layouts/types'
import { getComputedNavLinkToProp, isNavLinkActive } from '@layouts/utils'

interface Props {
  item: NavLink


  isSubItem?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isSubItem: false,
})

const label = computed(() => props.item.title)
</script>

<template>
  <li v-if="can(item.action, item.subject)" class="nav-link" :class="[
    {
      'sub-item': props.isSubItem,
      'disabled': item.disable,
    },
  ]">
    <Component :is="item.to ? 'RouterLink' : 'a'" v-bind="getComputedNavLinkToProp(item)" :class="{
      'router-link-active router-link-exact-active': isNavLinkActive(
        item,
        $router,
      ),
    }">
      <Component :is="layoutConfig.app.iconRenderer || 'div'" class="nav-item-icon" v-bind="item.icon && typeof item.icon === 'object' && item.icon !== null
          ? item.icon
          : layoutConfig.verticalNav.defaultNavItemIconProps || {}
        " />
      <span class="nav-item-title">
        {{ label }}
      </span>
    </Component>
  </li>
</template>

<style lang="scss">
.layout-horizontal-nav {
  .nav-link a {
    display: flex;
    align-items: center;
  }
}
</style>
