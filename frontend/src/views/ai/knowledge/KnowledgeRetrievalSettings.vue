<script setup lang="ts">
import type { KnowledgeRetrievalMode, KnowledgeRetrievalSettings } from '@/types/knowledge';
import { KNOWLEDGE_CHUNK_LIMITS, KNOWLEDGE_RERANK_MODELS } from '@/types/knowledge';
import KnowledgeSettingsCard from '@/views/ai/knowledge/KnowledgeSettingsCard.vue';
import { computed } from 'vue';

const props = defineProps<{
  modelValue: KnowledgeRetrievalSettings
}>()

const emit = defineEmits<{
  'update:modelValue': [value: KnowledgeRetrievalSettings]
}>()

const settings = computed(() => props.modelValue)

/** Reordenação só faz sentido em busca vetorial/híbrida. */
const rerankVisible = computed(() => settings.value.mode !== 'FULL_TEXT')

const rerankItems = computed(() => KNOWLEDGE_RERANK_MODELS.map(model => ({
  title: model.label ?? model.value,
  value: model.value,
})))

function patch(patchValue: Partial<KnowledgeRetrievalSettings>) {
  emit('update:modelValue', { ...props.modelValue, ...patchValue })
}

function onModeChange(value: unknown) {
  if (value === 'VECTOR' || value === 'FULL_TEXT' || value === 'HYBRID')
    patch({ mode: value as KnowledgeRetrievalMode })
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

function toWeight(value: unknown, fallback: number): number {
  const parsed = toNumber(value, fallback)

  return Math.min(Math.max(Math.round(parsed * 10) / 10, 0), 1)
}

/**
 * Pontuação ponderada: os dois pesos sempre somam 1 — ao mexer em um,
 * o outro é rebalanceado (0.7 / 0.3 por default, como no Dify).
 */
function rebalance(key: 'semanticWeight' | 'keywordWeight', value: unknown) {
  const current = props.modelValue

  if (key === 'semanticWeight') {
    const semanticWeight = toWeight(value, current.semanticWeight)

    patch({ semanticWeight, keywordWeight: Number((1 - semanticWeight).toFixed(1)) })
  }
  else {
    const keywordWeight = toWeight(value, current.keywordWeight)

    patch({ keywordWeight, semanticWeight: Number((1 - keywordWeight).toFixed(1)) })
  }
}

function onSliderUpdate(key: 'semanticWeight' | 'keywordWeight', value: unknown) {
  rebalance(key, Array.isArray(value) ? value[0] : value)
}
</script>

<template>
  <KnowledgeSettingsCard title="Retrieval settings"
    hint="Learn about the retrieval method — you can change it at any time in the knowledge settings.">
    <VRadioGroup :model-value="settings.mode" @update:model-value="onModeChange">
      <VRadio value="VECTOR" color="primary" class="align-start flex-grow-0 mb-4">
        <template #label>
          <div class="text-wrap">
            <div class="font-weight-medium">
              {{ "Vector search" }}
            </div>

            <div class="text-caption text-medium-emphasis">
              {{ "Generates query embeddings and searches for the text chunk most similar to its vector representation."
              }}
            </div>
          </div>
        </template>
      </VRadio>

      <VRadio value="FULL_TEXT" color="primary" class="align-start flex-grow-0 mb-4">
        <template #label>
          <div class="text-wrap">
            <div class="font-weight-medium">
              {{ "Full-text search" }}
            </div>

            <div class="text-caption text-medium-emphasis">
              Indexes all terms in the document, letting users search any term and retrieve relevant text chunks
              containing them.
            </div>
          </div>
        </template>
      </VRadio>

      <VRadio value="HYBRID" color="primary" class="align-start flex-grow-0">
        <template #label>
          <div class="text-wrap">
            <div class="d-flex flex-wrap align-center gap-2">
              <span class="font-weight-medium">{{ "Hybrid search" }}</span>

              <VChip size="x-small" color="primary" variant="tonal">
                {{ "Recommended" }}
              </VChip>
            </div>

            <div class="text-caption text-medium-emphasis">
              Runs full-text and vector searches simultaneously and re-ranks to select the best match for the user
              query. Rerank model API configuration is required.
            </div>
          </div>
        </template>
      </VRadio>
    </VRadioGroup>

    <!-- ─── Pontuação ponderada (Pesquisa Híbrida) ─── -->
    <VCard v-if="settings.mode === 'HYBRID'" variant="tonal">
      <VCardText class="pa-4 d-flex flex-column gap-2">
        <div>
          <p class="text-caption font-weight-medium mb-0">
            {{ "Weighted score" }}
          </p>

          <p class="text-caption text-medium-emphasis mb-0">
            By adjusting the assigned weights, this rerank strategy decides whether to prioritize semantic or keyword
            matching.
          </p>
        </div>

        <div class="d-flex flex-column gap-1">
          <div class="d-flex align-center justify-space-between">
            <span class="text-caption">{{ "Semantic" }}</span>
            <span class="text-caption font-weight-medium">{{ settings.semanticWeight.toFixed(1) }}</span>
          </div>

          <VSlider :model-value="settings.semanticWeight" :min="0" :max="1" :step="0.1" color="primary" thumb-label
            hide-details @update:model-value="value => onSliderUpdate('semanticWeight', value)" />
        </div>

        <div class="d-flex flex-column gap-1">
          <div class="d-flex align-center justify-space-between">
            <span class="text-caption">{{ "Keyword" }}</span>
            <span class="text-caption font-weight-medium">{{ settings.keywordWeight.toFixed(1) }}</span>
          </div>

          <VSlider :model-value="settings.keywordWeight" :min="0" :max="1" :step="0.1" color="primary" thumb-label
            hide-details @update:model-value="value => onSliderUpdate('keywordWeight', value)" />
        </div>
      </VCardText>
    </VCard>

    <!-- ─── Modelo de reordenação (vetorial/híbrida) ─── -->
    <VSelect v-if="rerankVisible" :model-value="settings.rerankModel" :items="rerankItems" label="Rerank model"
      hint="The rerank model reorders the candidate document list based on semantic match with the user query, improving semantic ranking results."
      persistent-hint density="comfortable"
      @update:model-value="value => patch({ rerankModel: String(value ?? '') })" />

    <VRow>
      <VCol cols="12" sm="6">
        <VTextField :model-value="settings.topK" label="Top K" :min="KNOWLEDGE_CHUNK_LIMITS.topK.min"
          :max="KNOWLEDGE_CHUNK_LIMITS.topK.max" type="number" density="comfortable" hide-details
          @update:model-value="value => patch({ topK: toNumber(value, settings.topK) })" />
      </VCol>

      <VCol cols="12" sm="6">
        <VTextField :model-value="settings.scoreThreshold" label="Score threshold"
          :min="KNOWLEDGE_CHUNK_LIMITS.scoreThreshold.min" :max="KNOWLEDGE_CHUNK_LIMITS.scoreThreshold.max" :step="0.1"
          type="number" density="comfortable" hide-details
          @update:model-value="value => patch({ scoreThreshold: toNumber(value, settings.scoreThreshold) })" />
      </VCol>
    </VRow>
  </KnowledgeSettingsCard>
</template>
