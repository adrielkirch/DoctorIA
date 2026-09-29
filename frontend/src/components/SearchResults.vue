<script setup lang="ts">
import { useSearchStore } from '@/stores/useSearchStore'
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'


const searchStore = useSearchStore()
const router = useRouter()

const categoryIcons: Record<string, string> = {
  skill: 'bx-bulb',
  page: 'bx-file',
  task: 'bx-task',
  user: 'bx-user',
}

const categoryLabels: Record<string, string> = {
  skill: 'Skills',
  page: 'Pages',
  task: 'Tasks',
  user: 'Users',
}

const handleSelectResult = (suggestion: any) => {
  if (suggestion.href)
    router.push(suggestion.href)

  searchStore.clearSearch()
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    searchStore.navigateDown()
  }
  else if (event.key === 'ArrowUp') {
    event.preventDefault()
    searchStore.navigateUp()
  }
  else if (event.key === 'Enter') {
    event.preventDefault()

    const selected = searchStore.getSelectedResult()
    if (selected?.suggestion.href)
      handleSelectResult(selected.suggestion)
  }
  else if (event.key === 'Escape') {
    searchStore.clearSearch()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <div
    v-if="searchStore.hasResults"
    class="search-results-container"
  >
    <!-- Results by Category -->
    <template
      v-for="group in searchStore.groupedResults"
      :key="group.category"
    >
      <div class="result-category">
        <div class="category-header">
          <VIcon size="small">
            {{ categoryIcons[group.category] }}
          </VIcon>
          <span class="category-label">{{
            categoryLabels[group.category]
          }}</span>
          <span class="result-count">{{ group.items.length }}</span>
        </div>

        <div class="category-items">
          <div
            v-for="result in group.items"
            :key="`${group.category}-${result.suggestion.id}`"
            class="search-result-item"
            :class="[
              {
                'is-selected':
                  searchStore.selectedIndex
                  === searchStore.filteredResults.findIndex(
                    (r) => r.suggestion.id === result.suggestion.id,
                  ),
              },
            ]"
            @click="handleSelectResult(result.suggestion)"
            @mouseenter="
              searchStore.selectResult(
                searchStore.filteredResults.findIndex(
                  (r) => r.suggestion.id === result.suggestion.id,
                ),
              )
            "
          >
            <VIcon
              v-if="result.suggestion.icon"
              size="small"
              class="result-icon"
            >
              {{ result.suggestion.icon }}
            </VIcon>

            <div class="result-content">
              <div class="result-title">
                {{ result.suggestion.title }}
              </div>
              <div class="result-description">
                {{ result.suggestion.description }}
              </div>
            </div>

            <div class="result-relevance">
              <VChip
                size="small"
                label
              >
                {{ Math.round(result.relevance) }}
              </VChip>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Loading State -->
    <div
      v-if="searchStore.isLoading"
      class="search-loading"
    >
      <VProgressCircular
        indeterminate
        size="24"
      />
      <span>Searching...</span>
    </div>

    <!-- No Results -->
    <div
      v-else-if="!searchStore.hasResults && searchStore.query"
      class="no-results"
    >
      <VIcon
        size="large"
        class="no-results-icon"
      >
        bx-search-alt-2
      </VIcon>
      <p>No results found for "{{ searchStore.query }}"</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.search-results-container {
  position: absolute;
  z-index: 1000;
  border: 1px solid var(--v-border-color);
  border-radius: 8px;
  background: var(--v-surface-color);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 12%);
  inset-block-start: 100%;
  inset-inline: 0;
  max-block-size: 500px;
  overflow-y: auto;

  .result-category {
    padding-block: 12px;
    padding-inline: 0;

    &:not(:last-child) {
      border-block-end: 1px solid var(--v-divider-color);
    }

    .category-header {
      display: flex;
      align-items: center;
      color: var(--v-text-disabled-color);
      font-size: 0.85rem;
      font-weight: 600;
      gap: 8px;
      opacity: 0.7;
      padding-block: 8px;
      padding-inline: 16px;
      text-transform: uppercase;

      .result-count {
        border-radius: 4px;
        background: var(--v-primary-color);
        color: white;
        font-weight: 500;
        margin-inline-start: auto;
        padding-block: 2px;
        padding-inline: 6px;
      }
    }

    .category-items {
      display: flex;
      flex-direction: column;
    }
  }

  .search-result-item {
    display: flex;
    align-items: center;
    cursor: pointer;
    gap: 12px;
    padding-block: 12px;
    padding-inline: 16px;
    transition: background-color 0.2s;

    &:hover {
      background-color: var(--v-hover-color);
    }

    &.is-selected {
      background-color: var(--v-primary-opacity-color);
    }

    .result-icon {
      flex-shrink: 0;
      color: var(--v-primary-color);
    }

    .result-content {
      flex: 1;
      min-inline-size: 0;

      .result-title {
        overflow: hidden;
        font-size: 0.875rem;
        font-weight: 500;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .result-description {
        overflow: hidden;
        color: var(--v-text-disabled-color);
        font-size: 0.85rem;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .result-relevance {
      flex-shrink: 0;
    }
  }

  .search-loading,
  .no-results {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--v-text-disabled-color);
    font-size: 0.875rem;
    gap: 12px;
    padding-block: 32px;
    padding-inline: 16px;
    text-align: center;
  }

  .no-results-icon {
    opacity: 0.3;
  }
}
</style>
