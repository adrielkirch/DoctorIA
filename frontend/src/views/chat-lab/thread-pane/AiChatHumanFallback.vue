<script setup lang="ts">
import { useSnackbar } from '@/composables/useSnackbar'
import { useAuthStore } from '@/stores/useAuthStore'
import { computed, ref } from 'vue'

interface HumanAgent {
  id: string
  name: string
  avatar?: string
  status: 'online' | 'busy' | 'offline'
  specialties: string[]
  responseTime: string
}

const props = defineProps<{
  chatId: string
  context?: string // Current conversation context
  urgency?: 'low' | 'medium' | 'high'
}>()

const emit = defineEmits<{
  delegate: [agentId: string, message: string]
  cancel: []
}>()

const auth = useAuthStore()
const snackbar = useSnackbar()

const isOpen = ref(false)
const selectedAgent = ref<string | null>(null)
const transferMessage = ref('')
const isTransferring = ref(false)


const availableAgents = ref<HumanAgent[]>([
  {
    id: 'agent-1',
    name: 'Sarah Chen',
    avatar: '👩‍💼',
    status: 'online',
    specialties: ['Technical Support', 'API Integration'],
    responseTime: '~2 min'
  },
  {
    id: 'agent-2', 
    name: 'Marcus Silva',
    avatar: '👨‍💻',
    status: 'online',
    specialties: ['Billing', 'Account Management'],
    responseTime: '~5 min'
  },
  {
    id: 'agent-3',
    name: 'Lisa Wang',
    avatar: '👩‍🔬',
    status: 'busy',
    specialties: ['Data Analysis', 'Integrations'],
    responseTime: '~15 min'
  }
])

const onlineAgents = computed(() => 
  availableAgents.value.filter(agent => agent.status === 'online')
)

const handleTransferToHuman = async () => {
  if (!selectedAgent.value || !transferMessage.value.trim()) {
    snackbar.warning("Please select an agent and enter a message")
    return
  }

  isTransferring.value = true

  try {

    await new Promise(resolve => setTimeout(resolve, 1500)) // Mock delay
    
    emit('delegate', selectedAgent.value, transferMessage.value.trim())
    snackbar.success("Chat transferred to human agent successfully")
    isOpen.value = false
  }
  catch (error) {
    snackbar.error("Failed to transfer chat. Please try again.")
  }
  finally {
    isTransferring.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
  isOpen.value = false
  selectedAgent.value = null
  transferMessage.value = ''
}


const contextMessage = computed(() => 
  props.context 
    ? `${"Previous conversation context"}: ${props.context}`
    : "I need help with this conversation."
)


const handleOpen = () => {
  isOpen.value = true
  if (!transferMessage.value) {
    transferMessage.value = contextMessage.value
  }
}
</script>

<template>
  <div class="ai-chat-human-fallback">
    <!-- Trigger Button -->
    <VBtn
      variant="outlined"
      size="small"
      color="primary"
      @click="handleOpen"
    >
      <VIcon icon="bx-user" start />
      {{ "Talk to Human" }}
    </VBtn>

    <!-- Transfer Dialog -->
    <VDialog
      v-model="isOpen"
      max-width="600"
      persistent
    >
      <VCard>
        <VCardTitle>
          <div class="d-flex align-center gap-2">
            <VIcon icon="bx-transfer" />
            {{ "Transfer to Human Agent" }}
          </div>
        </VCardTitle>

        <VCardText>
          <div class="human-fallback-content">
            <!-- Urgency Indicator -->
            <VAlert
              v-if="urgency === 'high'"
              type="warning"
              variant="tonal" 
              class="mb-4"
            >
              {{ "High priority - Customer needs immediate assistance" }}
            </VAlert>

            <!-- Agent Selection -->
            <div class="mb-4">
              <h3 class="text-subtitle-1 mb-2">
                {{ "Select an available agent" }}
              </h3>
              
              <div class="agent-list">
                <VCard
                  v-for="agent in onlineAgents"
                  :key="agent.id"
                  :class="{
                    'agent-card': true,
                    'agent-card--selected': selectedAgent === agent.id
                  }"
                  variant="outlined"
                  @click="selectedAgent = agent.id"
                >
                  <VCardText class="pa-3">
                    <div class="d-flex align-center gap-3">
                      <div class="agent-avatar">
                        {{ agent.avatar }}
                        <div 
                          class="status-dot"
                          :class="`status-dot--${agent.status}`"
                        />
                      </div>
                      
                      <div class="flex-grow-1">
                        <div class="agent-name">{{ agent.name }}</div>
                        <div class="agent-specialties">
                          {{ agent.specialties.join(', ') }}
                        </div>
                        <div class="agent-response-time">
                          {{ agent.responseTime }}
                        </div>
                      </div>
                      
                      <VIcon
                        v-if="selectedAgent === agent.id"
                        icon="bx-check-circle"
                        color="primary"
                      />
                    </div>
                  </VCardText>
                </VCard>
              </div>
            </div>

            <!-- Transfer Message -->
            <div class="mb-4">
              <h3 class="text-subtitle-1 mb-2">
                {{ "Message to agent" }}
              </h3>
              
              <VTextarea
                v-model="transferMessage"
                placeholder="Describe your issue or question..."
                rows="4"
                variant="outlined"
                :counter="500"
              />
            </div>
          </div>
        </VCardText>

        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="handleCancel"
          >
            {{ "Cancel" }}
          </VBtn>
          <VBtn
            color="primary"
            :loading="isTransferring"
            :disabled="!selectedAgent || !transferMessage.trim()"
            @click="handleTransferToHuman"
          >
            {{ "Transfer Chat" }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style lang="scss" scoped>
.human-fallback-content {
  .agent-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .agent-card {
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      border-color: rgb(var(--v-theme-primary));
    }

    &--selected {
      border-color: rgb(var(--v-theme-primary));
      background: rgb(var(--v-theme-primary), 0.05);
    }
  }

  .agent-avatar {
    position: relative;
    font-size: 1.5rem;

    .status-dot {
      position: absolute;
      inset-block-end: 0;
      inset-inline-end: 0;
      inline-size: 8px;
      block-size: 8px;
      border-radius: 50%;
      border: 1px solid rgb(var(--v-theme-surface));

      &--online { background: #4caf50; }
      &--busy { background: #ff9800; }
      &--offline { background: #9e9e9e; }
    }
  }

  .agent-name {
    font-weight: 600;
    font-size: 0.875rem;
    color: rgb(var(--v-theme-on-surface));
  }

  .agent-specialties {
    font-size: 0.75rem;
    color: rgb(var(--v-theme-on-surface-variant));
    margin-block-start: 0.25rem;
  }

  .agent-response-time {
    font-size: 0.75rem;
    color: rgb(var(--v-theme-primary));
    font-weight: 500;
    margin-block-start: 0.125rem;
  }
}
</style>
