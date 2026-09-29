import { isRouteNameDisabled } from '@/config/featureFlags'
import { frozenModules } from '@/navigation/frozenModules'
import { resolveAccessibleHomeRoute } from '@/utils/accessControlNav'
import { canNavigate } from '@layouts/plugins/casl'
import type { RouteNamedMap, _RouterTyped } from 'unplugin-vue-router'

/**
 * Check if a route path matches a frozen module
 * US2: Frozen modules can still be accessed directly if policy allows
 */
function isFrozenModuleRoute(path: string): boolean {
  return frozenModules.some(module =>
    module.routePrefixes.some(prefix =>
      path.toLowerCase().startsWith(prefix.toLowerCase()),
    ),
  )
}

/**
 * Check if direct access is allowed for a frozen module route
 * US2: Respects directAccessPolicy from frozen modules
 */
function canAccessFrozenModule(path: string, isLoggedIn: boolean): boolean {
  const matchedModule = frozenModules.find(module =>
    module.routePrefixes.some(prefix =>
      path.toLowerCase().startsWith(prefix.toLowerCase()),
    ),
  )

  if (!matchedModule)
    return true // Not a frozen module, allow normal flow


  if (matchedModule.directAccessPolicy === 'allow-authorized')
    return isLoggedIn // Allow if authenticated

  if (matchedModule.directAccessPolicy === 'deny-all')
    return false // Block all access

  if (matchedModule.directAccessPolicy === 'allow-admin')
    return isLoggedIn // For now, treat as allow-authorized (admin check would need user role)

  return false
}

export const setupGuards = (router: _RouterTyped<RouteNamedMap & { [key: string]: any }>) => {


  router.beforeEach(to => {




    if (to.name && isRouteNameDisabled(String(to.name)))
      return resolveAccessibleHomeRoute() ?? { name: 'tenants' }

    /*
     * If it's a public route, continue navigation. This kind of pages are allowed to visited by login & non-login users. Basically, without any restrictions.
     * Examples of public routes are, 404, under maintenance, etc.
     */
    if (to.meta.public)
      return

    /**
     * Check if user is logged in by checking if token & user data exists in local storage
     * Feel free to update this logic to suit your needs
     */
    const isLoggedIn = !!(useCookie('userData').value && useCookie('accessToken').value)

    /*
      If user is logged in and is trying to access login like page, redirect to home
      else allow visiting the page
      (WARN: Don't allow executing further by return statement because next code will check for permissions)
     */
    if (to.meta.unauthenticatedOnly) {
      if (isLoggedIn)
        return '/'
      else
        return undefined
    }


    if (!isLoggedIn) {
      return {
        name: 'login',
        query: {
          ...to.query,
          to: to.fullPath !== '/' ? to.path : undefined,
        },
      }
    }


    if (to.path === '/tenants')
      return


    if (!useCookie('currentTenantId').value) {
      return {
        name: 'tenants',



        query: { to: to.path },
      }
    }


    if (isFrozenModuleRoute(to.path) && !canAccessFrozenModule(to.path, isLoggedIn)) {
      /* eslint-disable indent */
      return isLoggedIn
        ? { name: 'not-authorized' }
        : {
            name: 'login',
            query: {
              ...to.query,
              to: to.fullPath !== '/' ? to.path : undefined,
            },
          }
      /* eslint-enable indent */
    }

    if (!canNavigate(to) && to.matched.length) {
      /* eslint-disable indent */
      return isLoggedIn
        ? { name: 'not-authorized' }
        : {
            name: 'login',
            query: {
              ...to.query,
              to: to.fullPath !== '/' ? to.path : undefined,
            },
          }
      /* eslint-enable indent */
    }
  })
}
