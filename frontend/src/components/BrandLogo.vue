<script setup lang="ts">
import type { LogoMode } from '@/@core/types/branding'
import { isMonochromeImage } from '@/utils/brandingImages'
import { VNodeRenderer } from '@layouts/components/VNodeRenderer'
import { themeConfig } from '@themeConfig'
import { cloneVNode } from 'vue'
import { useTheme } from 'vuetify'

interface Props {

  /** Custom logo (data URL) — falls back to the default app logo when null. */
  src?: string | null
  alt?: string
  mode?: LogoMode
  light?: string | null
  dark?: string | null

  /** Simulate a theme (used by the settings preview). */
  forceDark?: boolean | null
}

const props = withDefaults(defineProps<Props>(), {
  src: null,
  alt: '',
  mode: 'auto',
  light: null,
  dark: null,
  forceDark: null,
})

const { global } = useTheme()

const isDarkTheme = computed(() =>
  props.forceDark === null ? global.name.value === 'dark' : props.forceDark,
)



const defaultLogoNode = computed(() => cloneVNode(themeConfig.app.logo))

const isMonochrome = ref<boolean | null>(null)

watch(
  () => props.src,
  src => {
    isMonochrome.value = null

    if (!src)
      return

    isMonochromeImage(src).then(value => {

      if (props.src === src)
        isMonochrome.value = value
    })
  },
  { immediate: true },
)

const resolvedSrc = computed(() => {

  if (props.mode === 'light')
    return props.light ?? props.src

  if (props.mode === 'dark')
    return props.dark ?? props.src

  if (props.mode === 'original')
    return props.src


  return isDarkTheme.value ? (props.dark ?? props.src) : (props.light ?? props.src)
})

const shouldInvert = computed(() => {

  if (props.mode === 'original' || props.mode === 'light')
    return false


  if (props.mode === 'dark')
    return !props.dark


  if (!isDarkTheme.value || props.dark)
    return false


  if (!props.src)
    return true

  return isMonochrome.value === true
})
</script>

<template>
  <div
    class="brand-logo"
    :class="{ 'brand-logo--inverted': shouldInvert }"
  >
    <img
      v-if="resolvedSrc"
      :src="resolvedSrc"
      :alt="alt"
      class="brand-logo__img"
    >
    <div
      v-else
      class="brand-logo__default"
    >
      <VNodeRenderer :nodes="defaultLogoNode" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.brand-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-inline-size: 0;
  line-height: 0;

  &--inverted {
    filter: brightness(0) invert(1);
  }

  &__img {
    display: block;
    block-size: auto;
    inline-size: auto;
    max-block-size: 100%;
    max-inline-size: 100%;
    object-fit: contain;
  }

  &__default {
    display: inline-flex;
    line-height: 0;

    :deep(svg) {
      block-size: var(--brand-logo-default-size, 2.2rem);
      inline-size: var(--brand-logo-default-size, 2.2rem);
    }
  }
}
</style>
