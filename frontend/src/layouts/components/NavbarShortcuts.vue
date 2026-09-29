<script setup lang="ts">
import { computed } from 'vue'

/**
 * Atalhos do navbar. Os rótulos dos itens do sales (Inbox/Contacts) vêm do i18n —
 * o resto do template continua com os textos do próprio arquivo.
 */
const shortcuts = computed(() => [
  {
    icon: 'bx-group',
    title: 'Role Management',
    subtitle: 'Permission',
    to: { name: 'access-control-roles' },
  },
  {
    icon: 'bx-plug',
    title: "Inboxes",
    subtitle: 'Entry points',
    to: { name: 'sales-inboxes' },
  },
  {
    icon: 'bx-message-rounded-dots',
    title: "Messages",
    subtitle: 'Sales chat',
    to: { name: 'sales-chat' },
  },
  {
    icon: 'bx-user-circle',
    title: "Contacts",
    subtitle: 'Sales contacts',
    to: { name: 'sales-contacts' },
  },
  {
    icon: 'bx-bot',
    title: 'AI Assistant',
    subtitle: 'Workspace AI',
    to: { name: 'ai-assistant' },
  },
  {
    icon: 'bx-cog',
    title: 'Settings',
    subtitle: 'Account Settings',
    to: { name: 'pages-account-settings-tab', params: { tab: 'account' } },
  },

])
</script>

<template>
  <Shortcuts :shortcuts="shortcuts" />
</template>
