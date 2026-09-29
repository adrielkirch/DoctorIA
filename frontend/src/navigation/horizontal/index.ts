import type { HorizontalNavItems } from '@layouts/types'


export const horizontalNavItems = [

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
        title: 'Knowledge',
        icon: { icon: 'bx-book-content' },
        to: 'ai-knowledge',
      },
    ],
  },
  {
    title: 'Security',
    icon: { icon: 'bx-shield' },
    children: [
      {
        title: 'Credentials',
        icon: { icon: 'bx-key' },
        to: 'security-credentials',
      },
    ],
  },
] as HorizontalNavItems

/**
 * Tenant-aware navigation.
 * When there is no active tenant, all tenant-scoped resources are hidden.
 */
export const buildHorizontalNavItems = (hasTenant: boolean): HorizontalNavItems =>
  hasTenant ? horizontalNavItems : []

export default horizontalNavItems
