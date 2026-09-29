<script setup lang="ts">
import KnowledgeEditorPage from '@/views/ai/knowledge/KnowledgeEditorPage.vue';


definePage({
  meta: {
    action: 'read',
    subject: 'ai-knowledge',
    navActiveLink: 'ai-knowledge',
  },
})
</script>

<template>
  <KnowledgeEditorPage :entry-id="null" />
</template>
