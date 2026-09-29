<script setup lang="ts">
import type {
  KnowledgeChunkingMode,
  KnowledgeChunkingSettings,
  KnowledgeGeneralChunking,
  KnowledgeIndexSettings,
  KnowledgeParentChildChunking,
  KnowledgeParentMode,
  KnowledgePreProcessingRules,
} from '@/types/knowledge';
import {
  KNOWLEDGE_CHUNK_LIMITS,
  KNOWLEDGE_EMBEDDING_MODELS,
  KNOWLEDGE_QA_LANGUAGES,
} from '@/types/knowledge';
import KnowledgeSettingsCard from '@/views/ai/knowledge/KnowledgeSettingsCard.vue';
import { computed } from 'vue';

const props = defineProps<{
  modelValue: KnowledgeChunkingSettings
}>()

const emit = defineEmits<{
  'update:modelValue': [value: KnowledgeChunkingSettings]
}>()

const settings = computed(() => props.modelValue)



const modeOptions = computed(() => [
  {
    value: 'GENERAL' as const,
    icon: 'bx-text',
    title: "General",
    hint: "General text chunking mode — retrieved and recalled chunks are the same.",
  },
  {
    value: 'PARENT_CHILD' as const,
    icon: 'bx-git-branch',
    title: "Parent-child",
    hint: "In parent-child mode the child chunk is used for retrieval and the parent chunk is used for recall as context.",
  },
])

const qaLanguageItems = computed(() => KNOWLEDGE_QA_LANGUAGES.map(language => ({
  title: language,
  value: language,
})))

const embeddingModelItems = computed(() => KNOWLEDGE_EMBEDDING_MODELS.map(model => ({
  title: model.label ?? model.value,
  value: model.value,
})))

function patch(patchValue: Partial<KnowledgeChunkingSettings>) {
  emit('update:modelValue', { ...props.modelValue, ...patchValue })
}

function patchGeneral(patchValue: Partial<KnowledgeGeneralChunking>) {
  patch({ general: { ...props.modelValue.general, ...patchValue } })
}

function patchGeneralRules(patchValue: Partial<KnowledgePreProcessingRules>) {
  patchGeneral({ preProcessing: { ...props.modelValue.general.preProcessing, ...patchValue } })
}

function patchParentChild(patchValue: Partial<KnowledgeParentChildChunking>) {
  patch({ parentChild: { ...props.modelValue.parentChild, ...patchValue } })
}

function patchParentChildRules(patchValue: Partial<KnowledgePreProcessingRules>) {
  patchParentChild({ preProcessing: { ...props.modelValue.parentChild.preProcessing, ...patchValue } })
}

