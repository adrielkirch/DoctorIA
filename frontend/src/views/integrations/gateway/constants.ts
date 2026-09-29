import type { GatewayRouteMode, GatewayRouteRole, HttpMethod } from 'contracts/types/gateway'
import { GATEWAY_ROUTE_MODES, GATEWAY_ROUTE_ROLES, HTTP_METHODS } from 'contracts/types/gateway'

export const GATEWAY_PAGE_SIZE_DEFAULT = 20
export const GATEWAY_PAGE_SIZE_MAX = 100
export const GATEWAY_LATENCY_MAX_MS = 10_000

export const GATEWAY_HTTP_METHODS: HttpMethod[] = [...HTTP_METHODS]


export { GATEWAY_ROUTE_MODES, GATEWAY_ROUTE_ROLES }

export const GATEWAY_METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'success',
  POST: 'primary',
  PUT: 'warning',
  PATCH: 'info',
  DELETE: 'error',
  OPTIONS: 'secondary',
}

export const GATEWAY_ROLE_COLORS: Record<GatewayRouteRole, string> = {
  ALL: 'secondary',
  USER: 'info',
  ADMIN: 'warning',
}

export const GATEWAY_MODE_COLORS: Record<GatewayRouteMode, string> = {
  MOCK: 'success',
  PROXY: 'primary',
}
