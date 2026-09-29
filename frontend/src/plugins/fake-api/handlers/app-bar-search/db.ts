import type { SearchResults } from 'contracts/app-bar-search/types'

interface DB {
  searchItems: SearchResults[]
}

export const db: DB = {
  searchItems: [
    {
      title: 'Dashboards',
      category: 'dashboards',
      children: [
        {
          url: { name: 'dashboards-analytics' },
          icon: 'bx-line-chart',
          title: 'Analytics',
        },
        {
          url: { name: 'dashboards-crm' },
          icon: 'bx-group',
          title: 'CRM',
        },
        {
          url: { name: 'dashboards-ecommerce' },
          icon: 'bx-store',
          title: 'E-commerce',
        },
      ],
    },
    {
      title: 'Inbox',
      category: 'inbox',
      children: [
        {
          url: { name: 'sales-chat' },
          icon: 'bx-message-rounded-dots',
          title: 'Inbox',
        },
        {
          url: { name: 'sales-contacts' },
          icon: 'bx-user-circle',
          title: 'Contacts',
        },
        {
          url: { name: 'sales-campaigns' },
          icon: 'bx-broadcast',
          title: 'Campaigns',
        },
      ],
    },
    {
      title: 'AI',
      category: 'ai',
      children: [
        {
          url: { name: 'ai-assistant' },
          icon: 'bx-bot',
          title: 'AI Assistant',
        },
        {
          url: { name: 'ai-skills' },
          icon: 'bx-code-alt',
          title: 'Skills',
        },
        {
          url: { name: 'ai-knowledge' },
          icon: 'bx-book-content',
          title: 'Knowledge Base',
        },
      ],
    },
    {
      title: 'Integrations',
      category: 'integrations',
      children: [
        // {
        //   url: { name: 'integrations-mcp' },
        //   icon: 'bx-server',
        //   title: 'MCP Hub',
        // },

        {
          url: { name: 'security-credentials' },
          icon: 'bx-key',
          title: 'Credentials',
        },
      ],
    },
    {
      title: 'Workspace',
      category: 'workspace',
      children: [
        {
          url: { name: 'users' },
          icon: 'bx-group',
          title: 'Team',
        },
        {
          url: { name: 'access-control-roles' },
          icon: 'bx-check-shield',
          title: 'Roles',
        },
        {
          url: { name: 'access-control-permissions' },
          icon: 'bx-check-shield',
          title: 'Permissions',
        },
        {
          url: { name: 'pages-user-profile-tab', params: { tab: 'profile' } },
          icon: 'bx-user-circle',
          title: 'User Profile',
        },
        {
          url: { name: 'pages-account-settings-tab', params: { tab: 'account' } },
          icon: 'bx-user-circle',
          title: 'Account Settings',
        },
        {
          url: { name: 'pages-account-settings-tab', params: { tab: 'security' } },
          icon: 'bx-lock-open',
          title: 'Account Security',
        },
        {
          url: { name: 'access-control-roles' },
          icon: 'bx-shield',
          title: 'Access Control',
        },
      ],
    },
  ],
}
