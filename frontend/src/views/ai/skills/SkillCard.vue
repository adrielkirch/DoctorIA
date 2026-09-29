<script setup lang="ts">
import type { Skill } from 'contracts/ai/skills/types';

defineProps<{
  skill: Skill
}>()

defineEmits<{
  click: [skill: Skill]
}>()
</script>

<template>
  <VCard
    class="skill-card cursor-pointer"
    @click="$emit('click', skill)"
  >
    <!-- Thumbnail area with gradient background -->
    <div
      class="skill-card__thumbnail d-flex align-center justify-center pa-6"
      :style="{
        background: `linear-gradient(135deg, ${skill.color}dd 0%, ${skill.color}88 100%)`,
      }"
    >
      <VIcon
        :icon="skill.icon"
        size="48"
        color="white"
        class="skill-card__icon"
      />

      <!-- Type badge top-right -->
      <VChip
        class="skill-card__badge"
        :color="skill.type === 'DEFAULT' ? 'warning' : 'success'"
        size="x-small"
        label
        variant="flat"
      >
        <VIcon
          :icon="skill.type === 'DEFAULT' ? 'bx-lock' : 'bx-code-alt'"
          size="10"
          class="me-1"
        />
        {{ skill.type === 'DEFAULT' ? "Default" : "Custom" }}
      </VChip>
    </div>

    <!-- Card body -->
    <VCardText class="pa-3">
      <div class="skill-card__name text-body-1 font-weight-semibold mb-1 text-truncate">
        {{ skill.name }}
      </div>

      <div class="d-flex align-center justify-space-between mt-2">
        <span class="text-caption text-medium-emphasis">{{
          skill.category
        }}</span>

        <VChip
          size="x-small"
          variant="outlined"
          class="skill-card__command font-monospace"
        >
          {{ skill.command }}
        </VChip>
      </div>
    </VCardText>
  </VCard>
</template>

<style scoped>
.skill-card__thumbnail {
  position: relative;
  block-size: 140px;
}

.skill-card__badge {
  position: absolute;
  inset-block-start: 8px;
  inset-inline-end: 8px;
}

.skill-card__name {
  line-height: 1.3;
}

.skill-card__command {
  font-family: "Courier New", monospace;
  font-size: 0.7rem;
}
</style>
