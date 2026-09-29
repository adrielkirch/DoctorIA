<script setup lang="ts">
import { computed, ref } from 'vue';

const emit = defineEmits<{
  close: []
  selectCapability: [type: string]
}>()

const searchQuery = ref('')




const capabilities = computed(() => [
  {
    id: 'knowledge',
    icon: 'bx-library',
    title: "Knowledge",
    description: "Workspace knowledge base",
  },
  {
    id: 'mcp',
    icon: 'bx-plug',
    title: "MCP Integrations",
    description: "Connected MCP tools and models",
  },
  {
    id: 'gateway',
    icon: 'bx-network-chart',
    title: "API Gateway",
    description: "Published routes and APIs",
  },
])

const filteredCapabilities = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()

  if (!q)
    return capabilities.value

  return capabilities.value.filter(cap =>
    cap.title.toLowerCase().includes(q)
    || cap.description.toLowerCase().includes(q),
  )
})

const select = (id: string) => {
  emit('selectCapability', id)
}
</script>

<template>
  <section class="capabilities-panel">
    <div class="capabilities-panel__header">
      <h3 class="text-body-1 font-weight-medium mb-0">
        {{ "Available Resources" }}
      </h3>

      <button
        class="capabilities-panel__close"
        type="button"
        aria-label="Close"
        @click="emit('close')"
      >
        <VIcon icon="bx-x" />
      </button>
    </div>

    <VTextField
      v-model="searchQuery"
      density="compact"
      variant="outlined"
      hide-details
      placeholder="Search resources..."
      prepend-inner-icon="bx-search"
    />

    <div class="capabilities-panel__cards">
      <button
        v-for="cap in filteredCapabilities"
        :key="cap.id"
        class="capability-card"
        type="button"
        @click="select(cap.id)"
      >
        <div class="capability-card__icon">
          <VIcon
            :icon="cap.icon"
            size="22"
          />
        </div>

        <div class="capability-card__info">
          <span class="capability-card__title">{{ cap.title }}</span>
          <span class="capability-card__description">{{ cap.description }}</span>
        </div>

        <span class="capability-card__status">
          <VIcon
            icon="bx-check-circle"
            size="14"
          />
          {{ "Connected" }}
        </span>
      </button>

      <div
        v-if="filteredCapabilities.length === 0"
        class="text-medium-emphasis text-center py-6"
      >
        {{ "No resources found." }}
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.capabilities-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-inline-size: 880px;
  margin-inline: auto;
  margin-block-end: 0.75rem;
  padding: 0.875rem 1rem 1rem;
  border: 1px solid rgb(var(--v-border-color));
  border-radius: 0.75rem;
  background-color: rgb(var(--v-theme-surface));

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__close {
    display: flex;
    align-items: center;
    justify-content: center;
    inline-size: 2rem;
    block-size: 2rem;
    border: none;
    border-radius: 0.5rem;
    background: transparent;
    color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
    cursor: pointer;

    &:hover {
      background-color: rgba(var(--v-theme-on-surface), 0.06);
      color: rgb(var(--v-theme-on-surface));
    }
  }

  &__cards {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
}

.capability-card {
  display: flex;
  flex: 1 1 240px;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.75rem;
  border: 1px solid rgb(var(--v-border-color));
  border-radius: 0.625rem;
  background: transparent;
  color: inherit;
  text-align: start;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease;

  &:hover {
    border-color: rgb(var(--v-theme-primary));
    background-color: rgba(var(--v-theme-primary), 0.05);
  }

  &__icon {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    inline-size: 2.5rem;
    block-size: 2.5rem;
    border-radius: 0.625rem;
    background-color: rgba(var(--v-theme-primary), 0.1);
    color: rgb(var(--v-theme-primary));
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-inline-size: 0;
  }

  &__title {
    font-size: 0.875rem;
    font-weight: 600;
  }

  &__description {
    font-size: 0.85rem;
    line-height: 1.4;
    color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  }

  &__status {
    display: inline-flex;
    gap: 0.25rem;
    align-items: center;
    align-self: flex-start;
    margin-inline-start: auto;
    padding: 0.125rem 0.5rem;
    border-radius: 999px;
    background-color: rgba(var(--v-theme-success), 0.12);
    color: rgb(var(--v-theme-success));
    font-size: 0.6875rem;
    font-weight: 500;
    white-space: nowrap;
  }
}
</style>
