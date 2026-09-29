import type { OffsetOptions } from '@floating-ui/dom'
import type { AppContentLayoutNav, ContentWidth, FooterType, HorizontalNavType, NavbarType } from '@layouts/enums'
import type { RouteLocationRaw } from 'vue-router'

export interface LayoutConfig {
  app: {
    title: Lowercase<string>
    logo: VNode
    contentWidth: typeof ContentWidth[keyof typeof ContentWidth]
    contentLayoutNav: typeof AppContentLayoutNav[keyof typeof AppContentLayoutNav]
    overlayNavFromBreakpoint: number


    iconRenderer: Component
  }
  navbar: {
    type: typeof NavbarType[keyof typeof NavbarType]
    navbarBlur: boolean
  }
  footer: {
    type: typeof FooterType[keyof typeof FooterType]
  }
  verticalNav: {
    isVerticalNavCollapsed: boolean
    defaultNavItemIconProps: unknown
  }
  horizontalNav: {
    type: typeof HorizontalNavType[keyof typeof HorizontalNavType]
    transition: string | Component
    popoverOffset?: OffsetOptions
  }
  icons: {
    chevronDown: any
    chevronRight: any
    close: any
    verticalNavPinned: any
    verticalNavUnPinned: any
    sectionTitlePlaceholder: any
  }
}

export interface AclProperties {
  action: string
  subject: string
}


export interface NavSectionTitle extends Partial<AclProperties> {
  heading: string
}


declare type ATagTargetAttrValues = '_blank' | '_self' | '_parent' | '_top' | 'framename'
declare type ATagRelAttrValues =
  | 'alternate'
  | 'author'
  | 'bookmark'
  | 'external'
  | 'help'
  | 'license'
  | 'next'
  | 'nofollow'
  | 'noopener'
  | 'noreferrer'
  | 'prev'
  | 'search'
  | 'tag'

export interface NavLinkProps {
  to?: RouteLocationRaw | string | null
  href?: string
  target?: ATagTargetAttrValues
  rel?: ATagRelAttrValues
}

export interface NavIconProps {
  icon?: string
  color?: string
  class?: string
  size?: string | number
  [key: string]: unknown
}

export interface NavLink extends NavLinkProps, Partial<AclProperties> {
  title: string
  icon?: NavIconProps | string
  badgeContent?: string
  badgeClass?: string
  disable?: boolean
}


export interface NavGroup extends Partial<AclProperties> {
  title: string
  icon?: NavIconProps | string
  badgeContent?: string
  badgeClass?: string
  children: (NavLink | NavGroup)[]
  disable?: boolean
}

export declare type VerticalNavItems = (NavLink | NavGroup | NavSectionTitle)[]
export declare type HorizontalNavItems = (NavLink | NavGroup)[]



export interface ThemeSwitcherTheme {
  name: string
  icon: string
}
