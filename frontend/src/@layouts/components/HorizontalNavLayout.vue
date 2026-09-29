<script lang="ts" setup>
import { HorizontalNav } from '@layouts/components';
import type { HorizontalNavItems } from '@layouts/types';



import { useLayoutConfigStore } from '@layouts/stores/config';

defineProps<{
  navItems: HorizontalNavItems
}>()

const configStore = useLayoutConfigStore()
</script>

<template>
  <div
    class="layout-wrapper"
    data-allow-mismatch
    :class="configStore._layoutClasses"
  >
    <div
      class="layout-navbar-and-nav-container"
      :class="configStore.isNavbarBlurEnabled && 'header-blur'"
    >
      <!-- 👉 Navbar -->
      <div class="layout-navbar">
        <div class="navbar-content-container">
          <slot name="navbar" />
        </div>
      </div>
      <!-- 👉 Navigation -->
      <div class="layout-horizontal-nav">
        <div class="horizontal-nav-content-container">
          <HorizontalNav :nav-items="navItems" />
        </div>
      </div>
    </div>

    <main class="layout-page-content">
      <slot />
    </main>

    <!-- 👉 Footer -->
    <footer class="layout-footer">
      <div class="footer-content-container">
        <slot name="footer" />
      </div>
    </footer>
  </div>
</template>

<style lang="scss">
@use "@configured-variables" as variables;
@use "@layouts/styles/placeholders";
@use "@layouts/styles/mixins";

.layout-wrapper {
  &.layout-nav-type-horizontal {
    display: flex;
    flex-direction: column;



    min-block-size: 100dvh;

    .layout-navbar-and-nav-container {
      z-index: 1;
    }

    .layout-navbar {
      z-index: variables.$layout-horizontal-nav-layout-navbar-z-index;
      block-size: variables.$layout-horizontal-nav-navbar-height;












    }


    .navbar-content-container {
      @include mixins.boxed-content;
    }


    &.layout-content-height-fixed {
      max-block-size: 100dvh;

      .layout-page-content {
        overflow: hidden;

        > :first-child {
          max-block-size: 100%;
          overflow-y: auto;
        }
      }
    }



    .layout-footer {
      .footer-content-container {
        @include mixins.boxed-content;
      }
    }
  }


  &.layout-navbar-sticky.horizontal-nav-sticky {
    .layout-navbar-and-nav-container {
      position: sticky;
      inset-block-start: 0;
      will-change: transform;
    }
  }

  &.layout-navbar-hidden.horizontal-nav-hidden {
    .layout-navbar-and-nav-container {
      display: none;
    }
  }
}


.layout-horizontal-nav {
  z-index: variables.$layout-horizontal-nav-z-index;












  .horizontal-nav-content-container {
    @include mixins.boxed-content(true);
  }
}
</style>
