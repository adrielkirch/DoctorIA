<script setup lang="ts">
import McpHubView from '@/views/integrations/mcp/McpHubView.vue'

definePage({
  meta: {
    action: 'read',
    subject: 'integrations-mcp',
  },
})
</script>

<template>
  <McpHubView />
</template>
