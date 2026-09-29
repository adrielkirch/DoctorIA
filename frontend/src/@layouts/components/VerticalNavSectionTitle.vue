<script lang="ts" setup>
import { layoutConfig } from '@layouts'
import { can } from '@layouts/plugins/casl'
import { useLayoutConfigStore } from '@layouts/stores/config'
import type { NavSectionTitle } from '@layouts/types'
import { resolveNavIconProps } from '@layouts/utils'

const props = defineProps<{
  item: NavSectionTitle
}>()

const configStore = useLayoutConfigStore()
const shallRenderIcon = configStore.isVerticalNavMini()

const sectionTitlePlaceholderIcon = computed(() =>
  resolveNavIconProps(
    layoutConfig.icons.sectionTitlePlaceholder as Record<string, unknown>,
    {
      icon: 'bx-minus',
      color: 'disabled',
    },
  ),
)
</script>

<template>
  <li v-if="can(item.action, item.subject)" class="nav-section-title">
    <div class="title-wrapper">
      <Transition name="vertical-nav-section-title" mode="out-in">
        <Component :is="shallRenderIcon ? layoutConfig.app.iconRenderer : 'span'" :key="shallRenderIcon"
          :class="shallRenderIcon ? 'placeholder-icon' : 'title-text'"
          v-bind="shallRenderIcon ? sectionTitlePlaceholderIcon : {}">
          {{ !shallRenderIcon ? item.heading : null }}
        </Component>
      </Transition>
    </div>
  </li>
</template>

<style lang="scss">
.layout-vertical-nav {
  .nav-section-title {
    margin-block: 10px 4px;

    .title-wrapper {
      font-size: 0.85rem;
      letter-spacing: 0.08em;
      min-block-size: var(--compact-nav-row-height);
      padding-inline: var(--compact-nav-item-padding-x);
      text-transform: uppercase;
    }
  }
}
</style>
