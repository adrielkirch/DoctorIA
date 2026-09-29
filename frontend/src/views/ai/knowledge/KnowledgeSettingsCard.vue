<script setup lang="ts">
defineProps<{
  title: string
  hint?: string
}>()






</script>

<template>
  <VCard variant="outlined">
    <div class="px-5 pt-4 pb-3">
      <p class="text-subtitle-2 font-weight-medium mb-0">
        {{ title }}
      </p>

      <p
        v-if="hint"
        class="text-caption text-medium-emphasis mb-0 mt-1"
      >
        {{ hint }}
      </p>
    </div>

    <VDivider />

    <VCardText class="pa-5 d-flex flex-column gap-4">
      <slot />
    </VCardText>
  </VCard>
</template>
