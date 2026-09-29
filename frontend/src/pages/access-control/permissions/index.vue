<script setup lang="ts">
import { useAccessControlStore } from "@/stores/useAccessControlStore";
import type { Permission } from "contracts/access-control/permissions/types";
import { computed, ref } from "vue";

definePage({
  meta: {
    action: "read",
    subject: "access-control-permissions",
  },
});


const accessControlStore = useAccessControlStore();
accessControlStore.ensureLoaded();

const headers = computed(() => [
  { title: "Name", key: "id" },
  { title: "Features gated", key: "features", sortable: false },
  {
    title: "Assigned To",
    key: "assignedTo",
    sortable: false,
  },
]);

const search = ref("");


const itemsPerPage = ref(10);
const page = ref(1);
const sortBy = ref();
const orderBy = ref();


const updateOptions = (options: any) => {
  sortBy.value = options.sortBy[0]?.key;
  orderBy.value = options.sortBy[0]?.order;
};

const { data: permissionsData } = await useApi<any>(
  createUrl("/access-control/permissions", {
    query: {
      q: search,
      itemsPerPage,
      page,
      sortBy,
      orderBy,
    },
  }),
);

const permissions = computed(
  (): Permission[] => permissionsData.value.permissions,
);
const totalPermissions = computed(() => permissionsData.value.totalPermissions);

const roleName = (roleId: string) =>
  accessControlStore.roleById.get(roleId)?.name ?? roleId;
const roleIcon = (roleId: string) =>
  accessControlStore.roleById.get(roleId)?.icon ?? "bx-user";
const roleColor = (roleId: string) =>
  accessControlStore.roleById.get(roleId)?.color ?? "secondary";
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardText class="d-flex align-center justify-space-between flex-wrap gap-4">
          <div class="d-flex gap-2 align-center">
            <p class="text-body-1 mb-0">
              {{ "Show" }}
            </p>
            <AppSelect :model-value="itemsPerPage" :items="[
              { value: 5, title: '5' },
              { value: 25, title: '25' },
              { value: 50, title: '50' },
              { value: 100, title: '100' },
              { value: -1, title: 'All' },]" style="inline-size: 5.5rem"
              @update:model-value="itemsPerPage = parseInt($event, 10)" />
          </div>

          <div class="d-flex align-center gap-4 flex-wrap">
            <AppTextField v-model="search" placeholder="Search Permission" style="inline-size: 15.625rem" />
          </div>
        </VCardText>

        <VDivider />

        <VDataTableServer v-model:items-per-page="itemsPerPage" v-model:page="page" :items-length="totalPermissions"
          :items-per-page-options="[
            { value: 5, title: '5' },
            { value: 10, title: '10' },
            { value: -1, title: '$vuetify.dataFooter.itemsPerPageAll' },
          ]" :headers="headers" :items="permissions" item-value="id" class="text-no-wrap"
          @update:options="updateOptions">
          <!-- Name (permission granular) -->
          <template #item.id="{ item }">
            <div class="text-high-emphasis text-body-1">
              <span class="text-capitalize">{{
                item.resource
              }}</span>
              <span class="text-medium-emphasis">
                · {{ item.action }}</span>
            </div>
          </template>

          <!-- Features gated -->
          <template #item.features="{ item }">
            <div class="d-flex gap-2 flex-wrap">
              <VChip v-for="feature in item.features" :key="feature" size="small" label color="info" variant="tonal">
                {{ feature }}
              </VChip>
            </div>
          </template>

          <!-- Assigned To (roles do catálogo) -->
          <template #item.assignedTo="{ item }">
            <div class="d-flex gap-4">
              <VChip v-for="role in item.assignedTo" :key="role" label size="small" :color="roleColor(role)"
                class="font-weight-medium text-capitalize">
                <VIcon :size="16" :icon="roleIcon(role)" class="me-1" />
                {{ roleName(role) }}
              </VChip>
            </div>
          </template>

          <template #bottom>
            <TablePagination v-model:page="page" :items-per-page="itemsPerPage" :total-items="totalPermissions" />
          </template>
        </VDataTableServer>
      </VCard>
    </VCol>
  </VRow>
</template>
