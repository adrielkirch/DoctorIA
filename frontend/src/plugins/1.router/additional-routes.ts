import { resolveAccessibleHomeRoute } from '@/utils/accessControlNav'
import type { RouteRecordRaw } from 'vue-router/auto'


export const redirects: RouteRecordRaw[] = [



  {
    path: '/',
    name: 'index',
    redirect: to => resolveAccessibleHomeRoute() ?? { name: 'login', query: to.query },
  },
  {
    path: '/pages/user-profile',
    name: 'pages-user-profile',
    redirect: () => ({ name: 'pages-user-profile-tab', params: { tab: 'profile' } }),
  },
  {
    path: '/pages/account-settings',
    name: 'pages-account-settings',
    redirect: () => ({ name: 'pages-account-settings-tab', params: { tab: 'account' } }),
  },
]

export const routes: RouteRecordRaw[] = []
