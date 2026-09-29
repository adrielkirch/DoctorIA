import { useConfigStore } from '@core/stores/config'
import { AppContentLayoutNav } from '@layouts/enums'
import { VThemeProvider } from 'vuetify/components/VThemeProvider'



export const useSkins = () => {
  const configStore = useConfigStore()

  const layoutAttrs = computed(() => ({
    verticalNavAttrs: {
      wrapper: h(VThemeProvider, { tag: 'div' }),
      wrapperProps: {
        withBackground: true,
        theme: (configStore.isVerticalNavSemiDark && configStore.appContentLayoutNav === AppContentLayoutNav.Vertical)
          ? 'dark'
          : undefined,
      },
    },
  }))

  const injectSkinClasses = () => {
    if (typeof document !== 'undefined') {
      const bodyClasses = document.body.classList
      const genSkinClass = (_skin?: string) => `skin--${_skin}`

      watch(
        () => configStore.skin,
        (val, oldVal) => {
          bodyClasses.remove(genSkinClass(oldVal))
          bodyClasses.add(genSkinClass(val))
        },
        { immediate: true },
      )
    }
  }

  return {
    injectSkinClasses,
    layoutAttrs,
  }
}
