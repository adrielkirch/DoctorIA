<script setup lang="ts">
import { useConfigStore } from "@/@core/stores/config";
import { useAccessControlStore } from "@/stores/useAccessControlStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { injectionKeyIsVerticalNavHovered } from "@layouts/symbols";
import { computed, inject, ref } from "vue";





const auth = useAuthStore();
const configStore = useConfigStore();



const accessControlStore = useAccessControlStore();

const membershipRoleName = (membershipRole: string) => {
  const roleId = accessControlStore.roleIdForMembership(membershipRole);

  return accessControlStore.roleById.get(roleId)?.name ?? roleId;
};


const isNavHovered = inject(injectionKeyIsVerticalNavHovered, ref(false));

const isCollapsed = computed(
  () => configStore.isVerticalNavCollapsed && !isNavHovered.value,
);

const isMenuOpen = ref(false);
const searchQuery = ref("");

const currentTenant = computed(() => auth.currentTenant);

const tenantInitial = computed(
  () => currentTenant.value?.name?.charAt(0).toUpperCase() ?? "W",
);

const filteredMemberships = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return auth.memberships;

  return auth.memberships.filter(
    (m) =>
      m.tenant.name.toLowerCase().includes(q) ||
      m.tenant.slug.toLowerCase().includes(q),
  );
});

const switchWorkspace = (tenantId: string) => {
  if (tenantId !== auth.currentTenantId) auth.switchTenant(tenantId);

  isMenuOpen.value = false;
  searchQuery.value = "";




};
</script>

<template>
  <div class="workspace-switcher">
    <VMenu
      v-model="isMenuOpen"
      location="top start"
      offset="12"
      :close-on-content-click="false"
      content-class="workspace-switcher-menu"
    >
      <template #activator="{ props: menuProps }">
        <VBtn
          v-bind="menuProps"
          class="workspace-switcher__trigger"
          :class="{ 'workspace-switcher__trigger--active': isMenuOpen }"
          variant="text"
          rounded="lg"
          block
          :title="currentTenant?.name"
        >
          <VAvatar size="24" color="primary" class="workspace-switcher__avatar">
            <span class="text-caption font-weight-bold text-white">{{
              tenantInitial
            }}</span>
          </VAvatar>

          <div
            v-if="!isCollapsed"
            class="workspace-switcher__text ms-1 me-auto"
          >
            <div class="text-caption font-weight-medium text-truncate">
              {{ currentTenant?.name }}
            </div>
          </div>

          <VIcon
            v-if="!isCollapsed"
            icon="bx-chevron-up"
            size="16"
            class="text-disabled"
          />
        </VBtn>
      </template>

      <!-- 👉 Dropdown (abre para cima) -->
      <VCard class="workspace-switcher__card">
        <VCardText class="pb-2">
          <div class="text-body-1 font-weight-medium mb-2">
            {{ "Workspace" }}
          </div>
          <VTextField
            v-model="searchQuery"
            placeholder="Search workspaces…"
            density="compact"
            variant="outlined"
            prepend-inner-icon="bx-search"
            hide-details
          />
        </VCardText>

        <VList
          class="workspace-switcher__list"
          density="compact"
          max-height="280"
        >
          <VListItem
            v-for="m in filteredMemberships"
            :key="m.tenantId"
            class="cursor-pointer"
            :active="m.tenantId === auth.currentTenantId"
            @click="switchWorkspace(m.tenantId)"
          >
            <template #prepend>
              <VAvatar size="32" color="primary" variant="tonal">
                <span class="text-body-2 font-weight-bold">{{
                  m.tenant.name.charAt(0).toUpperCase()
                }}</span>
              </VAvatar>
            </template>

            <VListItemTitle class="text-body-2 font-weight-medium">
              {{ m.tenant.name }}
            </VListItemTitle>
            <VListItemSubtitle class="text-caption">
              {{ membershipRoleName(m.role) }}
            </VListItemSubtitle>

            <template #append>
              <VIcon
                v-if="m.tenantId === auth.currentTenantId"
                icon="bx-check"
                size="18"
                color="primary"
              />
            </template>
          </VListItem>

          <VListItem v-if="filteredMemberships.length === 0">
            <VListItemTitle class="text-center text-medium-emphasis py-2">
              {{ "No workspaces found" }}
            </VListItemTitle>
          </VListItem>
        </VList>
      </VCard>
    </VMenu>
  </div>
</template>

<style scoped lang="scss">
.workspace-switcher {
  border-block-start: 1px solid rgb(var(--v-border-color));


  padding-block: 6px;
  padding-inline: 10px;
}



.workspace-switcher__trigger {
  padding-inline: 0.375rem;

  .v-btn__content {
    justify-content: flex-start;
  }
}

.workspace-switcher__trigger--active {
  background: rgb(var(--v-theme-surface-variant), 0.4);
}

.workspace-switcher__avatar {
  flex-shrink: 0;
}

.workspace-switcher__text {
  min-inline-size: 0;
}
</style>

<!-- ℹ️ Estilos globais: o VMenu é teleportado para o body (scoped não alcança). -->
<style lang="scss">
.workspace-switcher-menu {
  min-inline-size: 300px;

  .workspace-switcher__card {
    overflow: hidden;
  }

  .v-list-item--active {
    .v-list-item__prepend {
      color: rgb(var(--v-theme-primary));
    }
  }
}
</style>
