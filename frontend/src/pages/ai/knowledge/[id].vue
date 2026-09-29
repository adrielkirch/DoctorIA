<script setup lang="ts">
import { computed, defineAsyncComponent, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const KnowledgeEditorPage = defineAsyncComponent(() => 
  import('@/views/ai/knowledge/KnowledgeEditorPage.vue')
)



definePage({
  meta: {
    action: 'read',
    subject: 'ai-knowledge',
    navActiveLink: 'ai-knowledge',
  },
})

const route = useRoute()
const router = useRouter()

const entryId = computed(() => {
  const parsed = Number(route.params.id)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
})


watchEffect(() => {
  if (entryId.value === null)
    router.replace({ path: '/ai/knowledge' })
})
</script>

<template>
  <Suspense v-if="entryId !== null">
    <template #default>
      <KnowledgeEditorPage :entry-id="entryId" />
    </template>
    <template #fallback>
      <div class="d-flex align-center justify-center h-100">
        <VProgressCircular indeterminate />
      </div>
    </template>
  </Suspense>
</template>
