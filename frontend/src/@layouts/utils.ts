import { AppContentLayoutNav } from '@layouts/enums'
import { resolveNavIconProps } from '@layouts/iconResolver'
import { useLayoutConfigStore } from '@layouts/stores/config'
import type { NavGroup, NavLink, NavLinkProps } from '@layouts/types'
import type { Router } from 'vue-router'

export const openGroups = ref<string[]>([])
export { resolveNavIconProps }

/**
 * Return nav link props to use

 */

export const getComputedNavLinkToProp = computed(() => (link: NavLink) => {
  const props: NavLinkProps = {
    target: link.target,
    rel: link.rel,
  }



  if (link.to)
    props.to = typeof link.to === 'string' ? { name: link.to } : link.to
  else props.href = link.href

  return props
})

/**
 * Return route name for navigation link
 * If link is string then it will assume it is route-name
 * IF link is object it will resolve the object and will return the link

 */
export const resolveNavLinkRouteName = (link: NavLink, router: Router) => {
  if (!link.to)
    return null

  if (typeof link.to === 'string')
    return link.to

  return router.resolve(link.to).name
}

/**
 * Check if nav-link is active
 * @param {object} link nav-link object
 */
export const isNavLinkActive = (link: NavLink, router: Router) => {

  const matchedRoutes = router.currentRoute.value.matched


  const resolveRoutedName = resolveNavLinkRouteName(link, router)

  if (!resolveRoutedName)
    return false

  return matchedRoutes.some(route => {
    return route.name === resolveRoutedName || route.meta.navActiveLink === resolveRoutedName
  })
}

/**
 * Check if nav group is active
 * @param {Array} children Group children
 */
export const isNavGroupActive = (children: (NavLink | NavGroup)[], router: Router): boolean =>
  children.some(child => {

    if ('children' in child)
      return isNavGroupActive(child.children, router)


    return isNavLinkActive(child, router)
  })

/**
 * Change `dir` attribute based on direction
 * @param dir 'ltr' | 'rtl'
 */
export const _setDirAttr = (dir: 'ltr' | 'rtl') => {

  if (typeof document !== 'undefined')
    document.documentElement.setAttribute('dir', dir)
}

export const switchToVerticalNavOnLtOverlayNavBreakpoint = () => {
  const configStore = useLayoutConfigStore()

  /*
      ℹ️ This is flag will hold nav type need to render when switching between lgAndUp from mdAndDown window width

      Requirement: When we nav is set to `horizontal` and we hit the `mdAndDown` breakpoint nav type shall change to `vertical` nav
      Now if we go back to `lgAndUp` breakpoint from `mdAndDown` how we will know which was previous nav type in large device?

      Let's assign value of `appContentLayoutNav` as default value of lgAndUpNav. Why 🤔?
        If template is viewed in lgAndUp
          We will assign `appContentLayoutNav` value to `lgAndUpNav` because at this point both constant is same
          Hence, for `lgAndUpNav` it will take value from theme config file
        else
          It will always show vertical nav and if user increase the window width it will fallback to `appContentLayoutNav` value
          But `appContentLayoutNav` will be value set in theme config file
    */
  const lgAndUpNav = ref(configStore.appContentLayoutNav)

  /*
      There might be case where we manually switch from vertical to horizontal nav and vice versa in `lgAndUp` screen
      So when user comes back from `mdAndDown` to `lgAndUp` we can set updated nav type
      For this we need to update the `lgAndUpNav` value if screen is `lgAndUp`
    */
  watch(
    () => configStore.appContentLayoutNav,
    value => {
      if (!configStore.isLessThanOverlayNavBreakpoint)
        lgAndUpNav.value = value
    },
  )

  /*
      This is layout switching part
      If it's `mdAndDown` => We will use vertical nav no matter what previous nav type was
      Or if it's `lgAndUp` we need to switch back to `lgAndUp` nav type. For this we will tracker property `lgAndUpNav`
    */
  watch(() => configStore.isLessThanOverlayNavBreakpoint, val => {
    configStore.appContentLayoutNav = val ? AppContentLayoutNav.Vertical : lgAndUpNav.value
  }, { immediate: true })
}
