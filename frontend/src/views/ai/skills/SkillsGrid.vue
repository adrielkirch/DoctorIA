<script setup lang="ts">
import type { Skill } from 'contracts/ai/skills/types';
import SkillCard from './SkillCard.vue';

defineProps<{
  skills: Skill[]
}>()

defineEmits<{
  skillClick: [skill: Skill]
}>()
</script>

<template>
  <div>
    <!-- Grid -->
    <VRow v-if="skills.length > 0">
      <VCol
        v-for="skill in skills"
        :key="skill.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
      >
        <SkillCard
          :skill="skill"
          @click="$emit('skillClick', skill)"
        />
      </VCol>
    </VRow>

    <!-- Empty state -->
    <div
      v-else
      class="d-flex flex-column align-center justify-center py-16 text-medium-emphasis"
    >
      <VIcon
        icon="bx-brain"
        size="64"
        class="mb-4 opacity-40"
      />
      <p class="text-body-1">
        {{ "No skills found" }}
      </p>
      <p class="text-caption">
        {{ "Try adjusting your search or filter" }}
      </p>
    </div>
  </div>
</template>
