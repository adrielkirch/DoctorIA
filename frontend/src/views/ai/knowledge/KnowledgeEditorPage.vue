<script setup lang="ts">
import type { KnowledgeChunkingSettings } from '@/types/knowledge'
import { createDefaultKnowledgeSettings, normalizeKnowledgeSettings } from '@/types/knowledge'
import { buildChunkPreview, buildChunks, htmlToPlainText } from '@/utils/knowledge/chunkWithSettings'
import { FileExtractionError, extractFileText } from '@/utils/knowledge/extractFileText'
import KnowledgeChunkPreviewDialog from '@/views/ai/knowledge/KnowledgeChunkPreviewDialog.vue'
import KnowledgeChunkSettings from '@/views/ai/knowledge/KnowledgeChunkSettings.vue'
import KnowledgeContentEditor from '@/views/ai/knowledge/KnowledgeContentEditor.vue'
import KnowledgeDeleteDialog from '@/views/ai/knowledge/KnowledgeDeleteDialog.vue'
import KnowledgeRetrievalSettings from '@/views/ai/knowledge/KnowledgeRetrievalSettings.vue'
import { useKnowledgeStore } from '@/views/ai/knowledge/useKnowledgeStore'
import type { KnowledgeChunk, KnowledgeEntry } from 'contracts/ai/knowledge/types'
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

/**
 * Página completa do knowledge (`/ai/knowledge/new` e `/ai/knowledge/:id`).
 * Substitui o antigo drawer: edição de conteúdo + configurações de
 * fragmentação/recuperação (paridade Dify) em uma página com deep-link.
 * `entryId === null` = nova entrada (`/ai/knowledge/new`).
 */
const props = defineProps<{
  entryId: number | null
}>()

const router = useRouter()
const store = useKnowledgeStore()

const EXTRACT_ERROR_MESSAGES = {
  UNSUPPORTED_TYPE: 'Unsupported file type. Accepted: .pdf, .txt, .docx, .csv',
  TOO_LARGE: 'File too large. Maximum size is 5 MB.',
  EMPTY_CONTENT: 'Could not extract text from this file. It may be empty or image-only.',
} as const

const LIST_PATH = '/ai/knowledge'

const isEditMode = computed(() => props.entryId !== null)
const pageTitle = computed(() => (isEditMode.value ? "Edit Knowledge" : "Add Knowledge"))

const entry = ref<KnowledgeEntry | null>(null)
const isLoading = ref(false)
const isSaving = ref(false)
const activeTab = ref<'content' | 'settings'>('content')


const title = ref('')
const tags = ref<string[]>([])
const content = ref('')



const linkedSecretName = ref<string | null>(null)
const isContentFromFile = ref(false)
const isExtractingFile = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)
const deleteDialogOpen = ref(false)
const titleError = ref('')


const settings = ref<KnowledgeChunkingSettings>(createDefaultKnowledgeSettings())
const previewDialogOpen = ref(false)


const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref<'success' | 'error'>('error')

function showError(message: string) {
  snackbarText.value = message
  snackbarColor.value = 'error'
  snackbar.value = true
}

async function loadEntry() {
  titleError.value = ''
  activeTab.value = 'content'
  store._pendingText = null
  store._pendingFilename = null
  store.fetchAllTags()

  if (props.entryId === null) {
    entry.value = null
    title.value = ''
    tags.value = []
    content.value = ''
    linkedSecretName.value = null
    isContentFromFile.value = false
    settings.value = createDefaultKnowledgeSettings()

    return
  }

  isLoading.value = true
  try {
    const loaded = await store.fetchKnowledgeById(props.entryId)

    entry.value = loaded
    title.value = loaded.title
    tags.value = [...loaded.tags]
    content.value = loaded.content
    linkedSecretName.value = loaded.linkedSecretName
    isContentFromFile.value = loaded.sourceType === 'UPLOADED'
    settings.value = await store.fetchKnowledgeSettings(loaded.id)
  }
  catch {
    showError("Could not load this knowledge entry")
    router.replace({ path: LIST_PATH })
  }
  finally {
    isLoading.value = false
  }
}

