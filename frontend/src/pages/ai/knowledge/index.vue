<script setup lang="ts">
import { FileExtractionError } from '@/utils/knowledge/extractFileText'
import KnowledgeGrid from '@/views/ai/knowledge/KnowledgeGrid.vue'
import { useKnowledgeStore } from '@/views/ai/knowledge/useKnowledgeStore'
import type { KnowledgeEntry } from 'contracts/ai/knowledge/types'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

definePage({
  meta: {
    action: 'read',
    subject: 'ai-knowledge',
  },
})

const route = useRoute()
const router = useRouter()
const store = useKnowledgeStore()

const EXTRACT_ERROR_MESSAGES = {
  UNSUPPORTED_TYPE: 'Unsupported file type. Accepted: .pdf, .txt, .docx, .csv',
  TOO_LARGE: 'File too large. Maximum size is 5 MB.',
  EMPTY_CONTENT: 'Could not extract text from this file. It may be empty or image-only.',
} as const


const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

const isUploading = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function onSearchInput() {
  if (debounceTimer)
    clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    store.page = 1
    store.fetchKnowledge().catch(showError)
  }, 300)
}

function showError(err?: unknown) {
  snackbarText.value = err instanceof FileExtractionError
    ? EXTRACT_ERROR_MESSAGES[err.code]
    : "Something went wrong"
  snackbarColor.value = 'error'
  snackbar.value = true
}

function showSuccess(msg: string) {
  snackbarText.value = msg
  snackbarColor.value = 'success'
  snackbar.value = true
}

/** 👉 Add/Edit agora é página completa com deep-link (`/ai/knowledge/:id`). */
function openEntry(entry: KnowledgeEntry) {
  router.push(`/ai/knowledge/${entry.id}`)
}

function openCreate() {
  router.push('/ai/knowledge/new')
}

/**
 * Feedback da página de edição: ela redireciona para cá com
 * `?saved=<id>` / `?deleted=1` — exibimos o snackbar e limpamos a query.
 */
function consumeEditorFeedback() {
  const { saved, deleted } = route.query

  if (!saved && !deleted)
    return

  showSuccess(saved ? 'Knowledge entry saved' : 'Knowledge entry deleted')
  store.fetchKnowledge().catch(showError)
  router.replace({ path: '/ai/knowledge' })
}

watch(() => route.query, consumeEditorFeedback, { immediate: true })

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file)
    return


  input.value = ''

  isUploading.value = true
  try {
    await store.uploadAndIngest(file)
    showSuccess("File ingested successfully")
    store.fetchKnowledge().catch(showError)
  }
  catch (err) {
    showError(err)
  }
  finally {
    isUploading.value = false
  }
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

onMounted(() => {
  store.fetchKnowledge().catch(showError)
})


watch(
  () => store.searchQuery,
  val => {
    if (val === '') {
      store.page = 1
      store.fetchKnowledge().catch(showError)
    }
  },
)


watch(() => store.page, () => {
  store.fetchKnowledge().catch(showError)
})


watch(() => store.activeTags, () => {
  store.page = 1
  store.fetchKnowledge().catch(showError)
})
</script>

<template>
  <div>
    <!-- ─── Top Bar ─── -->
    <div class="d-flex align-center flex-wrap gap-4 mb-6">
      <h1 class="text-h4 font-weight-bold flex-grow-1">
        {{ "Knowledge" }}
      </h1>

      <!-- Search -->
      <VTextField v-model="store.searchQuery" placeholder="Search knowledge..." prepend-inner-icon="bx-search"
        density="compact" hide-details clearable :style="{ maxInlineSize: '220px' }" @input="onSearchInput" />

      <!-- Multi-tag filter -->
      <VAutocomplete v-model="store.activeTags" :items="store.filteredTags" placeholder="Filter by tags..."
        prepend-inner-icon="bx-tag" density="compact" hide-details multiple chips closable-chips clearable
        :style="{ maxInlineSize: '320px' }" />

      <!-- Upload File -->
      <VBtn variant="tonal" color="secondary" prepend-icon="bx-upload" :loading="isUploading"
        :disabled="store.isLoading" @click="triggerFileInput">
        {{ "Upload File" }}
      </VBtn>

      <!-- Add Knowledge → página completa com deep-link -->
      <VBtn color="primary" prepend-icon="bx-plus" :disabled="store.isLoading" @click="openCreate">
        {{ "Add Knowledge" }}
      </VBtn>
    </div>

    <!-- ─── Grid ─── -->
    <VProgressLinear v-if="store.isLoading" indeterminate color="primary" class="mb-4" />

    <KnowledgeGrid :entries="store.filteredKnowledge" @entry-click="openEntry" />

    <!-- Paginação (server-side) -->
    <div v-if="store.total > 0" class="d-flex justify-end mt-4">
      <TablePagination v-model:page="store.page" :items-per-page="store.itemsPerPage" :total-items="store.total" />
    </div>

    <!-- Hidden file input -->
    <input ref="fileInputRef" type="file" accept=".pdf,.txt,.docx,.csv" class="d-none" @change="handleFileChange">

    <!-- ─── Snackbar ─── -->
    <VSnackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarText }}
    </VSnackbar>
  </div>
</template>
