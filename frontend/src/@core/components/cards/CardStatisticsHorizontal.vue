<script setup lang="ts">
interface Props {
  title: string
  subtitle: string
  color?: string
  icon: string
  stats: string
  change: number
}

const props = withDefaults(defineProps<Props>(), {
  color: 'primary',
})

const isPositive = controlledComputed(() => props.change, () => Math.sign(props.change) === 1)
</script>

<template>
  <VCard>
    <VCardText class="d-flex justify-space-between align-start">
      <div class="d-flex flex-column gap-y-1">
        <div class="text-high-emphasis">
          {{ props.title }}
        </div>
        <div class="d-flex align-center flex-wrap gap-2">
          <h4 class="text-h4">
            {{ props.stats }}
          </h4>
          <div
            v-if="props.change"
            :class="`${isPositive ? 'text-success' : 'text-error'}`"
            class="text-base"
          >
            ({{ (isPositive ? '+' : '-') + Math.abs(props.change) }}%)
          </div>
        </div>
        <span class="text-base">{{ props.subtitle }}</span>
      </div>

      <VAvatar
        size="40"
        rounded
        :color="props.color"
        variant="tonal"
      >
        <VIcon
          :icon="props.icon"
          size="24"
        />
      </VAvatar>
    </VCardText>
  </VCard>
</template>
