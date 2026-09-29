<script setup lang="ts">
import { useAiChatMessagesStore } from '@/stores/useAiChatMessagesStore'
import { AI_MODELS, type AiModel } from 'contracts/ai/models/types'
import { computed, ref } from 'vue'

const store = useAiChatMessagesStore()

const isMenuOpen = ref(false)


const providerGroups = computed<{ provider: string; models: AiModel[] }[]>(() => {
  const groups: { provider: string; models: AiModel[] }[] = []

  for (const model of AI_MODELS) {
    const group = groups.find(g => g.provider === model.provider)

    if (group)
      group.models.push(model)
    else
      groups.push({ provider: model.provider, models: [model] })
  }

  return groups
})

const selectedModel = computed(() => AI_MODELS.find(m => m.id === store.selectedModel) ?? AI_MODELS[0])

const tierColor = (tier: AiModel['tier']) => {
  switch (tier) {
    case 'premium': return 'amber'
    case 'standard': return 'info'
    case 'basic': return 'success'
    default: return 'default'
  }
}

const tierIcon = (tier: AiModel['tier']) => {
  switch (tier) {
    case 'premium': return 'bx-diamond'
    case 'standard': return 'bx-star'
    case 'basic': return 'bx-circle'
    default: return 'bx-help-circle'
  }
}

const selectModel = (modelId: string) => {
  store.setSelectedModel(modelId)
  isMenuOpen.value = false
}
</script>

<template>
  <VMenu v-model="isMenuOpen" location="bottom end" offset="8" content-class="model-selector-menu">
    <template #activator="{ props: menuProps }">
      <VBtn v-bind="menuProps" class="model-selector__trigger" title="Select model" variant="text" size="small"
        density="compact" rounded="pill">
        <VIcon :icon="tierIcon(selectedModel?.tier ?? 'standard')" size="14" class="me-1" />
        <span class="model-selector__name">
          {{ selectedModel?.name ?? '—' }}
        </span>
        <VIcon icon="bx-chevron-down" size="14" class="ms-1 text-disabled" />
      </VBtn>
    </template>

    <VCard class="model-selector__card">
      <VCardText class="pb-0 pt-2">
        <div class="text-body-2 font-weight-medium mb-1">
          {{ "Select model" }}
        </div>
      </VCardText>

      <VList v-for="group in providerGroups" :key="group.provider" class="model-selector__group" density="compact">
        <VListSubheader class="text-uppercase text-caption">
          {{ group.provider }}
        </VListSubheader>

        <VListItem v-for="model in group.models" :key="model.id" class="cursor-pointer"
          :active="model.id === store.selectedModel" @click="selectModel(model.id)">
          <template #prepend>
            <VIcon :icon="tierIcon(model.tier)" :color="tierColor(model.tier)" size="18" />
          </template>

          <VListItemTitle class="font-weight-medium model-selector__model-name">
            {{ model.name }}
          </VListItemTitle>
          <VListItemSubtitle class="model-selector__model-description">
            {{ model.description }}
          </VListItemSubtitle>
        </VListItem>
      </VList>
    </VCard>
  </VMenu>
</template>

<style lang="scss" scoped>
.model-selector {
  &__trigger {
    .v-btn__content {
      max-inline-size: 200px;
    }
  }

  &__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.75rem;
  }
}
</style>

<!-- ℹ️ Estilos globais: o VMenu é teleportado para o body (scoped não alcança). -->
<style lang="scss">
.model-selector-menu {
  min-inline-size: 300px;

  .model-selector__card {
    overflow: hidden;
    max-block-size: 70vh;
    overflow-y: auto;
  }

  .model-selector__model-name {
    font-size: 0.75rem;
  }

  .model-selector__model-description {
    font-size: 0.6875rem;
  }

  .v-list-item--active {
    .v-list-item__prepend {
      color: rgb(var(--v-theme-primary));
    }
  }
}
</style>
