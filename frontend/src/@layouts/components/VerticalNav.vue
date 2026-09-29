<script lang="ts" setup>
import SidebarBrandHeader from '@/components/SidebarBrandHeader.vue'
import { filterFeatureFlagNavItems } from '@/config/featureFlags'
import { useAccessControlStore } from '@/stores/useAccessControlStore'
import { filterAccessibleNavItems } from '@/utils/accessControlNav'
import { layoutConfig } from '@layouts'
import {
  VerticalNavGroup,
  VerticalNavLink,
  VerticalNavSectionTitle,
} from '@layouts/components'
import { useLayoutConfigStore } from '@layouts/stores/config'
import { injectionKeyIsVerticalNavHovered } from '@layouts/symbols'
import type {
  NavGroup,
  NavLink,
  NavSectionTitle,
  VerticalNavItems,
} from '@layouts/types'
import { type Component, computed } from 'vue'
import { PerfectScrollbar } from 'vue3-perfect-scrollbar'

interface Props {
  tag?: string | Component
  navItems: VerticalNavItems
  isOverlayNavActive: boolean
  toggleIsOverlayNavActive: (value: boolean) => void
}

const props = withDefaults(defineProps<Props>(), {
  tag: 'aside',
})


const flagFilteredNavItems = computed(() => filterFeatureFlagNavItems(props.navItems))


const accessControlStore = useAccessControlStore()


accessControlStore.ensureLoaded()

const filteredNavItems = computed(() =>
  filterAccessibleNavItems(
    flagFilteredNavItems.value,
    featureKey => accessControlStore.can(featureKey),
  ),
)

const refNav = ref()

const isHovered = useElementHover(refNav)

provide(injectionKeyIsVerticalNavHovered, isHovered)

const configStore = useLayoutConfigStore()

const resolveNavItemComponent = (
  item: NavLink | NavSectionTitle | NavGroup,
): unknown => {
  if ('heading' in item)
    return VerticalNavSectionTitle
  if ('children' in item)
    return VerticalNavGroup

  return VerticalNavLink
}

/*
  ℹ️ Close overlay side when route is changed
  Close overlay vertical nav when link is clicked
*/
const route = useRoute()

watch(
  () => route.name,
  () => {
    props.toggleIsOverlayNavActive(false)
  },
)

const isVerticalNavScrolled = ref(false)

const updateIsVerticalNavScrolled = (val: boolean) =>
  (isVerticalNavScrolled.value = val)

const handleNavScroll = (evt: Event) => {
  isVerticalNavScrolled.value = (evt.target as HTMLElement).scrollTop > 0
}

const hideTitleAndIcon = configStore.isVerticalNavMini(isHovered)
</script>

<template>
  <Component
    :is="props.tag"
    ref="refNav"
    data-allow-mismatch
    class="layout-vertical-nav compact-nav-enabled"
    :class="[
      {
        'compact-nav-dense': configStore.isLessThanOverlayNavBreakpoint,
        'overlay-nav': configStore.isLessThanOverlayNavBreakpoint,
        'hovered': isHovered,
        'visible': isOverlayNavActive,
        'scrolled': isVerticalNavScrolled,
      },
    ]"
  >
    <!-- 👉 Header -->
    <div class="nav-header">
      <slot name="nav-header">
        <!--
          ℹ️ Header default REUTILIZA o `SidebarBrandHeader` compartilhado com a
          view de chats (barra ~44px, marca alinhada aos itens, `Logo
          compact`). As ações de collapse (pin/unpin/close) entram pelo slot
          `#actions` — só aqui.
        -->
        <SidebarBrandHeader
          :show-name="!hideTitleAndIcon"
          :collapsed="hideTitleAndIcon"
        >
          <template #actions>
            <!-- 👉 Vertical nav actions (ghost button na barra) -->
            <!-- Show toggle collapsible in >md and close button in <md -->
            <div class="header-action">
              <Component
                :is="layoutConfig.app.iconRenderer || 'div'"
                v-show="configStore.isVerticalNavCollapsed"
                class="d-none nav-unpin"
                :class="configStore.isVerticalNavCollapsed && 'd-lg-block'"
                v-bind="layoutConfig.icons.verticalNavUnPinned"
                @click="
                  configStore.isVerticalNavCollapsed
                    = !configStore.isVerticalNavCollapsed
                "
              />
              <Component
                :is="layoutConfig.app.iconRenderer || 'div'"
                v-show="!configStore.isVerticalNavCollapsed"
                class="d-none nav-pin"
                :class="!configStore.isVerticalNavCollapsed && 'd-lg-block'"
                v-bind="layoutConfig.icons.verticalNavPinned"
                @click="
                  configStore.isVerticalNavCollapsed
                    = !configStore.isVerticalNavCollapsed
                "
              />
              <Component
                :is="layoutConfig.app.iconRenderer || 'div'"
                class="d-lg-none"
                v-bind="layoutConfig.icons.close"
                @click="toggleIsOverlayNavActive(false)"
              />
            </div>
          </template>
        </SidebarBrandHeader>
      </slot>
    </div>
    <slot name="before-nav-items">
      <div class="vertical-nav-items-shadow" />
    </slot>
    <slot
      name="nav-items"
      :update-is-vertical-nav-scrolled="updateIsVerticalNavScrolled"
    >
      <PerfectScrollbar
        :key="String(configStore.isAppRTL)"
        tag="ul"
        class="nav-items"
        :options="{ wheelPropagation: false }"
        @ps-scroll-y="handleNavScroll"
      >
        <Component
          :is="resolveNavItemComponent(item)"
          v-for="(item, index) in filteredNavItems"
          :key="index"
          :item="item"
        />
      </PerfectScrollbar>
    </slot>
    <slot name="after-nav-items" />
  </Component>
