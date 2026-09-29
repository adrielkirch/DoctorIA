<script setup lang="ts">
import SidebarBrandHeader from '@/components/SidebarBrandHeader.vue'
</script>

<template>
  <!--
    ℹ️ Header da view chats: reutiliza o `SidebarBrandHeader` compartilhado com
    a view default (a marca/estilo vivem lá — padrão único das duas vertical
    navs, sem overrides CSS aqui). Ações de navegação ficam no `__actions` do
    AiChatNavigation.
  -->
  <SidebarBrandHeader show-name />
</template>
