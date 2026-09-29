<script setup lang="ts">
import SkillDrawer from '@/views/ai/skills/SkillDrawer.vue'
import SkillsGrid from '@/views/ai/skills/SkillsGrid.vue'
import { useSkillsStore } from '@/views/ai/skills/useSkillsStore'
import type { Skill } from 'contracts/ai/skills/types'
import { onMounted, ref, watch } from 'vue'

definePage({
  meta: {
    action: 'read',
    subject: 'ai-skills',
  },
})

const store = useSkillsStore()

const drawerOpen = ref(false)
const selectedSkill = ref<Skill | null>(null)
const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

let debounceTimer: ReturnType<typeof setTimeout> | null = null

function fetchSkillsSafely() {
  return store.fetchSkills().catch(() => {
    snackbarText.value = "Something went wrong. Please try again."
    snackbarColor.value = 'error'
    snackbar.value = true
  })
}


function onSearchInput() {
  if (debounceTimer)
    clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    store.page = 1
    fetchSkillsSafely()
  }, 300)
}

function setFilter(filter: 'all' | 'DEFAULT' | 'CUSTOM') {
  store.activeFilter = filter
  store.page = 1
  fetchSkillsSafely()
}

onMounted(() => {
  fetchSkillsSafely()
})


watch(() => store.page, () => {
  fetchSkillsSafely()
})

function openAddDrawer() {
  selectedSkill.value = null
  drawerOpen.value = true
}

function handleSkillClick(skill: Skill) {
  selectedSkill.value = skill
  drawerOpen.value = true
}

function handleSaved() {
  drawerOpen.value = false
  snackbarText.value = "Skill saved successfully"
  snackbarColor.value = 'success'
  snackbar.value = true
}

function handleDeleted() {
  drawerOpen.value = false
  snackbarText.value = "Skill deleted"
  snackbarColor.value = 'success'
  snackbar.value = true
}
</script>

<template>
  <div>
    <!-- Header row -->
    <div class="d-flex align-center flex-wrap gap-4 mb-6">
      <h1 class="text-h4 font-weight-bold flex-grow-1">
        {{ "Skills" }}
      </h1>

      <VBtn
        color="primary"
        prepend-icon="bx-plus"
        :disabled="store.isLoading"
        @click="openAddDrawer"
      >
        {{ "Add Skill" }}
      </VBtn>
    </div>

    <!-- Search + filter toolbar -->
    <div class="d-flex align-center flex-wrap gap-3 mb-6">
      <VTextField
        v-model="store.searchQuery"
        placeholder="Search skills..."
        prepend-inner-icon="bx-search"
        density="compact"
        hide-details
        clearable
        :style="{ maxInlineSize: '280px' }"
        @input="onSearchInput"
      />

      <div class="d-flex gap-2">
        <VChip
          :color="store.activeFilter === 'all' ? 'primary' : undefined"
          :variant="store.activeFilter === 'all' ? 'flat' : 'outlined'"
          @click="setFilter('all')"
        >
          {{ "All" }}
        </VChip>
        <VChip
          :color="store.activeFilter === 'DEFAULT' ? 'primary' : undefined"
          :variant="store.activeFilter === 'DEFAULT' ? 'flat' : 'outlined'"
          prepend-icon="bx-lock"
          @click="setFilter('DEFAULT')"
        >
          {{ "Default" }}
        </VChip>
        <VChip
          :color="store.activeFilter === 'CUSTOM' ? 'success' : undefined"
          :variant="store.activeFilter === 'CUSTOM' ? 'flat' : 'outlined'"
          prepend-icon="bx-code-alt"
          @click="setFilter('CUSTOM')"
        >
          {{ "Custom" }}
        </VChip>
      </div>
    </div>

    <!-- Loading bar -->
    <VProgressLinear
      v-show="store.isLoading"
      indeterminate
      color="primary"
      class="mb-4"
    />

    <!-- Skills grid -->
    <SkillsGrid
      :skills="store.filteredSkills"
      @skill-click="handleSkillClick"
    />

    <!-- Paginação (server-side) -->
    <div
      v-if="store.total > 0"
      class="d-flex justify-end mt-4"
    >
      <TablePagination
        v-model:page="store.page"
        :items-per-page="store.itemsPerPage"
        :total-items="store.total"
      />
    </div>

    <!-- Skill drawer — shared for add, edit, and read-only view -->
    <SkillDrawer
      v-model="drawerOpen"
      :skill="selectedSkill"
      @saved="handleSaved"
      @deleted="handleDeleted"
    />

    <!-- Snackbar -->
    <VSnackbar
      v-model="snackbar"
      :color="snackbarColor"
      :timeout="3000"
    >
      {{ snackbarText }}
    </VSnackbar>
  </div>
</template>
