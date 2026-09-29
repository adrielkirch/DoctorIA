import type { VerticalNavItems } from '@layouts/types'

export const verticalNavItems = [

  {
    title: 'AI',
    icon: { icon: 'bx-bot' },
    children: [
      {
        title: 'Assistant',
        icon: { icon: 'bx-message-dots' },
        to: 'ai-assistant',
      },
      {
        title: 'Skills',
        icon: { icon: 'bx-code-alt' },
        to: 'ai-skills',
      },
      {
        title: 'Knowledge Base',
        icon: { icon: 'bx-book-content' },
        to: 'ai-knowledge',
      },
    ],
  },
  {
    title: 'Credentials',
    icon: { icon: 'bx-key' },
    to: 'security-credentials',
  },
] as VerticalNavItems

/**
 * Tenant-aware navigation.
 * When there is no active tenant, all tenant-scoped resources are hidden.
 */
export const buildVerticalNavItems = (hasTenant: boolean): VerticalNavItems =>
  hasTenant ? verticalNavItems : []

export default verticalNavItems
