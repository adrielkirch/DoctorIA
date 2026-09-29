import { defineThemeConfig } from '@core'
import { Skins } from '@core/enums'
import { breakpointsVuetifyV3 } from '@vueuse/core'
import { VIcon } from 'vuetify/components/VIcon'


import logo from '@images/logo.svg?raw'

import { AppContentLayoutNav, ContentWidth, FooterType, NavbarType } from '@layouts/enums'

export const { themeConfig, layoutConfig } = defineThemeConfig({
  app: {
    title: 'doctoria',
    logo: h('div', { innerHTML: logo, style: 'line-height:0; color: rgb(var(--v-global-theme-primary))' }),
    contentWidth: ContentWidth.Boxed,
    contentLayoutNav: AppContentLayoutNav.Vertical,
    overlayNavFromBreakpoint: breakpointsVuetifyV3.lg - 1, // 1 for matching with vuetify breakpoint. Docs: https://next.vuetifyjs.com/en/features/display-and-platform/
    theme: 'system',
    skin: Skins.Default,
    iconRenderer: VIcon,
  },
  navbar: {
    type: NavbarType.Sticky,
    navbarBlur: true,
  },
  footer: { type: FooterType.Hidden },
  verticalNav: {
    isVerticalNavCollapsed: false,
    defaultNavItemIconProps: { icon: 'bx-circle' },
    isVerticalNavSemiDark: false,
  },
  horizontalNav: {
    type: 'sticky',
    transition: 'slide-y-reverse-transition',
    popoverOffset: 6,
  },

  /*


  */
  icons: {
    chevronDown: { icon: 'bx-chevron-down', size: 22 },
    chevronRight: { icon: 'bx-chevron-right', size: 22 },
    close: { icon: 'bx-chevron-left', size: 22 },
    verticalNavPinned: { icon: 'bx-chevron-left', size: 22, class: 'flip-in-rtl' },
    verticalNavUnPinned: { icon: 'bx-chevron-left', size: 22, class: 'flip-in-rtl' },
    sectionTitlePlaceholder: { icon: 'bx-minus', color: 'disabled' },
  },
})
