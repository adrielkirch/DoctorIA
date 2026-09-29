<script setup lang="ts">
import type { BrandingSettings } from '@/@core/types/branding';
import { useBranding } from '@/composables/useBranding';
import { useTheme } from 'vuetify';
import BrandLogo from './BrandLogo.vue';

interface Props {

  /** Draft settings to preview (falls back to the persisted branding). */
  settings?: BrandingSettings | null
}

const props = withDefaults(defineProps<Props>(), {
  settings: null,
})

const { branding } = useBranding()

const effective = computed(() => props.settings ?? branding.value)




const { global } = useTheme()
const previewDark = computed(() => global.name.value === 'dark')
</script>

<template>
  <div class="brand-preview">
    <div class="brand-preview__panel brand-preview__panel--light">
      <div class="brand-preview__label">
        Light mode
      </div>
      <div class="brand-preview__bar">
        <BrandLogo
          :src="effective.logo"
          :alt="effective.logoAlt"
          :mode="effective.logoMode"
          :light="effective.logoLight"
          :dark="effective.logoDark"
          :force-dark="false"
        />
        <span
          v-if="effective.showBrandName"
          class="brand-preview__name"
        >
          {{ effective.brandName }}
        </span>
      </div>
    </div>

    <div class="brand-preview__panel brand-preview__panel--dark">
      <div class="brand-preview__label">
        Dark mode
      </div>
      <div class="brand-preview__bar">
        <BrandLogo
          :src="effective.logo"
          :alt="effective.logoAlt"
          :mode="effective.logoMode"
          :light="effective.logoLight"
          :dark="effective.logoDark"
          force-dark
        />
        <span
          v-if="effective.showBrandName"
          class="brand-preview__name"
        >
          {{ effective.brandName }}
        </span>
      </div>
    </div>

    <!--
      ℹ️ Sidebar collapsed (mini rail): apenas a logo, reduzida para caber na
      área fixa sem cortar/deformar — o nome nunca aparece (regra da skill).
    -->
    <div class="brand-preview__panel brand-preview__panel--collapsed">
      <div class="brand-preview__label">
        Sidebar collapsed
      </div>
      <div class="brand-preview__mini">
        <BrandLogo
          :src="effective.logo"
          :alt="effective.logoAlt"
          :mode="effective.logoMode"
          :light="effective.logoLight"
          :dark="effective.logoDark"
          :force-dark="previewDark"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>




.brand-preview {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));

  &__panel {
    padding: 1rem;
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-radius: 0.5rem;
  }

  &__label {
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    margin-block-end: 0.75rem;
    text-transform: uppercase;
  }

  &__bar {
    display: flex;
    align-items: center;
    column-gap: 0.75rem;
    min-block-size: 3rem;
  }

  &__name {
    font-size: 1rem;
    font-weight: 500;
    line-height: 1.5rem;
    text-transform: capitalize;
  }

  &__panel--light {
    background-color: #fff;
    color: #111827;

    .brand-preview__label {
      color: rgb(17 24 39 / 60%);
    }
  }

  &__panel--dark {
    background-color: #1e1e1e;
    color: #fff;

    .brand-preview__name {
      color: #fff;
    }

    .brand-preview__label {
      color: rgb(255 255 255 / 70%);
    }
  }




  &__panel--collapsed {
    background-color: rgb(var(--v-theme-surface));
    color: rgb(var(--v-theme-on-surface));
  }

  &__mini {
    display: flex;
    align-items: center;
    justify-content: center;
    inline-size: 48px;
    min-block-size: 3rem;
    margin-inline: auto;
    border-radius: 0.375rem;

    .brand-logo {
      max-block-size: 32px;
      max-inline-size: 32px;
    }
  }
}
</style>
