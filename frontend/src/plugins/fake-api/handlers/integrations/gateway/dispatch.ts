import { getActorGatewayRole, getActorMembership } from '@api-utils/actor'
import { getTenantId } from '@api-utils/tenant'
import { consumeRateLimit, db, getApiKeyByValue, getNamespaceBySlug } from '@db/integrations/gateway/db'
import { enqueueWebhookEvents } from '@db/integrations/gateway/webhooks'
import { getCredentialEntry, getSecretValue } from '@db/security/credentials/db'
import type { GatewayInvocationLog, GatewayNamespace, GatewayRoute } from 'contracts/types/gateway'
import jsonata from 'jsonata'
import { HttpResponse, type JsonBodyType, http } from 'msw'



function getActorRole(req: Request): string {
  return req.headers.get('x-actor-role')?.trim().toLowerCase() || 'user'
}

function getBearerToken(req: Request): string | null {
  const auth = req.headers.get('authorization') ?? ''

  return auth.startsWith('Bearer ') ? auth.slice(7) : null
}

function errorEnvelope(message: string, code: string, status: number): HttpResponse<JsonBodyType> {
  return HttpResponse.json({ message, code }, { status })
}

const ROLE_HIERARCHY: Record<string, number> = { admin: 3, user: 2, all: 1 }

function roleAllows(required: string, actual: string): boolean {
  if (required.toLowerCase() === 'all')
    return true

  return (ROLE_HIERARCHY[actual.toLowerCase()] ?? 0) >= (ROLE_HIERARCHY[required.toLowerCase()] ?? 0)
}



function matchPath(pattern: string, actual: string): boolean {
  const patternParts = pattern.split('/')
  const actualParts = actual.split('/')
  if (patternParts.length !== actualParts.length)
    return false

  return patternParts.every((part, i) => part.startsWith(':') || part === actualParts[i])
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const BODY_PREVIEW_MAX = 500

function previewBody(body: string): string | undefined {
  if (!body)
    return undefined

  return body.length > BODY_PREVIEW_MAX ? `${body.slice(0, BODY_PREVIEW_MAX)}…` : body
}






const FORWARDED_HEADERS = ['content-type', 'accept']

function extractPathParams(pattern: string, actual: string): Record<string, string> {
  const params: Record<string, string> = {}
  const patternParts = pattern.split('/')
  const actualParts = actual.split('/')

  patternParts.forEach((part, index) => {
    if (part.startsWith(':') && actualParts[index] !== undefined)
      params[part.slice(1)] = actualParts[index]
  })

  return params
}


function substitutePathParams(value: string, params: Record<string, string>): string {
  return value.replace(/:([\w-]+)/g, (_, key: string) => params[key] ?? `:${key}`)
}




function buildUpstreamUrl(ns: GatewayNamespace, route: GatewayRoute, routePath: string, requestUrl: string): URL | null {
  try {
    const params = extractPathParams(route.path, routePath)

    if (route.upstreamUrl) {
      const substituted = substitutePathParams(route.upstreamUrl, params)

      return substituted.startsWith('/') ? new URL(substituted, requestUrl) : new URL(substituted)
    }

    if (ns.baseUrl) {
      const base = ns.baseUrl.startsWith('/') ? new URL(ns.baseUrl, requestUrl) : new URL(ns.baseUrl)

      return new URL(base.toString().replace(/\/+$/, '') + routePath)
    }

    return null
  }
  catch {
    return null
  }
}




async function evaluateJsonata(expression: string, input: unknown, env: Record<string, unknown>): Promise<unknown> {
  try {
    return await jsonata(expression).evaluate(input, env)
  }
  catch {
    throw new Error('TRANSFORM_EVAL_FAILED')
  }
}



async function transformUpstreamResponse(
  expression: string,
  rawBody: string,
  env: Record<string, unknown>,
): Promise<{ body: string; contentType: string } | null> {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawBody)
  }
  catch {
    return null
  }

  const result = await evaluateJsonata(expression, parsed, env)
  if (typeof result === 'string')
    return { body: result, contentType: 'text/plain' }

  return { body: JSON.stringify(result), contentType: 'application/json' }
}






