<script lang="ts" setup>
import { useAccessControlStore } from '@/stores/useAccessControlStore'
import { useAuthStore } from '@/stores/useAuthStore'
import AccountSettingsAccount from '@/views/pages/account-settings/AccountSettingsAccount.vue'
import type { Component } from 'vue'

const auth = useAuthStore()
const accessControlStore = useAccessControlStore()



accessControlStore.ensureLoaded()



const tabComponents: Record<string, Component> = {
  account: AccountSettingsAccount,

}

const route = useRoute('pages-account-settings-tab')


const tabs = computed(() => [
  {
    title: 'Profile',
    icon: 'bx-circle',
    tab: 'account',
  },
])


const activeTab = computed({
  get: () => 'account',
  set: () => 'account',
})

definePage({
  meta: {
    navActiveLink: 'pages-account-settings-tab',
  },
})
</script>

<template>
  <div>
    <VTabs
      v-model="activeTab"
      class="v-tabs-pill"
    >
      <VTab
        v-for="item in tabs"
        :key="item.tab"
        :value="item.tab"
        :to="{ name: 'pages-account-settings-tab', params: { tab: item.tab } }"
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
      class="mt-6 disable-tab-transition"
      :touch="false"
    >
      <!-- ℹ️ Render dinâmico: cada tab acessível mapeia para seu componente. -->
      <VWindowItem
        v-for="item in tabs"
        :key="item.tab"
        :value="item.tab"
      >
        <Component
          :is="tabComponents[item.tab]"
          v-if="tabComponents[item.tab]"
        />
      </VWindowItem>
    </VWindow>
  </div>
</template>
