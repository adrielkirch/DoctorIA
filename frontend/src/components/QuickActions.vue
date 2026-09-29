<script setup lang="ts">
interface QuickActionItem {
  id: string
  title: string
  description: string
  icon: string
  to: string
}

interface Emits {
  (event: 'navigate', to: string): void
}

const emit = defineEmits<Emits>()

const actions: QuickActionItem[] = [
  {
    id: 'view-users',
    title: 'View Users',
    description: 'Open team member management',
    icon: 'bx-user-circle',
    to: '/users',
  },
]

function onNavigate(to: string): void {
  emit('navigate', to)
}
</script>

<template>
  <VCard data-testid="quick-actions">
    <VCardTitle>Quick Actions</VCardTitle>

    <VCardText>
      <VRow>
        <VCol
          v-for="action in actions"
          :key="action.id"
          cols="12"
          sm="6"
        >
          <VCard
            :data-testid="`quick-action-${action.id}`"
            class="h-100"
            hover
            @click="onNavigate(action.to)"
          >
            <VCardText class="d-flex align-start ga-3">
              <VAvatar
                color="primary"
                size="34"
                variant="tonal"
              >
                <VIcon :icon="action.icon" />
              </VAvatar>
              <div>
                <p class="text-body-2 font-weight-medium mb-1">
                  {{ action.title }}
                </p>
                <p class="text-caption text-medium-emphasis mb-0">
                  {{ action.description }}
                </p>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </VCardText>
  </VCard>
</template>