const gatewayMockUpstream = http.all('*/api/integrations/gateway/_upstream/*', async ({ request }) => {
  const url = new URL(request.url)
  const query = Object.fromEntries(url.searchParams.entries())
  const headers: Record<string, string> = {}

  request.headers.forEach((value, key) => { headers[key] = value })

  const rawBody = await request.text()
  let body: unknown = null
  if (rawBody) {
    try { body = JSON.parse(rawBody) }
    catch { body = rawBody }
  }

  return HttpResponse.json({
    proxiedFrom: {
      method: request.method,
      path: `/${url.pathname.split('/').slice(5).join('/')}`,
      query,
      headers,
    },
    body,
    receivedAt: new Date().toISOString(),
  })
})



const gatewayDispatch = http.all('*/api/gw/:namespace/*', async ({ request, params }) => {
  const start = Date.now()
  const tenantId = getTenantId(request)
  const namespaceSlug = params.namespace as string


  const ns = getNamespaceBySlug(namespaceSlug, tenantId)


  const url = new URL(request.url)
  const routePath = `/${url.pathname.split('/').slice(4).join('/')}`
  const method = request.method.toUpperCase()


  const routes = db.routes.filter(r => r.namespaceId === ns?.id && r.enabled)
  const matched = routes.find(r => r.method === method && matchPath(r.path, routePath)) as GatewayRoute | undefined


  let actorType: GatewayInvocationLog['actorType'] = 'none'
  let actorId: string | undefined
  let requestBodyPreview: string | undefined
  let responseBodyPreview: string | undefined

  const logAndReturn = (response: HttpResponse<JsonBodyType>): HttpResponse<JsonBodyType> => {
    db.invocations.push({
      id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tenantId,
      namespaceId: ns?.id ?? '',
      namespaceSlug,
      routeId: matched?.id ?? '',
      method,
      path: routePath,
      status: response.status,
      actorType,
      actorId,
      latencyMs: Date.now() - start,
      timestamp: new Date().toISOString(),
      requestBodyPreview,
      responseBodyPreview,
    })



    if (ns && matched) {
      enqueueWebhookEvents({
        tenantId,
        namespace: ns,
        route: matched,
        status: response.status,
        method,
        path: routePath,
        latencyMs: Date.now() - start,
      })
    }

    return response
  }

  if (!ns)
    return logAndReturn(errorEnvelope(`Namespace '${namespaceSlug}' not found`, 'NOT_FOUND', 404))

  if (!matched)
    return logAndReturn(errorEnvelope(`No route registered for ${method} ${routePath} in namespace '${namespaceSlug}'`, 'NOT_FOUND', 404))


  if (!matched.isPublic) {
    const token = getBearerToken(request)
    const apiKey = request.headers.get('x-api-key')?.trim()

    if (token) {
      actorType = 'jwt'





      const membership = getActorMembership(request, tenantId)
      const actorRole = membership
        ? getActorGatewayRole(request, tenantId).toLowerCase()
        : getActorRole(request)

      if (!roleAllows(matched.requiredRole, actorRole))
        return logAndReturn(errorEnvelope('Insufficient role', 'FORBIDDEN', 403))
    }
    else if (apiKey) {
      const key = getApiKeyByValue(apiKey, tenantId)
      if (!key || !key.enabled || key.namespaceId !== ns.id)
        return logAndReturn(errorEnvelope('Invalid or revoked API key', 'INVALID_API_KEY', 401))
      if (matched.requiredRole === 'ADMIN')
        return logAndReturn(errorEnvelope('API keys cannot access ADMIN routes', 'FORBIDDEN', 403))
      actorType = 'api_key'
      actorId = key.id
      key.lastUsedAt = new Date().toISOString()
    }
    else {
      return logAndReturn(errorEnvelope('Authentication required', 'UNAUTHORIZED', 401))
    }
  }
  else {
    actorType = 'public'
  }


  const rateConfig = matched.rateLimit ?? ns.rateLimit
  if (rateConfig) {
    const scopeKey = actorType === 'api_key' ? actorId : undefined
    if (!consumeRateLimit(tenantId, ns.id, matched.id, rateConfig, scopeKey))
      return logAndReturn(errorEnvelope('Rate limit exceeded for this route', 'RATE_LIMITED', 429))
  }


  if (matched.mode === 'MOCK') {
    if (matched.mockLatencyMs > 0)
      await delay(matched.mockLatencyMs)

    const raw = matched.mockPayload
    let body: unknown
    try { body = JSON.parse(raw) }
    catch { body = raw }

    responseBodyPreview = previewBody(raw)

    return logAndReturn(HttpResponse.json(body as JsonBodyType, { status: matched.mockStatusCode }))
  }


  const upstreamUrl = buildUpstreamUrl(ns, matched, routePath, request.url)
  if (!upstreamUrl)
    return logAndReturn(errorEnvelope('PROXY route requires \'upstreamUrl\' or a namespace baseUrl', 'BAD_GATEWAY', 502))


  const originalUrl = new URL(request.url)
  if (originalUrl.search && !upstreamUrl.search)
    upstreamUrl.search = originalUrl.search

  const paramsMap = extractPathParams(matched.path, routePath)

  const transformEnv = {
    params: paramsMap,
    query: Object.fromEntries(originalUrl.searchParams.entries()),
    headers: Object.fromEntries(request.headers.entries()),
  }


  const forwardedHeaders = new Headers()

  FORWARDED_HEADERS.forEach(name => {
    const value = request.headers.get(name)
    if (value)
      forwardedHeaders.set(name, value)
  })

  const effectiveCredentialId = matched.credentialId || ns.credentialId
  if (effectiveCredentialId) {
    const credential = getCredentialEntry(effectiveCredentialId, tenantId)
    if (!credential)
      return logAndReturn(errorEnvelope(`Credential '${effectiveCredentialId}' not found in this workspace`, 'CREDENTIAL_NOT_FOUND', 502))

    const rawValue = credential.type === 'VARIABLE' ? credential.value : getSecretValue(credential.id)
    if (!rawValue)
      return logAndReturn(errorEnvelope(`Credential '${effectiveCredentialId}' has no resolvable value`, 'CREDENTIAL_UNAVAILABLE', 502))



    const authHeader = matched.authHeader || ns.authHeader || 'Authorization'
    const authScheme = matched.authScheme ?? ns.authScheme ?? 'Bearer'

    forwardedHeaders.set(authHeader, authScheme === '' ? rawValue : `${authScheme} ${rawValue}`)
  }

  const init: RequestInit = { method: request.method, headers: forwardedHeaders }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const rawBody = await request.text()
    if (rawBody) {
      if (matched.requestTransform) {

        let parsed: unknown
        try {
          parsed = JSON.parse(rawBody)
        }
        catch {
          return logAndReturn(errorEnvelope('requestTransform requires a JSON request body', 'REQUEST_TRANSFORM_REQUIRES_JSON', 400))
        }

        let transformed: unknown
        try {
          transformed = await evaluateJsonata(matched.requestTransform, parsed, transformEnv)
        }
        catch {
          return logAndReturn(errorEnvelope('requestTransform failed at runtime', 'TRANSFORM_FAILED', 502))
        }

        init.body = typeof transformed === 'string' ? transformed : JSON.stringify(transformed)
        forwardedHeaders.set('content-type', 'application/json')
        requestBodyPreview = previewBody(init.body)
      }
      else {
        init.body = rawBody
        requestBodyPreview = previewBody(rawBody)
      }
    }
  }

  let upstreamResponse: Response
  try {
    upstreamResponse = await fetch(upstreamUrl.toString(), init)
  }
  catch {
    return logAndReturn(errorEnvelope(`Failed to reach upstream '${upstreamUrl.toString()}'`, 'UPSTREAM_UNREACHABLE', 502))
  }

  let upstreamBody = await upstreamResponse.text()
  const responseHeaders = new Headers()
  for (const name of ['content-type', 'etag', 'cache-control']) {
    const value = upstreamResponse.headers.get(name)
    if (value)
      responseHeaders.set(name, value)
  }


  if (matched.responseTransform) {
    const transformed = await transformUpstreamResponse(matched.responseTransform, upstreamBody, transformEnv)
    if (transformed) {
      upstreamBody = transformed.body
      responseHeaders.set('content-type', transformed.contentType)
    }
  }

  responseBodyPreview = previewBody(upstreamBody)

  return logAndReturn(new HttpResponse(upstreamBody, { status: upstreamResponse.status, headers: responseHeaders }))
})

export const handlerGatewayDispatch = [gatewayMockUpstream, gatewayDispatch]
