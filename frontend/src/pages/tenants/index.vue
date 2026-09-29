<script setup lang="ts">
import { useAccessControlStore } from "@/stores/useAccessControlStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { requiredValidator } from "@core/utils/validators";

definePage({
  meta: {



    navActiveLink: "tenants",
  },
});

const auth = useAuthStore();
const router = useRouter();


const showWorkspacePicker = ref(true);

onMounted(() => {

  if (!auth.currentTenantId && auth.memberships.length > 0) {
    auth.switchTenant(auth.memberships[0].tenantId);
    showWorkspacePicker.value = false;


    router.replace({ name: "ai-assistant" });

    return;
  }


  if (auth.currentTenantId) {
    showWorkspacePicker.value = false;
    router.replace({ name: "ai-assistant" });

    return;
  }


  showWorkspacePicker.value = auth.memberships.length > 0;
});




const accessControlStore = useAccessControlStore();

accessControlStore.ensureLoaded();

const roleName = (roleId: string) =>
  accessControlStore.roleById.get(roleId)?.name ?? roleId;

const roleIcon = (roleId: string) =>
  accessControlStore.roleById.get(roleId)?.icon ?? "bx-user";

const roleColor = (roleId: string) =>
  accessControlStore.roleById.get(roleId)?.color ?? "secondary";

const globalRoleId = (membershipRole: string) =>
  accessControlStore.roleIdForMembership(membershipRole);







const isActiveTenant = (tenantId: string) => auth.currentTenantId === tenantId;

const selectTenant = (tenantId: string) => {
  if (isActiveTenant(tenantId)) return;

  auth.switchTenant(tenantId);
};


const canCreateTenant = computed(() =>
  auth.memberships.some((m) => m.role === "owner" || m.role === "admin"),
);

const requiredRule = (value: unknown) =>
  requiredValidator(value) === true || "This field is required";

const translateCreateError = (raw: unknown) => {
  const code = typeof raw === "string" ? raw : "";

  const map: Record<string, string> = {
    "name is required": "This field is required",
    "slug is required": "This field is required",
    "A workspace with this slug already exists": "A workspace with this slug already exists",
    "Failed to create the workspace": "Failed to create the workspace",
  };

  return map[code] || "Failed to create the workspace";
};


const isCreateDialogVisible = ref(false);
const isCreating = ref(false);
const createError = ref("");
const newTenantName = ref("");
const newTenantSlug = ref("");

const createTenant = async () => {
  if (!newTenantName.value.trim() || isCreating.value) return;

  isCreating.value = true;
  createError.value = "";

  try {
    await auth.createTenant(
      newTenantName.value.trim(),
      newTenantSlug.value.trim() || undefined,
    );



    isCreateDialogVisible.value = false;
    newTenantName.value = "";
    newTenantSlug.value = "";
  } catch (error: any) {
    createError.value = translateCreateError(
      error?.response?._data?.message || error?.data?.message,
    );
  } finally {
    isCreating.value = false;
  }
};
</script>

<template>
  <div class="pa-6">
    <!-- Header + compact "Create workspace" button (top-right) -->
    <div class="d-flex align-center justify-space-between flex-wrap gap-4 mb-6">
      <div>
        <h4 class="text-h4 mb-2">
          {{ "Choose a workspace" }}
        </h4>
        <p class="text-body-1 text-medium-emphasis mb-0">
          {{ ("You belong to " + String(auth.memberships.length) + " tenant(s). Select one to continue.") }}
        </p>
      </div>

      <VBtn v-if="canCreateTenant" color="primary" prepend-icon="bx-plus" @click="isCreateDialogVisible = true">
        {{ "Create workspace" }}
      </VBtn>
    </div>

    <!-- ℹ️ Grupo de seleção: o workspace ativo fica com borda primary -->
    <VRow role="radiogroup" aria-label="Choose a workspace">
      <VCol v-for="m in auth.memberships" :key="m.tenantId" cols="12" md="6">
        <VCard class="cursor-pointer" :class="{ 'tenant-card--active': isActiveTenant(m.tenantId) }"
          :title="m.tenant.name" :subtitle="m.tenant.id" elevation-on-hover tabindex="0" role="radio"
          :aria-checked="isActiveTenant(m.tenantId) ? 'true' : 'false'"
          :aria-label="`${m.tenant.name} — ${roleName(globalRoleId(m.role))}`" @click="selectTenant(m.tenantId)"
          @keyup.enter="selectTenant(m.tenantId)" @keyup.space="selectTenant(m.tenantId)">
          <VCardText class="d-flex align-center justify-space-between">
            <VChip :color="roleColor(globalRoleId(m.role))" label size="small"
              class="font-weight-medium text-capitalize">
              <VIcon :size="16" :icon="roleIcon(globalRoleId(m.role))" class="me-1" />
              {{ roleName(globalRoleId(m.role)) }}
            </VChip>

            <!-- 👉 Affordance de seleção: cartão inteiro clicável (ativo = check primary) -->
            <div v-if="isActiveTenant(m.tenantId)" class="d-flex align-center gap-2 text-primary">
              <span class="text-body-2 font-weight-medium">
                {{ "Active workspace" }}
              </span>
              <VIcon icon="bx-check-circle" size="20" />
            </div>
            <div v-else class="d-flex align-center gap-2 text-medium-emphasis">
              <span class="text-body-2 font-weight-medium">
                {{ "Select workspace" }}
              </span>
              <VIcon icon="bx-pointer" size="20" />
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Non-admins hint -->
    <VAlert v-if="!canCreateTenant" variant="tonal" color="secondary" class="mt-4">
      {{ "Contact your workspace admin to add you to a workspace." }}
    </VAlert>

    <!-- Create workspace dialog -->
    <VDialog v-model="isCreateDialogVisible" max-width="480">
      <VCard>
        <VCardTitle class="d-flex align-center justify-space-between">
          <span>{{ "Create workspace" }}</span>
          <IconBtn @click="isCreateDialogVisible = false">
            <VIcon icon="bx-x" />
          </IconBtn>
        </VCardTitle>
        <VCardText>
          <VForm @submit.prevent="createTenant">
            <AppTextField v-model="newTenantName" label="Workspace name" placeholder="Acme Inc" :rules="[requiredRule]"
              class="mb-4" />
            <AppTextField v-model="newTenantSlug" label="Slug (optional)" placeholder="acme"
              hint="URL-friendly identifier. Auto-generated from the name when empty." persistent-hint class="mb-4" />
            <VAlert v-if="createError" type="error" variant="tonal" class="mb-4">
              {{ createError }}
            </VAlert>
            <div class="d-flex justify-end gap-4">
              <VBtn type="reset" color="secondary" variant="tonal" @click="isCreateDialogVisible = false">
                {{ "Cancel" }}
              </VBtn>
              <VBtn type="submit" color="primary" :loading="isCreating">
                {{ "Create" }}
              </VBtn>
            </div>
          </VForm>
        </VCardText>
      </VCard>
    </VDialog>
  </div>
</template>

<style lang="scss" scoped>
/* ℹ️ Workspace ATIVO: borda primary destacando a escolha. Selecionar NÃO
   navega — a borda (+ affordance "Workspace ativo") é a resposta visual. */
.tenant-card--active {
  border: 2px solid rgb(var(--v-theme-primary));
}
</style>
