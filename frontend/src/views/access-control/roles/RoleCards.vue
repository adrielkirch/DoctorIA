<script setup lang="ts">
import AddEditRoleDialog from '@/components/dialogs/AddEditRoleDialog.vue'
import { useAccessControlStore } from '@/stores/useAccessControlStore'
import { $api } from '@/utils/api'
import { permissionById } from '@db/access-control/roles/db'
import girlUsingLaptop from '@images/pages/girl-using-laptop.png'
import type { GlobalRole, PermissionAreaId } from 'contracts/types/accessControl'
import {
  PERMISSION_AREAS,
  PERMISSION_AREA_LABELS,
} from 'contracts/types/accessControl'


const accessControlStore = useAccessControlStore()
accessControlStore.ensureLoaded()


const isRoleDialogVisible = ref(false)
const isAddRoleDialogVisible = ref(false)
const selectedRole = ref<GlobalRole | null>(null)

const editRole = (role: GlobalRole) => {
  selectedRole.value = role
  isRoleDialogVisible.value = true
}



const saveRolePermissions = async (payload: { name: string; permissions: string[] }) => {
  if (!selectedRole.value)
    return

  await $api(`/access-control/roles/${selectedRole.value.id}`, {
    method: 'PATCH',
    body: { permissions: payload.permissions },
  })

  await accessControlStore.ensureLoaded(true)
}


const roleAreas = (role: GlobalRole): PermissionAreaId[] =>
  PERMISSION_AREAS.filter(area =>
    role.permissions.some(permission => permissionById.get(permission)?.area === area),
  )

const areaLabel = (areaId: PermissionAreaId) =>
  PERMISSION_AREA_LABELS[areaId]
</script>

<template>
  <VRow>
    <!-- 👉 Roles (do catálogo global) -->
    <VCol v-for="role in accessControlStore.roles" :key="role.id" cols="12" sm="6" lg="4">
      <VCard>
        <VCardText>
          <div class="d-flex justify-space-between align-start gap-4">
            <div class="d-flex flex-column align-start">
              <div class="d-flex align-center gap-2 mb-1">
                <VIcon :size="22" :icon="role.icon" :color="role.color" />
                <h5 class="text-h5 mb-0 text-capitalize">
                  {{ role.name }}
                </h5>
              </div>

              <p class="text-body-2 text-medium-emphasis mb-2">
                {{ role.description }}
              </p>

              <div class="d-flex gap-2 flex-wrap mb-2">
                <VChip v-for="area in roleAreas(role)" :key="area" size="small" label>
                  {{ areaLabel(area) }}
                </VChip>
              </div>

              <a href="javascript:void(0)" class="text-body-1 mt-3
                " @click="editRole(role)">
                {{ "Edit Role" }}
              </a>
            </div>

            <IconBtn class="align-self-end">
              <VIcon icon="bx-copy" class="text-disabled" />
            </IconBtn>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- 👉 Add New Role -->
    <VCol cols="12" sm="6" lg="4">
      <VCard class="h-100" :ripple="false">
        <VRow no-gutters class="h-100">
          <VCol cols="6" class="d-flex flex-column justify-end align-center mt-5">
            <img width="105" :src="girlUsingLaptop">
          </VCol>

          <VCol cols="6">
            <VCardText class="d-flex flex-column align-end justify-end gap-4">
              <VBtn size="small" @click="isAddRoleDialogVisible = true">
                {{ "Add New Role" }}
              </VBtn>
              <div class="text-end">
                {{ "Add new role, if it doesn't exist." }}
              </div>
            </VCardText>
          </VCol>
        </VRow>
      </VCard>
      <AddEditRoleDialog v-model:is-dialog-visible="isAddRoleDialogVisible" />
    </VCol>
  </VRow>

  <AddEditRoleDialog v-model:is-dialog-visible="isRoleDialogVisible" :role="selectedRole"
    @update:role-permissions="saveRolePermissions" />
</template>
