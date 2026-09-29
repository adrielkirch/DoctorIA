import { isTenantScopedPath, redirectToTenantPicker } from '@/utils/tenantContext'
import { ofetch } from 'ofetch'

export const $api = ofetch.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  async onRequest({ request, options }) {
    const accessToken = useCookie('accessToken').value
    if (accessToken)
      options.headers.append('Authorization', `Bearer ${accessToken}`)

    const tenantId = useCookie('currentTenantId').value
    if (tenantId) {
      options.headers.append('x-tenant-id', tenantId)

      return
    }



    if (accessToken && isTenantScopedPath(String(request))) {
      redirectToTenantPicker()
      throw new Error('ACTIVE_TENANT_REQUIRED')
    }
  },
})
