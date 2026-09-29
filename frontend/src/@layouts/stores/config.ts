import { AppContentLayoutNav, NavbarType } from '@layouts/enums'
import { injectionKeyIsVerticalNavHovered } from '@layouts/symbols'
import { _setDirAttr } from '@layouts/utils'


import { layoutConfig } from '@themeConfig'

export const namespaceConfig = (str: string) => `${layoutConfig.app.title}-${str}`

export const cookieRef = <T>(key: string, defaultValue: T) => {
  return useCookie<T>(namespaceConfig(key), { default: () => defaultValue })
}

export const useLayoutConfigStore = defineStore('layoutConfig', () => {
  const route = useRoute()


  const navbarType = ref(layoutConfig.navbar.type)


  const isNavbarBlurEnabled = cookieRef('isNavbarBlurEnabled', layoutConfig.navbar.navbarBlur)


  const isVerticalNavCollapsed = cookieRef('isVerticalNavCollapsed', layoutConfig.verticalNav.isVerticalNavCollapsed)


  const appContentWidth = cookieRef('appContentWidth', layoutConfig.app.contentWidth)


  const appContentLayoutNav = ref(layoutConfig.app.contentLayoutNav)

  watch(appContentLayoutNav, val => {

    if (val === AppContentLayoutNav.Horizontal) {
      if (navbarType.value === NavbarType.Hidden)
        navbarType.value = NavbarType.Sticky

      isVerticalNavCollapsed.value = false
    }
  })


  const horizontalNavType = ref(layoutConfig.horizontalNav.type)


  const horizontalNavPopoverOffset = ref(layoutConfig.horizontalNav.popoverOffset)


  const footerType = ref(layoutConfig.footer.type)


  const breakpointRef = ref(false)


  watchEffect(() => {
    breakpointRef.value = useMediaQuery(
      `(max-width: ${layoutConfig.app.overlayNavFromBreakpoint}px)`,
    ).value
  })

  const isLessThanOverlayNavBreakpoint = computed({
    get() {
      return breakpointRef.value // Getter for reactive state
    },
    set(value) {
      breakpointRef.value = value // Allow manual mutation
    },
  })


  const _layoutClasses = computed(() => {
    const { y: windowScrollY } = useWindowScroll()

    return [
      `layout-nav-type-${appContentLayoutNav.value}`,
      `layout-navbar-${navbarType.value}`,
      `layout-footer-${footerType.value}`,
      {
        'layout-vertical-nav-collapsed':
          isVerticalNavCollapsed.value
          && appContentLayoutNav.value === 'vertical'
          && !isLessThanOverlayNavBreakpoint.value,
      },
      { [`horizontal-nav-${horizontalNavType.value}`]: appContentLayoutNav.value === 'horizontal' },
      `layout-content-width-${appContentWidth.value}`,
      { 'layout-overlay-nav': isLessThanOverlayNavBreakpoint.value },
      { 'window-scrolled': unref(windowScrollY) },
      route.meta.layoutWrapperClasses ? route.meta.layoutWrapperClasses : null,
    ]
  })



  const isAppRTL = ref(false)

  watch(isAppRTL, val => {
    _setDirAttr(val ? 'rtl' : 'ltr')
  })


  /*
    This function will return true if current state is mini. Mini state means vertical nav is:
      - Collapsed
      - Isn't hovered by mouse
      - nav is not less than overlay breakpoint (hence, isn't overlay menu)

    ℹ️ We are getting `isVerticalNavHovered` as param instead of via `inject` because
        we are using this in `VerticalNav.vue` component which provide it and I guess because
        same component is providing & injecting we are getting undefined error
  */
  const isVerticalNavMini = (isVerticalNavHovered: Ref<boolean> | null = null) => {
    const isVerticalNavHoveredLocal = isVerticalNavHovered || inject(injectionKeyIsVerticalNavHovered) || ref(false)

    return computed(() => isVerticalNavCollapsed.value && !isVerticalNavHoveredLocal.value && !isLessThanOverlayNavBreakpoint.value)
  }

  return {
    appContentWidth,
    appContentLayoutNav,
    navbarType,
    isNavbarBlurEnabled,
    isVerticalNavCollapsed,
    horizontalNavType,
    horizontalNavPopoverOffset,
    footerType,
    isLessThanOverlayNavBreakpoint,
    isAppRTL,
    _layoutClasses,
    isVerticalNavMini,
  }
})