onMounted(loadEntry)
watch(() => props.entryId, loadEntry)

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file)
    return

  input.value = ''
  isExtractingFile.value = true
  try {
    const text = await extractFileText(file)

    content.value = `<p>${text.replace(/\n/g, '</p><p>')}</p>`
    isContentFromFile.value = true

    if (!title.value.trim())
      title.value = file.name



    store._pendingText = text
    store._pendingFilename = file.name
  }
  catch (err) {
    if (err instanceof FileExtractionError)
      showError(EXTRACT_ERROR_MESSAGES[err.code])
  }
  finally {
    isExtractingFile.value = false
  }
}

function triggerFileInput() {
  fileInputRef.value?.click()
}


async function syncNewTags(selected: string[]) {
  for (const tag of selected) {
    const normalised = tag.trim().toLowerCase()

    if (normalised && !store.allTags.includes(normalised))
      await store.createTag(normalised)
  }
}

/** Chunks que serão persistidos na entrada (recuperação). */
function resolveChunks(settingsValue: KnowledgeChunkingSettings): KnowledgeChunk[] {
  if (isContentFromFile.value) {
    return store._pendingText
      ? buildChunks(store._pendingText, settingsValue)
      : (entry.value?.chunks ?? [])
  }

  return buildChunks(htmlToPlainText(content.value), settingsValue)
}

/** Texto usado no "Visualizar parte". */
const previewChunks = computed(() =>
  buildChunkPreview(store._pendingText ?? htmlToPlainText(content.value), settings.value),
)

function resetSettings() {
  settings.value = createDefaultKnowledgeSettings()
}

function goBack() {
  router.push({ path: LIST_PATH })
}

async function handleSave() {
  titleError.value = ''

  if (!title.value.trim()) {
    titleError.value = "This field is required"
    activeTab.value = 'content'

    return
  }

  isSaving.value = true
  try {
    const payloadSettings = normalizeKnowledgeSettings(settings.value)
    const sourceType = isContentFromFile.value ? 'UPLOADED' : 'MANUAL'

    const sourceFilename = isContentFromFile.value
      ? (store._pendingFilename ?? entry.value?.sourceFilename ?? null)
      : null

    const chunks = resolveChunks(payloadSettings)

    const payload = {
      title: title.value.trim(),
      tags: tags.value,
      content: content.value,
      linkedSecretName: linkedSecretName.value ?? null,
      sourceType,
      sourceFilename,
      chunks,
    } as const

    const saved = entry.value
      ? await store.updateKnowledge(entry.value.id, payload)
      : await store.createKnowledge(payload)

    await store.saveKnowledgeSettings(saved.id, payloadSettings)

    store._pendingText = null
    store._pendingFilename = null
    router.push({ path: LIST_PATH, query: { saved: String(saved.id) } })
  }
  catch {
    showError("Something went wrong")
  }
  finally {
    isSaving.value = false
  }
}

async function handleDelete() {
  if (!entry.value)
    return

  try {
    await store.deleteKnowledge(entry.value.id)
    deleteDialogOpen.value = false
    router.push({ path: LIST_PATH, query: { deleted: '1' } })
  }
  catch {
    showError("Something went wrong")
  }
}
</script>

