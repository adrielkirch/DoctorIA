import { cookieRef, useLayoutConfigStore } from '@layouts/stores/config'
import { themeConfig } from '@themeConfig'
import { storeToRefs } from 'pinia'
import { useTheme } from 'vuetify'


export const useConfigStore = defineStore('config', () => {

  const userPreferredColorScheme = usePreferredColorScheme()
  const cookieColorScheme = cookieRef<'light' | 'dark'>('color-scheme', 'light')

  watch(
    userPreferredColorScheme,
    val => {
      if (val !== 'no-preference')
        cookieColorScheme.value = val
    },
    { immediate: true },
  )

  const theme = cookieRef('theme', themeConfig.app.theme)


  const isVerticalNavSemiDark = cookieRef('isVerticalNavSemiDark', themeConfig.verticalNav.isVerticalNavSemiDark)


  const skin = cookieRef('skin', themeConfig.app.skin)


  const {
    isLessThanOverlayNavBreakpoint,
    appContentWidth,
    navbarType,
    isNavbarBlurEnabled,
    appContentLayoutNav,
    isVerticalNavCollapsed,
    footerType,
    isAppRTL,
  } = storeToRefs(useLayoutConfigStore())

  return {
    theme,
    isVerticalNavSemiDark,
    skin,


    isLessThanOverlayNavBreakpoint,
    appContentWidth,
    navbarType,
    isNavbarBlurEnabled,
    appContentLayoutNav,
    isVerticalNavCollapsed,
    footerType,
    isAppRTL,
  }
})



export const initConfigStore = () => {
  const userPreferredColorScheme = usePreferredColorScheme()
  const vuetifyTheme = useTheme()
  const configStore = useConfigStore()

  watch(
    [() => configStore.theme, userPreferredColorScheme],
    () => {
      const themetoUpdate = configStore.theme === 'system'
        ? userPreferredColorScheme.value === 'dark'
          ? 'dark'
          : 'light'
        : configStore.theme

      vuetifyTheme.change(themetoUpdate)
    })

  onMounted(() => {
    if (configStore.theme === 'system')
      vuetifyTheme.change(userPreferredColorScheme.value)
  })
}

