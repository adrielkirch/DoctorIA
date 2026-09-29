<script lang="ts" setup>
import { useAccessControlStore } from '@/stores/useAccessControlStore'
import UserProfileHeader from '@/views/pages/user-profile/UserProfileHeader.vue'
import UserProfileConnections from '@/views/pages/user-profile/connections/UserProfileConnections.vue'
import UserProfile from '@/views/pages/user-profile/profile/index.vue'
import UserTeam from '@/views/pages/user-profile/team/index.vue'

definePage({
  meta: {
    navActiveLink: 'pages-user-profile-tab',
    key: 'tab',
  },
})

const route = useRoute('pages-user-profile-tab')
const accessControlStore = useAccessControlStore()

accessControlStore.ensureLoaded()


const tabs = computed(() => [
  { title: "Profile", icon: 'bx-user', tab: 'profile' },
  { title: "Team", icon: 'bx-group', tab: 'teams' },
  ...(accessControlStore.can('gateway.view')
    ? [{ title: "Connections", icon: 'bx-git-branch', tab: 'connections' }]
    : []),
])

const activeTab = computed({
  get: () => tabs.value.some(tab => tab.tab === route.params.tab) ? route.params.tab : tabs.value[0].tab,
  set: () => route.params.tab,
})
</script>

<template>
  <div>
    <UserProfileHeader />

    <VTabs
      v-model="activeTab"
      class="v-tabs-pill my-2"
    >
      <VTab
        v-for="item in tabs"
        :key="item.icon"
        :value="item.tab"
        :to="{ name: 'pages-user-profile-tab', params: { tab: item.tab } }"
      >
        <VIcon
          size="20"
          start
          :icon="item.icon"
        />
        {{ item.title }}
      </VTab>
    </VTabs>

    <VWindow
      v-model="activeTab"
      class="disable-tab-transition"
      :touch="false"
    >
      <!-- Profile -->
      <VWindowItem value="profile">
        <UserProfile />
      </VWindowItem>

      <!-- Teams -->
      <VWindowItem value="teams">
        <UserTeam />
      </VWindowItem>

      <VWindowItem
        v-if="tabs.some(tab => tab.tab === 'connections')"
        value="connections"
      >
        <UserProfileConnections />
      </VWindowItem>
    </VWindow>
  </div>
</template>
