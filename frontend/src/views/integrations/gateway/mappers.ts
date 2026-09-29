import type { GatewayNamespace, GatewayRoute } from 'contracts/types/gateway'

export interface GatewayNamespaceCardVM {
  id: string
  slug: string
  title: string
  description: string
  routeCount: number
  createdAt: string
}

export interface GatewayRouteRowVM {
  id: string
  method: string
  path: string
  mode: string
  isPublic: boolean
  requiredRole: string
  enabled: boolean
  mockStatusCode: number
  mockLatencyMs: number
  description: string
}

export function mapNamespaceToCardVM(ns: GatewayNamespace): GatewayNamespaceCardVM {
  return {
    id: ns.id,
    slug: ns.slug,
    title: ns.displayName,
    description: ns.description,
    routeCount: ns.routeCount,
    createdAt: ns.createdAt,
  }
}

export function mapRouteToRowVM(route: GatewayRoute): GatewayRouteRowVM {
  return {
    id: route.id,
    method: route.method,
    path: route.path,
    mode: route.mode,
    isPublic: route.isPublic,
    requiredRole: route.requiredRole,
    enabled: route.enabled,
    mockStatusCode: route.mockStatusCode,
    mockLatencyMs: route.mockLatencyMs,
    description: route.description,
  }
}
