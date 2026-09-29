import { isTenantScopedPath, redirectToTenantPicker } from '@/utils/tenantContext'
import { createFetch } from '@vueuse/core'
import { destr } from 'destr'

export const useApi = createFetch({
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  fetchOptions: {
    headers: {
      Accept: 'application/json',
    },
  },
  options: {
    refetch: true,
    async beforeFetch({ options, url, cancel }) {
      const accessToken = useCookie('accessToken').value
      const tenantId = useCookie('currentTenantId').value

      const headers = {
        ...(options.headers as Record<string, string>),
      }

      if (accessToken)
        headers.Authorization = `Bearer ${accessToken}`

      if (tenantId) {
        headers['x-tenant-id'] = tenantId
      }
      else if (accessToken && isTenantScopedPath(String(url))) {

        redirectToTenantPicker()
        cancel()
      }

      options.headers = headers

      return { options }
    },
    afterFetch(ctx) {
      const { data, response } = ctx



      let parsedData = null
      try {
        parsedData = destr(data)
      }
      catch (error) {
        console.error(error)
      }

      return { data: parsedData, response }
    },
  },
})