function patchIndex(patchValue: Partial<KnowledgeIndexSettings>) {
  patch({ index: { ...props.modelValue.index, ...patchValue } })
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

function onModeChange(value: unknown) {
  if (value === 'GENERAL' || value === 'PARENT_CHILD')
    patch({ mode: value as KnowledgeChunkingMode })
}

function onParentModeChange(value: unknown) {
  if (value === 'PARAGRAPH' || value === 'FULL_DOC')
    patchParentChild({ parentMode: value as KnowledgeParentMode })
}
</script>

<template>
  <div class="d-flex flex-column gap-4">
    <!-- ─── Método de fragmentação + campos do método escolhido ─── -->
    <KnowledgeSettingsCard title="Chunking method">
      <VRadioGroup :model-value="settings.mode" @update:model-value="onModeChange">
        <VRow>
          <VCol v-for="option in modeOptions" :key="option.value" cols="12" sm="6">
            <VCard :data-testid="`knowledge-mode-${option.value}`"
              :variant="settings.mode === option.value ? 'tonal' : 'outlined'"
              :color="settings.mode === option.value ? 'primary' : undefined" :ripple="false"
              class="h-100 cursor-pointer" @click="onModeChange(option.value)">
              <VCardText class="d-flex align-start gap-2 pa-4">
                <VRadio :value="option.value" color="primary" density="compact" :ripple="false"
                  class="align-start flex-grow-0" />

                <div class="flex-grow-1">
                  <div class="d-flex flex-wrap align-center gap-2">
                    <VIcon :icon="option.icon" size="18" />
                    <span class="text-subtitle-2 font-weight-medium">{{ option.title }}</span>
                  </div>

                  <p class="text-caption text-medium-emphasis mb-0 mt-1">
                    {{ option.hint }}
                  </p>
                </div>
              </VCardText>
            </VCard>
          </VCol>
        </VRow>
      </VRadioGroup>

      <!-- ─── Geral ─── -->
      <template v-if="settings.mode === 'GENERAL'">
        <VDivider />

        <VTextField :model-value="settings.general.segmentIdentifier" label="Segment identifier"
          hint="Separator written as an escape sequence (e.g. \\n) used to split the text." persistent-hint
          density="comfortable"
          @update:model-value="value => patchGeneral({ segmentIdentifier: String(value ?? '') })" />

        <VRow>
          <VCol cols="12" sm="6">
            <VTextField :model-value="settings.general.maxChunkLength" label="Max chunk length" suffix="characters"
              :min="KNOWLEDGE_CHUNK_LIMITS.maxChunkLength.min" :max="KNOWLEDGE_CHUNK_LIMITS.maxChunkLength.max"
              type="number" density="comfortable" hide-details
              @update:model-value="value => patchGeneral({ maxChunkLength: toNumber(value, settings.general.maxChunkLength) })" />
          </VCol>

          <VCol cols="12" sm="6">
            <VTextField :model-value="settings.general.chunkOverlap" label="Chunk overlap" suffix="characters"
              :min="KNOWLEDGE_CHUNK_LIMITS.chunkOverlap.min" :max="KNOWLEDGE_CHUNK_LIMITS.chunkOverlap.max"
              type="number" density="comfortable" hide-details
              @update:model-value="value => patchGeneral({ chunkOverlap: toNumber(value, settings.general.chunkOverlap) })" />
          </VCol>
        </VRow>

        <VDivider />

        <div class="d-flex flex-column gap-1">
          <p class="text-subtitle-2 font-weight-medium mb-1">
            {{ "Text pre-processing rules" }}
          </p>

          <VSwitch :model-value="settings.general.preProcessing.replaceConsecutiveWhitespace"
            label="Replace consecutive spaces, newlines and tabs" density="compact" hide-details
            class="ms-n2 flex-grow-0"
            @update:model-value="value => patchGeneralRules({ replaceConsecutiveWhitespace: Boolean(value) })" />

          <VSwitch :model-value="settings.general.preProcessing.removeUrlsAndEmails"
            label="Remove all URLs and email addresses" density="compact" hide-details class="ms-n2 flex-grow-0"
            @update:model-value="value => patchGeneralRules({ removeUrlsAndEmails: Boolean(value) })" />

          <VSwitch :model-value="settings.general.autoSummary" label="Automatic summary generation" density="compact"
            hide-details class="ms-n2 flex-grow-0"
            @update:model-value="value => patchGeneral({ autoSummary: Boolean(value) })" />

          <VSwitch :model-value="settings.general.qaFormat" label="Chunk using the Q&A format in" density="compact"
            hide-details class="ms-n2 flex-grow-0"
            @update:model-value="value => patchGeneral({ qaFormat: Boolean(value) })" />

          <div v-if="settings.general.qaFormat" class="ms-10">
            <VSelect :model-value="settings.general.qaFormatLanguage" :items="qaLanguageItems" label="Language"
              density="comfortable" hide-details
              @update:model-value="value => patchGeneral({ qaFormatLanguage: String(value ?? 'English') })" />
          </div>
        </div>
      </template>

      <!-- ─── Pai-filho ─── -->
      <template v-else>
        <VDivider />

        <div class="d-flex flex-column gap-2">
          <p class="text-subtitle-2 font-weight-medium mb-0">
            {{ "Parent chunk for context" }}
          </p>

          <VRadioGroup :model-value="settings.parentChild.parentMode" @update:model-value="onParentModeChange">
            <VRadio data-testid="knowledge-parent-mode-PARAGRAPH" value="PARAGRAPH" color="primary"
              class="align-start flex-grow-0 mb-4">
              <template #label>
                <div class="text-wrap">
                  <div class="font-weight-medium">
                    {{ "Paragraph" }}
                  </div>

                  <div class="text-caption text-medium-emphasis">
                    This mode splits the text into paragraphs based on delimiters and the max chunk length, using the
                    split text as the parent chunk for retrieval.
                  </div>
                </div>
              </template>
            </VRadio>

            <VRadio data-testid="knowledge-parent-mode-FULL_DOC" value="FULL_DOC" color="primary"
              class="align-start flex-grow-0">
              <template #label>
                <div class="text-wrap">
                  <div class="font-weight-medium">
                    {{ "Full document" }}
                  </div>

                  <div class="text-caption text-medium-emphasis">
                    The whole document is used as the parent chunk and retrieved directly. For performance, text over
                    10000 tokens is truncated automatically.
                  </div>
                </div>
              </template>
            </VRadio>
          </VRadioGroup>

          <VRow v-if="settings.parentChild.parentMode === 'PARAGRAPH'">
            <VCol cols="12" sm="6">
              <VTextField :model-value="settings.parentChild.parentSegmentIdentifier" label="Parent segment identifier"
                density="comfortable" hide-details
                @update:model-value="value => patchParentChild({ parentSegmentIdentifier: String(value ?? '') })" />
            </VCol>

            <VCol cols="12" sm="6">
              <VTextField :model-value="settings.parentChild.parentMaxChunkLength" label="Parent max chunk length"
                suffix="characters" :min="KNOWLEDGE_CHUNK_LIMITS.parentMaxChunkLength.min"
                :max="KNOWLEDGE_CHUNK_LIMITS.parentMaxChunkLength.max" type="number" density="comfortable" hide-details
                @update:model-value="value => patchParentChild({ parentMaxChunkLength: toNumber(value, settings.parentChild.parentMaxChunkLength) })" />
            </VCol>
          </VRow>
        </div>

        <VDivider />

        <div class="d-flex flex-column gap-2">
          <p class="text-subtitle-2 font-weight-medium mb-0">
            {{ "Child chunk for retrieval" }}
          </p>

          <VRow>
            <VCol cols="12" sm="6">
              <VTextField :model-value="settings.parentChild.childSegmentIdentifier" label="Child segment identifier"
                density="comfortable" hide-details
                @update:model-value="value => patchParentChild({ childSegmentIdentifier: String(value ?? '') })" />
            </VCol>

            <VCol cols="12" sm="6">
              <VTextField :model-value="settings.parentChild.childMaxChunkLength" label="Child max chunk length"
                suffix="characters" :min="KNOWLEDGE_CHUNK_LIMITS.childMaxChunkLength.min"
                :max="KNOWLEDGE_CHUNK_LIMITS.childMaxChunkLength.max" type="number" density="comfortable" hide-details
                @update:model-value="value => patchParentChild({ childMaxChunkLength: toNumber(value, settings.parentChild.childMaxChunkLength) })" />
            </VCol>
          </VRow>

          <div class="d-flex flex-column gap-1">
            <p class="text-subtitle-2 font-weight-medium mb-1">
              {{ "Text pre-processing rules" }}
            </p>

            <VSwitch :model-value="settings.parentChild.preProcessing.replaceConsecutiveWhitespace"
              label="Replace consecutive spaces, newlines and tabs" density="compact" hide-details
              class="ms-n2 flex-grow-0"
              @update:model-value="value => patchParentChildRules({ replaceConsecutiveWhitespace: Boolean(value) })" />

            <VSwitch :model-value="settings.parentChild.preProcessing.removeUrlsAndEmails"
              label="Remove all URLs and email addresses" density="compact" hide-details class="ms-n2 flex-grow-0"
              @update:model-value="value => patchParentChildRules({ removeUrlsAndEmails: Boolean(value) })" />

            <VSwitch :model-value="settings.parentChild.autoSummary" label="Automatic summary generation"
              density="compact" hide-details class="ms-n2 flex-grow-0"
              @update:model-value="value => patchParentChild({ autoSummary: Boolean(value) })" />
          </div>
        </div>
      </template>
    </KnowledgeSettingsCard>

    <!-- ─── Modo de índice (MVP: só alta qualidade) ─── -->
    <KnowledgeSettingsCard title="Index mode">
      <div data-testid="knowledge-index-high-quality" class="d-flex flex-wrap align-center gap-2">
        <span class="text-subtitle-2 font-weight-medium">
          {{ "High quality" }}
        </span>

        <VChip size="x-small" color="primary" variant="tonal">
          {{ "Recommended" }}
        </VChip>
      </div>

      <p class="text-caption text-medium-emphasis mb-0">
        {{ "Calls the default system embedding interface for processing, providing higher accuracy when querying." }}
      </p>

      <VSelect :model-value="settings.index.embeddingModel" :items="embeddingModelItems" label="Embedding model"
        density="comfortable" hide-details
        @update:model-value="value => patchIndex({ embeddingModel: String(value ?? '') })" />
    </KnowledgeSettingsCard>
  </div>
</template>
