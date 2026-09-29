<script setup lang="ts">
import { getUserInitials } from "@/@core/utils/formatters";
import { useAccessControlStore } from "@/stores/useAccessControlStore";
import { useAuthStore } from "@/stores/useAuthStore";
import type { RouteLocationRaw } from "vue-router";
import { PerfectScrollbar } from "vue3-perfect-scrollbar";

interface UserProfileMenuNavItem {
  type: "navItem";
  icon: string;
  title: string;
  to: RouteLocationRaw;
  badgeProps?: { color: string; content: string };
}

interface UserProfileMenuDivider {
  type: "divider";
  title?: string;
}

type UserProfileMenuItem = UserProfileMenuNavItem | UserProfileMenuDivider;

const router = useRouter();
const ability = useAbility();
const auth = useAuthStore();




const accessControlStore = useAccessControlStore();
accessControlStore.ensureLoaded();


const userData = useCookie<any>("userData");


const userInitials = computed(() =>
  getUserInitials(userData.value?.fullName || userData.value?.username || ""),
);






const effectiveRoleName = computed(() => {
  if (!auth.currentTenant) return "";

  const roleId = accessControlStore.roleIdForMembership(auth.currentRole);

  return roleId
    ? (accessControlStore.roleById.get(roleId)?.name ?? roleId)
    : "";
});

const logout = async () => {
  auth.logout();

  useCookie("userAbilityRules").value = null;


  ability.update([]);

  await router.push("/login");
};


const userProfileList = computed<UserProfileMenuItem[]>(() => {
  if (!auth.currentTenant) return [];

  return [
    { type: "divider" },
    {
      type: "navItem",
      icon: "bx-cog",
      title: "Settings",
      to: { name: "pages-account-settings-tab", params: { tab: "account" } },
    },
  ];
});
</script>

<template>
  <!-- Always show initials instead of avatar -->
  <VAvatar size="38" class="cursor-pointer" color="avatar-initials" variant="flat">
    <span class="text-xs font-weight-medium">
      {{ userInitials }}
    </span>

    <!-- SECTION Menu -->
    <VMenu activator="parent" width="240" location="bottom end" offset="20px">
      <VList>
        <VListItem>
          <div class="d-flex gap-2 align-center">
            <VListItemAction>
              <VAvatar color="avatar-initials" variant="flat">
                <span class="text-sm font-weight-medium">
                  {{ userInitials }}
                </span>
              </VAvatar>
            </VListItemAction>
            <div>
              <VListItemTitle class="font-weight-medium">
                {{ userData.fullName || userData.username }}
              </VListItemTitle>
              <VListItemSubtitle v-if="effectiveRoleName" class="text-disabled text-capitalize">
                {{ effectiveRoleName }}
              </VListItemSubtitle>
            </div>
          </div>
        </VListItem>

        <PerfectScrollbar :options="{ wheelPropagation: false }">
          <template v-for="item in userProfileList" :key="item.title || item.type">
            <VListItem v-if="item.type === 'navItem'" :to="item.to">
              <template #prepend>
                <VIcon :icon="item.icon" size="22" />
              </template>

              <VListItemTitle>{{ item.title }}</VListItemTitle>

              <template v-if="item.badgeProps" #append>
                <VBadge rounded class="me-3" v-bind="item.badgeProps" />
              </template>
            </VListItem>

            <VDivider v-else class="my-1" />
          </template>
          <VDivider class="my-1" />
          <VListItem prepend-icon="bx-power-off" @click="logout">
            {{ "Logout" }}
          </VListItem>
        </PerfectScrollbar>
      </VList>
    </VMenu>
    <!-- !SECTION -->
  </VAvatar>
</template>
