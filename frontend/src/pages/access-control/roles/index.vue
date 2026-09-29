<script setup lang="ts">
import { useAccessControlStore } from "@/stores/useAccessControlStore";
import RoleCards from "@/views/access-control/roles/RoleCards.vue";
import UserList from "@/views/access-control/roles/UserList.vue";
import TeamCards from "@/views/access-control/teams/TeamCards.vue";



const accessControlStore = useAccessControlStore();

accessControlStore.ensureLoaded();

const canViewTeams = computed(() => accessControlStore.can("teams.view"));

definePage({
  meta: {
    action: "read",
    subject: "access-control-roles",
  },
});
</script>

<template>
  <VRow>
    <VCol cols="12">
      <h4 class="text-h4 mb-1">
        {{ "Roles List" }}
      </h4>
      <p class="text-body-1 mb-0">
        {{ "A role provides access to predefined menus and features so that, depending on the assigned role, an administrator can access what they need." }}
      </p>
    </VCol>

    <!-- 👉 Roles Cards -->
    <VCol cols="12">
      <RoleCards />
    </VCol>

    <!-- 👉 Teams (cada membro pode ou não ter um time) -->
    <template v-if="canViewTeams">
      <VCol cols="12">
        <h4 class="text-h4 mb-1 mt-6">
          {{ "Teams" }}
        </h4>
        <p class="text-body-1 mb-0">
          {{ "Group workspace members into teams — a member may or may not have a team." }}
        </p>
      </VCol>

      <VCol cols="12">
        <TeamCards />
      </VCol>
    </template>

    <VCol cols="12">
      <h4 class="text-h4 mb-1 mt-6">
        {{ "Total users with their roles" }}
      </h4>
      <p class="text-body-1 mb-0">
        {{ "Find all of your company's administrator accounts and their associate roles." }}
      </p>
    </VCol>

    <VCol cols="12">
      <!-- 👉 User List  -->
      <UserList />
    </VCol>
  </VRow>
</template>
