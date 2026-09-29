/**
 * Access Control Store — ponto único de acesso a roles, features, permissions e
 * my-access.
 *
 * Regras (`can`):
 *  - **permission** (`resource.action`, ex.: `mcp.invoke`) → member do conjunto
 *    `myAccess.permissions`. Deny-by-default: sem load → false; não concedida → false.
 *  - **feature** (route name, ex.: `integrations-gateway`) → pública sempre true;
 *    gated → a `view` permission da feature foi concedida (`features`). Feature
 *    desconhecida → permissiva (não bloqueia rota não mapeada).
 *  - `undefined`/`null` → true (auxiliares).
 *
 * PRINCÍPIO: View ≠ Use ≠ Manage. `can('mcp.invoke')` NÃO implica `can('mcp.view')`.
 *
 * O store é carregado via `ensureLoaded()` (dedupe por tenant) — o refresh ao
 * trocar de tenant fica nos layouts default (watch em `currentTenantId`).
 *
 * @see .specify/skills/rbac-global-roles/skill.md
 */
import { updateUserAbility } from '@/plugins/casl'
import { useAuthStore } from '@/stores/useAuthStore'
import { $api } from '@/utils/api'
import {
  buildAbilityRulesForRole,
  featureCatalog as defaultFeatures,
  permissionCatalog as defaultPermissions,
  roleCatalog as defaultRoles,
  tenantRoleToGlobalRole,
} from '@db/access-control/roles/db'
import type {
  AppFeature,
  GlobalRole,
  GlobalRoleId,
  MyAccess,
  Permission,
  PermissionAreaId,
  PermissionId,
} from 'contracts/types/accessControl'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useAccessControlStore = defineStore('accessControl', () => {
  const auth = useAuthStore()




  const roles = ref<GlobalRole[]>([...defaultRoles])
  const features = ref<AppFeature[]>([...defaultFeatures])
  const permissions = ref<Permission[]>([...defaultPermissions])
  const myAccess = ref<MyAccess | null>(null)
  const isLoading = ref(false)
  const loadError = ref(false)
  const loadedTenantId = ref<string | null>(null)


  const isLoaded = computed(() => myAccess.value !== null)

  const featuresByKey = computed(() => new Map(features.value.map(f => [f.key, f])))

  const tabFeatures = computed(() =>
    features.value
      .filter(f => f.enabled !== false && f.surfaces?.includes('tab'))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  )

  const quickActionFeatures = computed(() =>
    features.value
      .filter(f => f.enabled !== false && f.surfaces?.includes('quickAction'))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  )

  const roleById = computed(() => new Map<string, GlobalRole>(roles.value.map(r => [r.id, r])))

  const permissionIds = computed(() => myAccess.value?.permissions ?? [])


  /**
   * Membership (coarse) → role global do catálogo (owner→owner, admin→admin,
   * member→member). COESÃO: é a MESMA fonte dos rótulos de role na UI —
   * UserProfile, /tenants, workspace switcher e my-access falam a mesma língua.
   */
  function roleIdForMembership(membershipRole: string | null | undefined): GlobalRoleId {
    return tenantRoleToGlobalRole(membershipRole)
  }

  /**
   * Permission granular (`resource.action`) concedida ao usuário no tenant.
   * Deny-by-default: gated sem load → false; não concedida → false.
   */
  function canPermission(permission: PermissionId): boolean {
    return isLoaded.value && permissionIds.value.includes(permission)
  }

  function can(key?: string | null): boolean {
    if (!key)
      return true


    if (key.includes('.'))
      return canPermission(key as PermissionId)

    const feature = featuresByKey.value.get(key)



    if (feature && feature.enabled === false)
      return false


    if (feature?.permission === 'public')
      return true



    if (!isLoaded.value)
      return false


    if (!feature)
      return true

    return myAccess.value!.features.includes(key)
  }

  function canArea(areaId: PermissionAreaId): boolean {
    if (!isLoaded.value)
      return false

    return (myAccess.value!.areas[areaId]?.length ?? 0) > 0
  }

  function canRoute(routeName: string | null | undefined): boolean {
    return can(routeName)
  }

  async function ensureLoaded(force = false): Promise<void> {
    const tenantId = auth.currentTenantId

    if (!tenantId || (!force && loadedTenantId.value === tenantId) || isLoading.value)
      return

    isLoading.value = true
    loadError.value = false

    try {
      const [rolesData, featuresData, access] = await Promise.all([
        $api<{ roles: GlobalRole[] }>('/access-control/roles'),
        $api<{ features: AppFeature[] }>('/access-control/features'),
        $api<MyAccess>('/access-control/my-access'),
      ])

      roles.value = rolesData.roles ?? []
      features.value = featuresData.features ?? []
      myAccess.value = access
      loadedTenantId.value = tenantId



      updateUserAbility(buildAbilityRulesForRole(access.role))
    }
    catch (error) {
      console.error('[access-control] failed to load access:', error)
      loadError.value = true
    }
    finally {
      isLoading.value = false
    }
  }

  function reset(): void {
    myAccess.value = null
    isLoading.value = false
    loadError.value = false
    loadedTenantId.value = null
  }

  return {

    roles,
    features,
    permissions,
    myAccess,
    isLoading,
    loadError,

    isLoaded,
    tabFeatures,
    quickActionFeatures,
    roleById,
    permissionIds,

    roleIdForMembership,
    can,
    canPermission,
    canArea,
    canRoute,
    ensureLoaded,
    reset,
  }
})

export type AccessControlStore = ReturnType<typeof useAccessControlStore>

