import { authorize } from '@api-utils/authorize'
import { genId } from '@api-utils/genId'
import { paginateArray } from '@api-utils/paginateArray'
import { getTenantId } from '@api-utils/tenant'
import { getCredentialReferences } from '@db/integrations/gateway/db'
import { db, deleteSecretValue, setSecretValue } from '@db/security/credentials/db'
import type {
  CreateSecretPayload,
  CreateVariablePayload,
  CredentialEntry,
  SecretCredential,
  UpdateVariablePayload,
  VariableCredential,
} from 'contracts/security/credentials/types'
import { HttpResponse, http } from 'msw'

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 0)
    return fallback

  return Math.floor(parsed)
}

function normaliseKey(value: string): string {
  return value.trim().toUpperCase()
}

export const handlerSecurityCredentials = [



  http.get('*/api/security/credentials', ({ request }) => {
    const denied = authorize(request, 'credentials.view')
    if (denied)
      return denied

    const url = new URL(request.url)
    const tenantId = getTenantId(request)
    const itemsPerPage = Math.min(parsePositiveInt(url.searchParams.get('itemsPerPage') ?? url.searchParams.get('limit'), 25), 100)
    const page = parsePositiveInt(url.searchParams.get('page'), 1)
    const scopedCredentials = db.credentials.filter(item => item.tenantId === tenantId)

    const total = scopedCredentials.length
    const totalPages = Math.ceil(total / Math.max(itemsPerPage, 1))
    const credentials = paginateArray(scopedCredentials, itemsPerPage, page) as CredentialEntry[]


    return HttpResponse.json({
      credentials,
      totalCredentials: total,
      totalPages,
      page,
    })
  }),


  http.post('*/api/security/credentials/variables', async ({ request }) => {
    const denied = authorize(request, 'credentials.manage')
    if (denied)
      return denied

    const payload = await request.json() as CreateVariablePayload
    const tenantId = getTenantId(request)
    const key = normaliseKey(payload.key ?? '')
    const value = payload.value?.trim() ?? ''

    if (!key || !value)
      return HttpResponse.json({ message: 'Variable key and value are required' }, { status: 400 })

    const duplicate = db.credentials.some(
      item => item.tenantId === tenantId && normaliseKey(item.key) === key,
    )

    if (duplicate)
      return HttpResponse.json({ message: 'Credential key already exists' }, { status: 409 })

    const variable: VariableCredential = {
      id: genId(db.credentials),
      tenantId,
      key,
      type: 'VARIABLE',
      value,
      description: payload.description?.trim() || undefined,
      updatedAt: new Date().toISOString(),
    }

    db.credentials.push(variable)

    return HttpResponse.json({ credential: variable }, { status: 201 })
  }),


  http.post('*/api/security/credentials/secrets', async ({ request }) => {
    const denied = authorize(request, 'credentials.manage')
    if (denied)
      return denied

    const payload = await request.json() as CreateSecretPayload
    const tenantId = getTenantId(request)
    const key = normaliseKey(payload.key ?? '')
    const value = payload.value?.trim() ?? ''

    if (!key || !value)
      return HttpResponse.json({ message: 'Secret key and value are required' }, { status: 400 })

    const duplicate = db.credentials.some(
      item => item.tenantId === tenantId && normaliseKey(item.key) === key,
    )

    if (duplicate)
      return HttpResponse.json({ message: 'Credential key already exists' }, { status: 409 })

    const secret: SecretCredential = {
      id: genId(db.credentials),
      tenantId,
      key,
      type: 'SECRET',
      maskedValue: '********',
      description: payload.description?.trim() || undefined,
      updatedAt: new Date().toISOString(),
    }



    setSecretValue(secret.id, value)

    db.credentials.push(secret)

    return HttpResponse.json({ credential: secret }, { status: 201 })
  }),


  http.put('*/api/security/credentials/variables/:id', async ({ request, params }) => {
    const denied = authorize(request, 'credentials.manage')
    if (denied)
      return denied

    const id = Number(params.id)
    const index = db.credentials.findIndex(item => item.id === id)
    const tenantId = getTenantId(request)

    if (index === -1)
      return HttpResponse.json({ message: 'Variable not found' }, { status: 404 })

    const existing = db.credentials[index]
    if (existing.type !== 'VARIABLE')
      return HttpResponse.json({ message: 'Variable not found' }, { status: 404 })

    if (existing.tenantId !== tenantId)
      return HttpResponse.json({ message: 'Access denied for workspace' }, { status: 403 })

    const payload = await request.json() as Partial<UpdateVariablePayload>
    const nextKey = payload.key ? normaliseKey(payload.key) : existing.key
    const nextValue = payload.value?.trim() ?? existing.value

    if (!nextKey || !nextValue)
      return HttpResponse.json({ message: 'Variable key and value are required' }, { status: 400 })

    const duplicate = db.credentials.some(
      item => item.tenantId === tenantId && item.id !== id && normaliseKey(item.key) === nextKey,
    )

    if (duplicate)
      return HttpResponse.json({ message: 'Credential key already exists' }, { status: 409 })

    const updated: VariableCredential = {
      ...existing,
      key: nextKey,
      value: nextValue,
      description: payload.description?.trim() || existing.description,
      updatedAt: new Date().toISOString(),
    }

    db.credentials[index] = updated

    return HttpResponse.json({ credential: updated })
  }),


  http.delete('*/api/security/credentials/secrets/:id', ({ request, params }) => {
    const denied = authorize(request, 'credentials.manage')
    if (denied)
      return denied

    const id = Number(params.id)
    const index = db.credentials.findIndex(item => item.id === id)

    if (index === -1)
      return HttpResponse.json({ message: 'Secret not found' }, { status: 404 })

    const secret = db.credentials[index] as SecretCredential
    if (secret.type !== 'SECRET')
      return HttpResponse.json({ message: 'Secret not found' }, { status: 404 })

    const tenantId = getTenantId(request)
    if (secret.tenantId !== tenantId)
      return HttpResponse.json({ message: 'Access denied for workspace' }, { status: 403 })



    const references = getCredentialReferences(id, tenantId)
    if (references.namespaces.length > 0 || references.routes.length > 0) {
      return HttpResponse.json({
        message: `Credential is still referenced by ${references.namespaces.length} namespace(s) and ${references.routes.length} route(s). Remove the references before deleting.`,
        code: 'CREDENTIAL_IN_USE',
        references: {
          namespaces: references.namespaces.map(n => n.id),
          routes: references.routes.map(r => r.id),
        },
      }, { status: 409 })
    }

    db.credentials.splice(index, 1)
    deleteSecretValue(id)

    return new HttpResponse(null, { status: 204 })
  }),


  http.delete('*/api/security/credentials/variables/:id', ({ request, params }) => {
    const denied = authorize(request, 'credentials.manage')
    if (denied)
      return denied

    const id = Number(params.id)
    const index = db.credentials.findIndex(item => item.id === id)

    if (index === -1)
      return HttpResponse.json({ message: 'Variable not found' }, { status: 404 })

    const variable = db.credentials[index] as VariableCredential
    if (variable.type !== 'VARIABLE')
      return HttpResponse.json({ message: 'Variable not found' }, { status: 404 })

    const tenantId = getTenantId(request)
    if (variable.tenantId !== tenantId)
      return HttpResponse.json({ message: 'Access denied for workspace' }, { status: 403 })

    db.credentials.splice(index, 1)

    return new HttpResponse(null, { status: 204 })
  }),


  http.put('*/api/security/credentials/secrets/:id', async ({ request, params }) => {
    const denied = authorize(request, 'credentials.manage')
    if (denied)
      return denied

    const id = Number(params.id)
    const index = db.credentials.findIndex(item => item.id === id)

    if (index === -1)
      return HttpResponse.json({ message: 'Secret not found' }, { status: 404 })

    const existing = db.credentials[index] as SecretCredential
    if (existing.type !== 'SECRET')
      return HttpResponse.json({ message: 'Secret not found' }, { status: 404 })

    const tenantId = getTenantId(request)
    if (existing.tenantId !== tenantId)
      return HttpResponse.json({ message: 'Access denied for workspace' }, { status: 403 })

    const payload = await request.json() as { key?: string; value?: string; description?: string }
    const nextKey = payload.key ? normaliseKey(payload.key) : existing.key

    const duplicate = db.credentials.some(
      item => item.tenantId === tenantId && item.id !== id && normaliseKey(item.key) === nextKey,
    )
    if (duplicate)
      return HttpResponse.json({ message: 'Credential key already exists' }, { status: 409 })


    if (payload.value?.trim())
      setSecretValue(existing.id, payload.value.trim())

    const updated: SecretCredential = {
      ...existing,
      key: nextKey,
      description: payload.description?.trim() || existing.description,
      updatedAt: new Date().toISOString(),
    }

    db.credentials[index] = updated

    return HttpResponse.json({ credential: updated }, { status: 200 })
  }),
]
