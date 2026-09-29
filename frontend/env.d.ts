import 'vue-router'

declare global {
  function definePageMeta(meta: Record<string, unknown>): void
  const $fetch: typeof import('ofetch').$fetch
}

declare module 'vue-router' {
  interface RouteMeta {
    action?: string
    subject?: string
    layoutWrapperClasses?: string
    navActiveLink?: RouteLocationRaw
    layout?: 'blank' | 'default'
    unauthenticatedOnly?: boolean
    public?: boolean
  }
}
