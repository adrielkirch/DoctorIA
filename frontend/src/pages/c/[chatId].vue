<script setup lang="ts">



import ChatInterface from '@/views/ai/assistant/ChatInterface.vue';

definePage({
  meta: {
    action: 'read',
    subject: 'ai-assistant',


    immersive: true,
    layoutWrapperClasses: 'immersive',
  },
})
</script>

<template>
  <ChatInterface />
</template>