</template>

<style lang="scss">
@use "@configured-variables" as variables;
@use "@layouts/styles/mixins";


.layout-vertical-nav {
  position: fixed;
  z-index: variables.$layout-vertical-nav-z-index;
  display: flex;
  flex-direction: column;
  block-size: 100%;
  inline-size: variables.$layout-vertical-nav-width;
  inset-block-start: 0;
  inset-inline-start: 0;
  transition:
    inline-size 0.25s ease-in-out,
    box-shadow 0.25s ease-in-out;
  will-change: transform, inline-size;

  .nav-header {
    display: flex;
    align-items: center;

    .header-action {
      cursor: pointer;

      @at-root {


        #{variables.$selector-vertical-nav-mini} .nav-header .header-action {
          display: none !important;
        }
      }
    }
  }






  .layout-vertical-nav-collapsed & {
    &:not(.hovered) {
      .nav-items {
        padding-block-start: 0;
      }

      .nav-section-title {
        margin-block: 0.5rem 0.25rem;

        .title-wrapper {
          min-block-size: 1.25rem;
          padding-inline: 0;
        }
      }





      .nav-items > .nav-link > a,
      .nav-items > .nav-group > .nav-group-label {
        gap: 0;
        inline-size: 2rem; // pílula 32×32 do ícone — mesma base do row-height
        justify-content: center;
        margin-inline: auto; // centraliza horizontalmente a pílula
        padding-inline: 0;

        .nav-item-icon {
          margin-inline-end: 0; // zera o espaçamento do título escondido
        }
      }

      .nav-items > .nav-group > .nav-group-label .nav-group-arrow {
        display: none;
      }


      .nav-items .nav-group-children {
        display: none;
      }
      .nav-items > .nav-link > a.router-link-exact-active,
      .nav-items > .nav-group.active > .nav-group-label {
        background-color: var(--compact-nav-active-bg, rgba(16, 185, 129, 0.09)) !important;
        color: rgb(var(--v-theme-primary)) !important;
      }
    }
  }

  .nav-items {
    block-size: 100%;






  }

  .nav-item-title {
    overflow: hidden;
    margin-inline-end: auto;
    text-overflow: ellipsis;
    white-space: nowrap;
  }



  .nav-item-icon {
    color: inherit;
  }

  &.compact-nav-enabled .nav-section-title {
    margin-block: 0.875rem 0.25rem;




    .title-wrapper {
      display: flex;
      align-items: center;
      color: var(--compact-nav-section-title-color, #64748b);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.05em;
      line-height: 1rem;
      min-block-size: unset;
      padding-inline: var(--compact-nav-item-padding-x);
      text-transform: uppercase;
    }
  }


  .layout-vertical-nav-collapsed & {
    &:not(.hovered) {
      inline-size: variables.$layout-vertical-nav-collapsed-width;
    }
  }
}


@media (max-width: 1279px) {
  .layout-vertical-nav {
    &:not(.visible) {
      transform: translateX(-#{variables.$layout-vertical-nav-width});

      @include mixins.rtl {
        transform: translateX(variables.$layout-vertical-nav-width);
      }
    }

    transition: transform 0.25s ease-in-out;
  }
}
</style>