<template>
  <div>
    <!-- ─── Cabeçalho da página ─── -->
    <div class="d-flex align-center flex-wrap gap-3 mb-6">
      <VBtn icon="bx-arrow-back" variant="text" aria-label="Back to knowledge base" @click="goBack" />

      <h1 class="text-h4 font-weight-bold flex-grow-1 mb-0">
        {{ pageTitle }}
      </h1>

      <VBtn color="primary" prepend-icon="bx-save" :loading="isSaving" :disabled="isLoading" @click="handleSave">
        {{ "Save" }}
      </VBtn>

      <VBtn variant="tonal" color="secondary" :disabled="isSaving" @click="goBack">
        {{ "Cancel" }}
      </VBtn>

      <VBtn v-if="isEditMode" variant="tonal" color="error" prepend-icon="bx-trash" :disabled="isSaving"
        @click="deleteDialogOpen = true">
        {{ "Delete" }}
      </VBtn>
    </div>

    <VProgressLinear v-if="isLoading" indeterminate color="primary" class="mb-4" />

    <!-- ─── Origem (arquivo enviado, read-only) ─── -->
    <VAlert v-if="isContentFromFile" type="info" variant="tonal" density="compact" class="mb-4">
      <div class="text-caption">
        <strong>{{ "Source" }}:</strong>
        {{ store._pendingFilename ?? entry?.sourceFilename ?? '—' }}
        &nbsp;·&nbsp;
        <strong>{{ "Chunks" }}:</strong> {{ entry?.chunks.length ?? 0 }}
      </div>
    </VAlert>

    <!-- ─── Tabs: Conteúdo | Configurações de fragmentação ─── -->
    <VTabs v-model="activeTab" class="v-tabs-pill mb-4">
      <VTab value="content">
        <VIcon icon="bx-edit-alt" size="18" start />
        {{ "Content" }}
      </VTab>
      <VTab value="settings">
        <VIcon icon="bx-slider-alt" size="18" start />
        {{ "Chunk settings" }}
      </VTab>
    </VTabs>

    <VWindow v-model="activeTab" class="disable-tab-transition" :touch="false">
      <!-- ─── Conteúdo ─── -->
      <VWindowItem value="content">
        <VCard variant="outlined">
          <VCardText class="pa-5">
            <VTextField v-model="title" label="Title" :error-messages="titleError" placeholder="Entry title"
              class="mb-4" />

            <VCombobox v-model="tags" :items="store.allTags" label="Tags"
              placeholder="Select or type a tag and press Enter" multiple chips closable-chips clearable class="mb-6"
              @update:model-value="syncNewTags" />

            <div class="d-flex align-center flex-wrap gap-3 mb-3">
              <span class="text-body-2 text-medium-emphasis flex-grow-1">{{ "Content" }}</span>

              <VBtn variant="tonal" color="secondary" prepend-icon="bx-upload" :loading="isExtractingFile"
                @click="triggerFileInput">
                {{ "Upload PDF / TXT" }}
              </VBtn>
            </div>

            <KnowledgeContentEditor v-model="content" placeholder="Write knowledge content here..."
              :readonly="isContentFromFile" />

            <div v-if="isContentFromFile" class="d-flex align-center gap-1 mt-2">
              <VIcon icon="bx-info-circle" size="14" color="info" />
              <span class="text-caption text-info">Content from uploaded file — read-only. Upload a new file to
                replace.</span>
            </div>
          </VCardText>
        </VCard>
      </VWindowItem>

      <!-- ─── Configurações de fragmentação ─── -->
      <VWindowItem value="settings">
        <!-- ℹ️ Coluna estreita (como no Dify) para os campos não esticarem. -->
        <div class="d-flex flex-column gap-4" :style="{ maxInlineSize: '56rem' }">
          <KnowledgeChunkSettings v-model="settings" />

          <KnowledgeRetrievalSettings v-model="settings.retrieval" />

          <!-- Ações da etapa de configuração (Dify: Redefinir / Visualizar parte) -->
          <div class="d-flex align-center flex-wrap gap-3">
            <VBtn variant="tonal" color="secondary" prepend-icon="bx-refresh" @click="resetSettings">
              {{ "Reset" }}
            </VBtn>

            <VBtn variant="tonal" color="primary" prepend-icon="bx-show" @click="previewDialogOpen = true">
              {{ "Preview chunks" }}
            </VBtn>

            <VSpacer />

            <VBtn color="primary" prepend-icon="bx-save" :loading="isSaving" @click="handleSave">
              {{ "Save" }}
            </VBtn>
          </div>
        </div>
      </VWindowItem>
    </VWindow>

    <!-- Hidden file input -->
    <input ref="fileInputRef" type="file" accept=".pdf,.txt" class="d-none" @change="handleFileChange">

    <!-- ─── Preview dos chunks ─── -->
    <KnowledgeChunkPreviewDialog v-model="previewDialogOpen" :chunks="previewChunks" />

    <!-- ─── Confirmação de exclusão ─── -->
    <KnowledgeDeleteDialog v-model="deleteDialogOpen" :entry-title="entry?.title ?? title" @confirm="handleDelete" />

    <!-- ─── Snackbar ─── -->
    <VSnackbar v-model="snackbar" :color="snackbarColor" :timeout="4000">
      {{ snackbarText }}
    </VSnackbar>
  </div>
</template>
