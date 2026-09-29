/**
 * Auth + Tenant store — the single source of truth for identity and tenancy.
 * Mínimo: session, currentTenant, troca de tenant, logout.
 */
import { $api } from '@/utils/api'
import type { Membership, Session, SessionUser, Tenant } from 'contracts/types/tenant'
import { defineStore } from 'pinia'

interface AuthState {
  accessToken: string
  user: SessionUser | null
  memberships: Membership[]
  currentTenantId: string
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => {
    const memberships = useCookie<Membership[] | null>('memberships').value || []

    return {
      accessToken: useCookie('accessToken').value || '',
      user: useCookie<SessionUser | null>('userData').value || null,
      memberships,



      currentTenantId: useCookie('currentTenantId').value || '',
    }
  },

  getters: {
    isAuthenticated: state => !!state.accessToken && !!state.user,
    currentTenant: state => state.memberships.find(m => m.tenantId === state.currentTenantId)?.tenant ?? null,
    currentRole: state => state.memberships.find(m => m.tenantId === state.currentTenantId)?.role ?? null,
    currentPlan: state => state.memberships.find(m => m.tenantId === state.currentTenantId)?.tenant?.plan ?? 'free',
    isOwner: state => state.memberships.find(m => m.tenantId === state.currentTenantId)?.role === 'owner',
    isAdmin: state => {
      const role = state.memberships.find(m => m.tenantId === state.currentTenantId)?.role

      return role === 'owner' || role === 'admin'
    },
    isMember: state => state.memberships.find(m => m.tenantId === state.currentTenantId)?.role === 'member',
  },

  actions: {
    setSession(session: Session) {
      this.accessToken = session.accessToken
      this.user = session.user
      this.memberships = session.memberships
      this.currentTenantId = session.currentTenantId

      useCookie('accessToken').value = session.accessToken
      useCookie<SessionUser | null>('userData').value = session.user
      useCookie<Membership[] | null>('memberships').value = session.memberships
      useCookie('currentTenantId').value = session.currentTenantId
    },
    switchTenant(tenantId: string) {
      if (!this.memberships.some(m => m.tenantId === tenantId))
        return

      this.currentTenantId = tenantId
      useCookie('currentTenantId').value = tenantId
    },
    async createTenant(name: string, slug?: string) {
      const { tenant, membership } = await $api<{ tenant: Tenant; membership: Membership }>('/tenants', {
        method: 'POST',
        body: { name, slug },
      })

      this.memberships = [...this.memberships, membership]
      this.currentTenantId = tenant.id

      useCookie<Membership[] | null>('memberships').value = this.memberships
      useCookie('currentTenantId').value = tenant.id

      return tenant
    },
    logout() {
      this.accessToken = ''
      this.user = null
      this.memberships = []
      this.currentTenantId = ''

      useCookie('accessToken').value = null
      useCookie<SessionUser | null>('userData').value = null
      useCookie<Membership[] | null>('memberships').value = null
      useCookie('currentTenantId').value = null
    },
  },
})
