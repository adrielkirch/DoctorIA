<script setup lang="ts">
import { permissionCatalog } from '@db/access-control/roles/db'
import type { GlobalRole, PermissionAreaId } from 'contracts/types/accessControl'
import {
  PERMISSION_AREAS,
  PERMISSION_AREA_LABELS,
} from 'contracts/types/accessControl'
import { computed, ref, watch } from 'vue'
import { VForm } from 'vuetify/components/VForm'

interface Props {
  role?: GlobalRole | null
  isDialogVisible: boolean
}
interface Emit {
  (e: 'update:isDialogVisible', value: boolean): void
  (e: 'update:rolePermissions', value: { name: string; permissions: string[] }): void
}

const props = withDefaults(defineProps<Props>(), {
  role: null,
})

const emit = defineEmits<Emit>()

const permissionsByArea = computed(() => {
  const groups = new Map<PermissionAreaId, (typeof permissionCatalog)[number][]>()
  for (const area of PERMISSION_AREAS)
    groups.set(area, [])

  for (const permission of permissionCatalog)
    groups.get(permission.area)!.push(permission)

  return groups
})

/** Recurso → permissions dentro de uma área (ex.: gateway → view/manage/invoke/…). */
const resourcesInArea = (area: PermissionAreaId) => {
  const byResource = new Map<string, (typeof permissionCatalog)[number][]>()

  for (const permission of permissionsByArea.value.get(area) ?? []) {
    const list = byResource.get(permission.resource) ?? []
    list.push(permission)
    byResource.set(permission.resource, list)
  }

  return [...byResource.entries()]
}

const ALL_PERMISSIONS = permissionCatalog.map(permission => permission.id)

const draft = ref<string[]>([])
const roleName = ref('')
const isSelectAll = ref(false)
const refPermissionForm = ref<VForm>()

const checkedCount = computed(() => draft.value.length)
const totalCount = ALL_PERMISSIONS.length

const isIndeterminate = computed(
  () => checkedCount.value > 0 && checkedCount.value < totalCount,
)


watch(isSelectAll, val => {
  draft.value = val ? [...ALL_PERMISSIONS] : []
})


watch(() => isIndeterminate.value, () => {
  if (!isIndeterminate.value)
    isSelectAll.value = false
})


watch(() => draft.value, () => {
  if (checkedCount.value === totalCount)
    isSelectAll.value = true
}, { deep: true })


const toggleArea = (area: PermissionAreaId, val: boolean) => {
  const ids: string[] = (permissionsByArea.value.get(area) ?? []).map(permission => permission.id)

  draft.value = val
    ? [...new Set([...draft.value, ...ids])]
    : draft.value.filter(id => !ids.includes(id))
}

const isAreaChecked = (area: PermissionAreaId) => {
  const ids = (permissionsByArea.value.get(area) ?? []).map(permission => permission.id)

  return ids.length > 0 && ids.every(id => draft.value.includes(id))
}

/**
 * Toggle de UMA permission. Nunca usar `v-model` de array direto num VCheckbox
 * (o Vuetify emitiria `true`/`false`, corrompendo o array) — o modelo é sempre
 * uma cópia imutável do `draft`.
 */
const togglePermission = (permission: string, val: boolean) => {
  draft.value = val
    ? [...new Set([...draft.value, permission])]
    : draft.value.filter(id => id !== permission)
}


watch(
  () => [props.isDialogVisible, props.role] as const,
  () => {
    if (!props.isDialogVisible)
      return

    roleName.value = props.role?.name ?? ''
    draft.value = [...(props.role?.permissions ?? [])]
    isSelectAll.value = checkedCount.value === totalCount
  },
  { immediate: true },
)

const onSubmit = () => {
  emit('update:rolePermissions', {
    name: roleName.value,
    permissions: draft.value,
  })
  emit('update:isDialogVisible', false)
  isSelectAll.value = false
}

