import { setupWorker } from 'msw/browser'


import { handlerAiChatHistory } from '@db/ai/chat-history/index'
import { handlerAiKnowledge } from '@db/ai/knowledge/index'
import { handlerAiSkills } from '@db/ai/skills/index'
import { handlerGatewayDispatch } from '@db/integrations/gateway/dispatch'
import { handlerIntegrationsGateway } from '@db/integrations/gateway/index'
import { handlerGatewayWebhooks } from '@db/integrations/gateway/webhooks'
import { handlerIntegrationsMcp } from '@db/integrations/mcp/index'
import { handlerSecurityCredentials } from '@db/security/credentials/index'


import { handlerAccessControlPermissions } from '@db/access-control/permissions/index'
import { handlerAccessControlRoles } from '@db/access-control/roles/index'
import { handlerAccessControlTeams } from '@db/access-control/teams/index'
import { handlerAccessControlUsers } from '@db/access-control/users/index'
import { handlerAppBarSearch } from '@db/app-bar-search/index'
import { handlerAuth } from '@db/auth/index'
import { handlerTenant } from '@db/tenant/index'
import { handlerWorkspaceSearch } from '@db/workspace/search/index'

const worker = setupWorker(


  ...handlerSecurityCredentials,
  ...handlerIntegrationsGateway,
  ...handlerGatewayWebhooks,
  ...handlerAiChatHistory,
  ...handlerAiKnowledge,
  ...handlerIntegrationsMcp,
  ...handlerAiSkills,


  ...handlerAccessControlUsers,
  ...handlerAccessControlTeams,
  ...handlerAccessControlPermissions,
  ...handlerAccessControlRoles,
  ...handlerAppBarSearch,
  ...handlerAuth,
  ...handlerTenant,
  ...handlerWorkspaceSearch,


  ...handlerGatewayDispatch,
)





const MSW_START_TIMEOUT_MS = 8000

function startWithTimeout(workerUrl: string): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | null = null

  return new Promise<void>(resolve => {
    const finish = () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      resolve()
    }

    timer = setTimeout(() => {
      console.warn(`[fake-api] MSW não iniciou em ${MSW_START_TIMEOUT_MS}ms — montando o app sem mock de API.`)
      finish()
    }, MSW_START_TIMEOUT_MS)

    worker.start({
      serviceWorker: {
        url: workerUrl,
      },
      onUnhandledRequest(request, print) {







        const url = request.url
        const isBrowserExtension = /^(?:chrome|moz|edge)-extension:\/\//i.test(url)

        const isViteInternal = url.includes('/node_modules/')
          || url.includes('@id/')
          || url.includes('/@vite/')
          || url.includes('@fs/')
          || /\.(?:sass|scss|css|vue|js|mjs|ts|png|jpe?g|gif|svg|woff2?|ttf|eot|ico)(?:\?|$)/i.test(url)

        if (isBrowserExtension || isViteInternal)
          return

        print.warning()
      },
    }).catch(error => {
      console.error('Failed to start MSW:', error)
    }).then(finish)
  })
}

export default function (_: typeof import('vue')) {




  if (!import.meta.env.DEV)
    return

  const workerUrl = `${import.meta.env.BASE_URL ?? '/'}mockServiceWorker.js`





  return startWithTimeout(workerUrl)
}
