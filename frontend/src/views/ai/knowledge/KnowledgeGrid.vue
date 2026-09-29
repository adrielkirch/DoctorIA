<script setup lang="ts">
import type { KnowledgeEntry } from 'contracts/ai/knowledge/types';
import KnowledgeCard from './KnowledgeCard.vue';

defineProps<{
  entries: KnowledgeEntry[]
}>()

defineEmits<{
  entryClick: [entry: KnowledgeEntry]
}>()
</script>

<template>
  <div>
    <VRow v-if="entries.length > 0">
      <VCol
        v-for="entry in entries"
        :key="entry.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <KnowledgeCard
          :entry="entry"
          @click="$emit('entryClick', entry)"
        />
      </VCol>
    </VRow>

    <div
      v-else
      class="d-flex flex-column align-center justify-center py-16 text-medium-emphasis"
    >
      <VIcon
        icon="bx-book-open"
        size="64"
        class="mb-4 opacity-40"
      />
      <p class="text-body-1">
        {{ "No knowledge found" }}
      </p>
      <p class="text-caption">
        {{ "Try adjusting your search or tag filter" }}
      </p>
    </div>
  </div>
</template>
