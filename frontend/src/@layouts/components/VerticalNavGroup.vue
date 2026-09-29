<script lang="ts" setup>
import { layoutConfig } from '@layouts'
import { TransitionExpand, VerticalNavLink } from '@layouts/components'
import { canViewNavMenuGroup } from '@layouts/plugins/casl'
import { useLayoutConfigStore } from '@layouts/stores/config'
import { injectionKeyIsVerticalNavHovered } from '@layouts/symbols'
import type { NavGroup } from '@layouts/types'
import {
  isNavGroupActive,
  openGroups,
  resolveNavIconProps,
} from '@layouts/utils'
import { TransitionGroup } from 'vue'

defineOptions({
  name: 'VerticalNavGroup',
})

const props = defineProps<{
  item: NavGroup
}>()

const route = useRoute()
const router = useRouter()
const configStore = useLayoutConfigStore()
const hideTitleAndBadge = configStore.isVerticalNavMini()

const label = computed(() => props.item.title)

/*
  ℹ️ We provided default value `ref(false)` because inject will return `T | undefined`
  Docs: https://vuejs.org/api/composition-api-dependency-injection.html#inject
*/
const isVerticalNavHovered = inject(
  injectionKeyIsVerticalNavHovered,
  ref(false),
)

const isGroupActive = ref(false)
const isGroupOpen = ref(false)

const resolveIcon = (icon: NavGroup['icon']) =>
  resolveNavIconProps(
    icon,
    layoutConfig.verticalNav.defaultNavItemIconProps as Record<string, unknown>,
  )

/**
 * Checks if any of children group is open or not.
 * This is helpful in preventing closing inactive parent group when inactive child group is opened. (i.e. Do not close "Nav Levels" group if child "Nav Level 2.2" is opened/clicked)
 *
 * @param {NavGroup['children']} children  - Nav group children
 * @return {boolean} returns if any of children is open or not.
 */
const isAnyChildOpen = (children: NavGroup['children']): boolean => {
  return children.some(child => {
    let result = openGroups.value.includes(child.title)

    if ('children' in child)
      result = isAnyChildOpen(child.children) || result

    return result
  })
}

const collapseChildren = (children: NavGroup['children']) => {
  children.forEach(child => {
    if ('children' in child)
      collapseChildren(child.children)

    openGroups.value = openGroups.value.filter(
      group => group !== child.title,
    )
  })
}

/*
  Watch for route changes, more specifically route path. Do note that this won't trigger if route's query is updated.

  updates isActive & isOpen based on active state of group.
*/
watch(
  () => route.path,
  () => {
    const isActive = isNavGroupActive(props.item.children, router)


    isGroupOpen.value
      = isActive && !configStore.isVerticalNavMini(isVerticalNavHovered).value
    isGroupActive.value = isActive
  },
  { immediate: true },
)

/*
  Watch for isGroupOpen

    1. Find group index for adding/removing group from openGroups array
    2. update openGroups array for addition/removal of current group

  We need `immediate: true` because without it initially opened group is not added in openGroups array
*/
watch(
  isGroupOpen,
  (val: boolean) => {

    const grpIndex = openGroups.value.indexOf(props.item.title)




    if (val && grpIndex === -1) {
      openGroups.value.push(props.item.title)
    }


    else if (!val && grpIndex !== -1) {
      openGroups.value.splice(grpIndex, 1)
      collapseChildren(props.item.children)
    }
  },
  { immediate: true },
)

/*
  Watch for openGroups

  It will help in making vertical nav adapting the behavior of accordion.
  If we open multiple groups without navigating to any route we must close the inactive or temporarily opened groups.

  😵‍💫 Gotchas:
    * If we open inactive group then it will auto close that group because we close groups based on active state.
      Goal of this watcher is auto close groups which are not active when openGroups array is updated.
      So, we have to find a way to do not close recently opened inactive group.
      For this we will fetch recently added group in openGroups array and won't perform closing operation if recently added group is current group
*/
watch(
  openGroups,
  val => {

    const lastOpenedGroup = val.at(-1)
    if (lastOpenedGroup === props.item.title)
      return

    const isActive = isNavGroupActive(props.item.children, router)


    if (isActive)
      return


    if (isAnyChildOpen(props.item.children))
      return

    isGroupOpen.value = isActive
    isGroupActive.value = isActive
  },
  { deep: true },
)


watch(configStore.isVerticalNavMini(isVerticalNavHovered), val => {
  isGroupOpen.value = val ? false : isGroupActive.value
})
</script>

<template>
  <li v-if="canViewNavMenuGroup(item)" class="nav-group" :class="[
    {
      active: isGroupActive,
      open: isGroupOpen,
      disabled: item.disable,
    },
  ]">
    <div class="nav-group-label" @click="isGroupOpen = !isGroupOpen">
      <Component :is="layoutConfig.app.iconRenderer || 'div'" v-bind="resolveIcon(item.icon)" class="nav-item-icon" />

      <Component :is="TransitionGroup" name="transition-slide-x">
        <!-- 👉 Title -->
        <Component is="span" v-show="!hideTitleAndBadge" key="title" class="nav-item-title" :title="label">
          {{ label }}
        </Component>

        <Component :is="layoutConfig.app.iconRenderer || 'div'" v-show="!hideTitleAndBadge"
          v-bind="layoutConfig.icons.chevronRight" key="arrow" class="nav-group-arrow" />
      </Component>
    </div>
    <TransitionExpand>
      <ul v-show="isGroupOpen" class="nav-group-children">
        <Component :is="'children' in child ? 'VerticalNavGroup' : VerticalNavLink" v-for="child in item.children"
          :key="child.title" :item="child" />
      </ul>
    </TransitionExpand>
  </li>
</template>

<style lang="scss">
.layout-vertical-nav {
  .nav-group {
    margin-block: 2px;

    &-label {
      display: flex;
      align-items: center;
      border-radius: var(--compact-nav-item-radius);
      cursor: pointer;
      min-block-size: var(--compact-nav-row-height);
      padding-inline: var(--compact-nav-item-padding-x);
    }

    &.active>.nav-group-label {
      background-color: transparent;
      border-inline-start: 2px solid rgb(var(--v-theme-primary));
    }
  }
}
</style>
