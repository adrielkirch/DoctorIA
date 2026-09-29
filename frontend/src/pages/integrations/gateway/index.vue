<script setup lang="ts">
import GatewayHubView from '@/views/integrations/gateway/GatewayHubView.vue'

definePage({
  meta: {
    action: 'read',
    subject: 'integrations-gateway',
  },
})
</script>

<template>
  <GatewayHubView />
</template>
