<script setup lang="ts">
import SearchResults from '@/components/SearchResults.vue'
import { useAccessControlStore } from '@/stores/useAccessControlStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSearchStore } from '@/stores/useSearchStore'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'


const router = useRouter()
const searchStore = useSearchStore()
const auth = useAuthStore()


const accessControlStore = useAccessControlStore()
accessControlStore.ensureLoaded()


const isTenantActive = computed(() => !!auth.currentTenant)


const searchInput = ref<HTMLInputElement | null>(null)
const showResults = ref(false)
const searchFocused = ref(false)


const quickActions = computed(() =>
  accessControlStore.quickActionFeatures
    .filter(feature => accessControlStore.can(feature.key))
    .map((feature, index) => ({
      id: index + 1,
      label: feature.label,
      icon: feature.icon ?? 'bx-circle',
      action: () => {
        if (feature.href)
          router.push(feature.href)
      },
    })),
)


const hasSearchResults = computed(
  () => searchStore.hasResults && showResults.value,
)

const hasQuickActions = computed(() => !searchStore.query && showResults.value)


const handleSearch = async (query: string) => {
  searchStore.setQuery(query)
  if (query.trim()) {
    showResults.value = true
    await searchStore.search(query)
  }
  else {
    searchStore.clearSearch()
    showResults.value = false
  }
}

const handleKeyDown = (event: KeyboardEvent) => {

  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
    if (isTenantActive.value) {
      event.preventDefault()
      searchInput.value?.focus()
      showResults.value = true
    }
  }


  else if (event.key === 'Escape') {
    closeSearch()
  }
}

const closeSearch = () => {
  showResults.value = false
  searchStore.clearSearch()
  searchInput.value?.blur()
}

const handleInputFocus = () => {
  searchFocused.value = true
  if (searchStore.query || !showResults.value)
    showResults.value = true
}

const handleInputBlur = () => {
  searchFocused.value = false


  setTimeout(() => {
    if (!searchFocused.value)
      showResults.value = false
  }, 200)
}

const handleQuickAction = (action: () => void) => {
  action()
  closeSearch()
}


const unsubscribeRoute = router.afterEach(() => {
  if (showResults.value && !searchFocused.value)
    closeSearch()
})


onMounted(() => {
  if (isTenantActive.value)
    document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  unsubscribeRoute()
})
</script>

<template>
  <div
    v-if="isTenantActive"
    class="app-search-wrapper"
    @click.stop
  >
    <!-- Search Input Container -->
    <div class="search-input-container">
      <VTextField
        ref="searchInput"
        v-model="searchStore.query"
        placeholder="Search... (Ctrl+K)"
        prepend-inner-icon="bx-search"
        variant="outlined"
        density="compact"
        single-line
        hide-details
        class="app-search-input"
        @input="handleSearch(searchStore.query)"
        @focus="handleInputFocus"
        @blur="handleInputBlur"
      />
    </div>

    <!-- Search Results Dropdown -->
    <Teleport to="body">
      <div
        v-if="showResults"
        class="search-results-dropdown"
      >
        <!-- Search Results -->
        <template v-if="hasSearchResults">
          <SearchResults />
        </template>

        <!-- Quick Actions (when no search query) -->
        <template v-else-if="hasQuickActions">
          <div class="quick-actions-container">
            <div class="quick-actions-header">
              <span class="quick-actions-label">Quick Actions</span>
            </div>

            <div class="quick-actions-list">
              <div
                v-for="action in quickActions"
                :key="action.id"
                class="quick-action-item"
                @click="handleQuickAction(action.action)"
              >
                <VIcon
                  :icon="action.icon"
                  size="small"
                />
                <span>{{ action.label }}</span>
                <VIcon
                  icon="bx-chevron-right"
                  size="small"
                  class="action-chevron"
                />
              </div>
            </div>
          </div>
        </template>

        <!-- Loading State -->
        <template v-else-if="searchStore.isLoading && searchStore.query">
          <div class="search-loading">
            <VProgressCircular
              indeterminate
              size="24"
            />
            <span>Searching "{{ searchStore.query }}"...</span>
          </div>
        </template>

        <!-- Empty State -->
        <template v-else-if="searchStore.query && !searchStore.hasResults">
          <div class="search-empty">
            <VIcon size="large">
              bx-search-alt-2
            </VIcon>
            <p>No results found for "{{ searchStore.query }}"</p>
            <p class="search-hint">
              Try different keywords or browse quick actions above
            </p>
          </div>
        </template>
      </div>
    </Teleport>
  </div>

  <div
    v-else
    class="app-search-wrapper"
  >
    <VBtn
      variant="tonal"
      size="small"
      prepend-icon="bx-grid-alt"
      @click="router.push('/tenants')"
    >
      Choose workspace
    </VBtn>
  </div>
</template>

<style scoped lang="scss">
.app-search-wrapper {
  position: relative;
  inline-size: 100%;

  .search-input-container {
    position: relative;

    .app-search-input {
      :deep(.v-field__input) {
        font-size: 0.875rem;
      }
    }
  }

  .search-results-dropdown {
    position: fixed;
    z-index: 1100;
    border: 1px solid var(--v-border-color);
    border-radius: 8px;
    background: var(--v-surface-color);
    box-shadow: 0 15px 50px rgba(0, 0, 0, 15%);
    inline-size: 90%;
    inset-block-start: 70px;
    inset-inline-start: 50%;
    max-block-size: 500px;
    max-inline-size: 600px;
    overflow-y: auto;
    transform: translateX(-50%);

    .quick-actions-container {
      padding-block: 12px;
      padding-inline: 0;

      .quick-actions-header {
        display: flex;
        align-items: center;
        color: var(--v-text-disabled-color);
        font-size: 0.85rem;
        font-weight: 600;
        opacity: 0.7;
        padding-block: 8px;
        padding-inline: 16px;
        text-transform: uppercase;

        .quick-actions-label {
          flex: 1;
        }
      }

      .quick-actions-list {
        display: flex;
        flex-direction: column;

        .quick-action-item {
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

          .action-chevron {
            margin-inline-start: auto;
            opacity: 0.5;
          }
        }
      }
    }

    .search-loading,
    .search-empty {
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

      .search-hint {
        font-size: 0.85rem;
        opacity: 0.7;
      }
    }
  }
}
</style>
