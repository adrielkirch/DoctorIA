<script setup lang="ts">
import type { KnowledgeChunkPreview } from '@/utils/knowledge/chunkWithSettings';

const props = defineProps<{
  modelValue: boolean
  chunks: KnowledgeChunkPreview[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const KIND_META: Record<KnowledgeChunkPreview['kind'], { color: string; label: string }> = {
  CHUNK: { color: 'primary', label: 'Chunk' },
  PARENT: { color: 'secondary', label: 'Parent' },
  CHILD: { color: 'info', label: 'Child' },
}
</script>

<template>
  <VDialog :model-value="props.modelValue" max-width="760" scrollable
    @update:model-value="emit('update:modelValue', $event)">
    <VCard>
      <VCardTitle class="d-flex align-center gap-2 pt-4 px-4">
        <span class="text-h6 flex-grow-1">{{ "Chunk preview" }}</span>
        <VBtn icon="bx-x" variant="text" size="small" @click="emit('update:modelValue', false)" />
      </VCardTitle>

      <VCardSubtitle class="px-4">
        {{ (String(props.chunks.length) + " chunks generated") }}
      </VCardSubtitle>

      <VDivider />

      <VCardText class="px-4 py-4">
        <div v-if="props.chunks.length === 0" class="text-body-2 text-medium-emphasis text-center py-8">
          {{ "Nothing to preview — add content to this knowledge entry first." }}
        </div>

        <div v-else class="d-flex flex-column gap-3">
          <VCard v-for="chunk in props.chunks" :key="`${chunk.kind}-${chunk.chunkIndex}`" variant="outlined">
            <VCardText class="pa-3">
              <div class="d-flex flex-wrap align-center gap-2 mb-2">
                <VChip :color="KIND_META[chunk.kind].color" size="x-small" variant="tonal">
                  {{ KIND_META[chunk.kind].label }}
                </VChip>

                <span class="text-caption text-medium-emphasis">
                  #{{ chunk.chunkIndex }} · {{ chunk.tokenCount }} tokens · {{ chunk.text.length }}
                  {{ "characters" }}
                </span>
              </div>

              <pre class="chunk-preview__text text-caption mb-0">{{ chunk.text }}</pre>
            </VCardText>
          </VCard>
        </div>
      </VCardText>

      <VDivider />

      <VCardActions class="px-4 py-3">
        <VSpacer />
        <VBtn color="primary" variant="tonal" @click="emit('update:modelValue', false)">
          {{ "Close" }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.chunk-preview__text {
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: break-word;
  max-block-size: 220px;
  overflow-y: auto;
  font-family: "Courier New", monospace;
}
</style>
