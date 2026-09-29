<script setup lang="ts">
interface Props {
  title: string
  color?: string
  icon: string
  stats: string
  change: number
  subtitle: string
}

const props = withDefaults(defineProps<Props>(), {
  color: 'primary',
})

const isPositive = controlledComputed(() => props.change, () => Math.sign(props.change) === 1)
</script>

<template>
  <VCard>
    <VCardText class="d-flex align-center">
      <h6 class="text-base font-weight-regular">
        {{ props.title }}
      </h6>

      <VSpacer />

      <!-- more btn -->
      <VBtn
        variant="text"
        append-icon="bx-chevron-down"
        color="disabled"
        size="small"
      >
        Today
        <VMenu activator="parent">
          <VList>
            <VListItem
              v-for="(item, index) in ['Yesterday', 'Last Week', 'Last Month']"
              :key="index"
              :value="index"
            >
              <VListItemTitle>{{ item }}</VListItemTitle>
            </VListItem>
          </VList>
        </VMenu>
      </VBtn>
    </VCardText>

    <VCardText>
      <div
        v-if="props.change"
        class="d-flex align-center flex-column"
      >
        <VAvatar
          v-if="props.icon"
          size="46"
          variant="tonal"
          :color="props.color"
          class="mb-3"
          :style="`box-shadow: rgb(var(--v-theme-${props.color}), 0.06) 0 0 0 4px;`"
        >
          <VIcon
            :icon="props.icon"
            size="26"
          />
        </VAvatar>

        <h4 class="text-h4">
          {{ props.stats }}
        </h4>
        <p class="text-base mb-2">
          {{ props.subtitle }}
        </p>
        <div class="d-flex align-center">
          <p
            class="text-base mb-0"
            :class="isPositive ? 'text-success' : 'text-error'"
          >
            {{ Math.abs(props.change) }}%
          </p>
          <VIcon
            size="24"
            :class="isPositive ? 'text-success' : 'text-error'"
            :icon="isPositive ? 'bx-chevron-up' : 'bx-chevron-down'"
          />
        </div>
      </div>
    </VCardText>
  </VCard>
</template>