const onReset = () => {
  roleName.value = props.role?.name ?? ''
  draft.value = [...(props.role?.permissions ?? [])]
  refPermissionForm.value?.reset()
  isSelectAll.value = false


  emit('update:isDialogVisible', false)
}
</script>


<template>
  <VDialog width="900" :model-value="props.isDialogVisible" class="role-permission-dialog"
    @update:model-value="emit('update:isDialogVisible', $event)">
    <VCard>
      <VCardText class="d-flex flex-column gap-4">
        <!-- 👉 Title -->
        <div class="d-flex justify-space-between align-center">
          <h4 class="text-h4 mb-0">
            {{ props.role?.name ? "Edit Role" : "Add New Role" }}
          </h4>
          <IconBtn @click="onReset">
            <VIcon icon="bx-x" />
          </IconBtn>
        </div>
        <p class="text-body-1 mb-0">
          {{ "Set Role Permissions" }}
        </p>

        <!-- 👉 Form -->
        <VForm ref="refPermissionForm">
          <!-- 👉 Role name -->
          <AppTextField v-model="roleName" label="Role Name" placeholder="Enter Role Name" />

          <h5 class="text-h5 my-6">
            {{ "Role Permissions" }}
          </h5>

          <!-- 👉 Permission matrix (agrupada por produto) -->
          <VTable class="permission-table text-no-wrap mb-6">
            <thead>
              <tr>
                <th class="text-body-1">
                  {{ "Resource" }}
                </th>
                <th v-for="action in ['view', 'use', 'invoke', 'manage', 'reveal', 'invite']" :key="action"
                  class="text-center text-body-2">
                  {{ action[0].toUpperCase() + action.slice(1) }}
                </th>
              </tr>
            </thead>

            <tbody>
              <!-- 👉 Select all (global) -->
              <tr>
                <td>
                  <h6 class="text-h6">
                    {{ "Select All" }}
                  </h6>
                </td>
                <td colspan="6">
                  <div class="d-flex justify-end">
                    <VCheckbox v-model="isSelectAll" v-model:indeterminate="isIndeterminate" />
                  </div>
                </td>
              </tr>

              <!-- 👉 Áreas de PRODUTO -->
              <template v-for="area in PERMISSION_AREAS" :key="area">
                <tr class="area-header-row">
                  <td colspan="7">
                    <div class="d-flex align-center justify-space-between pe-1">
                      <h6 class="text-h6">
                        {{ PERMISSION_AREA_LABELS[area] }}
                      </h6>
                      <VCheckbox :model-value="isAreaChecked(area)"
                        @update:model-value="val => toggleArea(area, Boolean(val))" />
                    </div>
                  </td>
                </tr>

                <tr v-for="[resource, permissions] in resourcesInArea(area)" :key="`${area}-${resource}`">
                  <td>
                    <h6 class="text-h6 text-capitalize">
                      {{ permissions[0].resource }}
                    </h6>
                  </td>
                  <td v-for="action in ['view', 'use', 'invoke', 'manage', 'reveal', 'invite']" :key="action">
                    <div class="d-flex justify-center">
                      <VCheckbox v-if="permissions.some(p => p.action === action)"
                        :model-value="draft.includes(permissions.find(p => p.action === action)!.id)"
                        @update:model-value="val => togglePermission(permissions.find(p => p.action === action)!.id, Boolean(val))"
                        class="permission-checkbox" />
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </VTable>

          <!-- 👉 Actions button -->
          <div class="d-flex align-center justify-end gap-4">
            <VBtn @click="onSubmit">
              {{ "Submit" }}
            </VBtn>

            <VBtn color="secondary" variant="tonal" @click="onReset">
              {{ "Cancel" }}
            </VBtn>
          </div>
        </VForm>
      </VCardText>
    </VCard>
  </VDialog>
</template>

<style lang="scss">
.permission-table {
  td {
    border-block-end: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    padding-block: 0.625rem;
  }

  .area-header-row td {
    background-color: rgba(var(--v-theme-surface-variant), 0.18);
  }

  .permission-checkbox {
    min-inline-size: 2.5rem;
  }
}
</style>
