import type { Component } from 'vue'
import MergedNavigation from './MergedNavigation.vue'

export type VerticalNavViewId = 'default'

export interface VerticalNavViewDefinition {

  /** Identificador único da view. */
  id: VerticalNavViewId

  /** Componente do slot `#nav-items` (opcional). */
  items?: Component
}



export const verticalNavViews: VerticalNavViewDefinition[] = [
  {
    id: 'default',
    items: MergedNavigation,
  },
]

/**
 * Resolve a view ativa a partir do nome da rota.
 * Single-tenant UI: use unified 'default' view for all routes.
 */
export function resolveVerticalNavView(routeName: string): VerticalNavViewId {


  return 'default'
}
