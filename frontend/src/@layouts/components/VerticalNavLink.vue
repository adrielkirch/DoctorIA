<script lang="ts" setup>
import { layoutConfig } from '@layouts'
import { can } from '@layouts/plugins/casl'
import { useLayoutConfigStore } from '@layouts/stores/config'
import type { NavLink } from '@layouts/types'
import {
  getComputedNavLinkToProp,
  isNavLinkActive,
  resolveNavIconProps,
} from '@layouts/utils'

const props = defineProps<{
  item: NavLink
}>()

const configStore = useLayoutConfigStore()
const hideTitleAndBadge = configStore.isVerticalNavMini()

const label = computed(() => props.item.title)

const resolveIcon = (icon: NavLink['icon']) =>
  resolveNavIconProps(
    icon,
    layoutConfig.verticalNav.defaultNavItemIconProps as Record<string, unknown>,
  )
</script>

<template>
  <li v-if="can(item.action, item.subject)" class="nav-link" :class="{ disabled: item.disable }">
    <Component :is="item.to ? 'RouterLink' : 'a'" v-bind="getComputedNavLinkToProp(item)" :class="{
      'router-link-active router-link-exact-active': isNavLinkActive(
        item,
        $router,
      ),
    }">
      <Component :is="layoutConfig.app.iconRenderer || 'div'" v-bind="resolveIcon(item.icon)" class="nav-item-icon" />
      <TransitionGroup name="transition-slide-x">
        <!-- 👉 Title -->
        <span v-show="!hideTitleAndBadge" key="title" class="nav-item-title" :class="{
          'nav-item-title-active-wrap': isNavLinkActive(item, $router),
        }" :title="label">
          {{ label }}
        </span>

        <!-- 👉 Badge -->
      </TransitionGroup>
    </Component>
  </li>
</template>

<style lang="scss">
.layout-vertical-nav {

  .nav-link>a {
    display: flex;
    align-items: center;
    border-radius: var(--compact-nav-item-radius);
    font-weight: 500;
    min-block-size: var(--compact-nav-row-height);
    padding-inline: var(--compact-nav-item-padding-x);
    transition:
      background-color 0.15s ease,
      color 0.15s ease;
  }

  /* prettier-ignore */
  .nav-link a:focus-visible {
    outline: rgb(var(--v-theme-primary)) solid var(--compact-nav-focus-outline-width);
    outline-offset: 1px;
  }

  .nav-item-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .nav-item-title-active-wrap {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    white-space: normal;
  }
}
</style>
