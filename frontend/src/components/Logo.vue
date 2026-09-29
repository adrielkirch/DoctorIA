<script setup lang="ts">
import { useBranding } from '@/composables/useBranding'
import BrandLogo from './BrandLogo.vue'

interface Props {

  /** Show the brand name (also gated by the `showBrandName` setting). */
  showName?: boolean

  /**
   * Collapsed mode: only the logo is rendered — the name is never shown,
   * even when `showBrandName = true`.
   */
  collapsed?: boolean

  /**
   * Compact brand mark (default pattern for BOTH vertical navs — the main
   * sidebar and the chat history view): smaller logo (~24px) and reduced
   * typography. Combined with `collapsed` the logo shrinks further to fit
   * the mini rail (~80px) without overflow.
   */
  compact?: boolean

  /** Simulate a theme (used by the settings preview). */
  forceDark?: boolean | null
}

const props = withDefaults(defineProps<Props>(), {
  showName: false,
  collapsed: false,
  compact: false,
  forceDark: null,
})

const { branding } = useBranding()

const showNameFinal = computed(() =>
  props.showName && !props.collapsed && branding.value.showBrandName,
)
</script>

<template>
  <div
    class="brand-identity"
    :class="{
      'brand-identity--collapsed': collapsed,
      'brand-identity--compact': compact,
    }"
  >
    <BrandLogo
      :src="branding.logo"
      :alt="branding.logoAlt"
      :mode="branding.logoMode"
      :light="branding.logoLight"
      :dark="branding.logoDark"
      :force-dark="forceDark"
    />
    <Transition name="vertical-nav-app-title">
      <h1
        v-show="showNameFinal"
        class="brand-identity__name"
      >
        {{ branding.brandName }}
      </h1>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
.brand-identity {
  display: inline-flex;
  align-items: center;
  min-inline-size: 0;
  column-gap: 0.75rem;




  &--compact {
    --brand-logo-default-size: 1.5rem;
    column-gap: 0.5rem;

    .brand-logo {
      max-block-size: 24px;
      max-inline-size: 24px;
    }



    .brand-identity__name {
      font-size: 0.8125rem;
      font-weight: 600;
      line-height: 1rem;
    }
  }



  &--collapsed {
    .brand-logo {
      max-block-size: 40px;
      max-inline-size: 40px;
    }
  }




  &--compact#{&}--collapsed {
    --brand-logo-default-size: 1.125rem;

    .brand-logo {
      max-block-size: 32px;
      max-inline-size: 32px;
    }
  }

  &__name {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 500;
    line-height: 1.75rem;
    overflow: hidden;
    text-overflow: ellipsis;
    text-transform: capitalize;
    white-space: nowrap;
  }
}
</style>
