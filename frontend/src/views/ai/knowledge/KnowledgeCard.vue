<script setup lang="ts">
import type { KnowledgeEntry } from 'contracts/ai/knowledge/types';

const props = defineProps<{
  entry: KnowledgeEntry
}>()

defineEmits<{
  click: [entry: KnowledgeEntry]
}>()

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

const excerpt = computed(() => {
  const plain = stripHtml(props.entry.content)

  return plain.length > 150 ? `${plain.slice(0, 147)}…` : plain
})
</script>

<template>
  <VCard
    class="knowledge-card cursor-pointer h-100"
    hover
    @click="$emit('click', entry)"
  >
    <VCardText class="pa-4">
      <!-- Title row with UPLOADED badge -->
      <div class="d-flex align-start justify-space-between gap-2 mb-2">
        <span class="text-body-1 font-weight-semibold text-truncate flex-grow-1">
          {{ entry.title }}
        </span>

        <VChip
          v-if="entry.sourceType === 'UPLOADED'"
          size="x-small"
          color="info"
          label
          class="flex-shrink-0"
        >
          <VIcon
            icon="bx-upload"
            size="10"
            class="me-1"
          />
          {{ "Uploaded" }}
        </VChip>
      </div>

      <!-- Excerpt -->
      <p
        class="text-caption text-medium-emphasis mb-3"
        style="line-height: 1.5;"
      >
        {{ excerpt }}
      </p>

      <!-- Tags -->
      <div
        v-if="entry.tags.length > 0"
        class="d-flex flex-wrap gap-1"
      >
        <VChip
          v-for="tag in entry.tags"
          :key="tag"
          size="x-small"
          variant="tonal"
          color="secondary"
        >
          {{ tag }}
        </VChip>
      </div>

      <!-- Linked secret indicator -->
      <div
        v-if="entry.linkedSecretName"
        class="d-flex align-center gap-1 mt-2"
      >
        <VIcon
          icon="bx-lock-alt"
          size="12"
          color="warning"
        />
        <span class="text-caption text-warning">{{ entry.linkedSecretName }}</span>
      </div>
    </VCardText>
  </VCard>
</template>
