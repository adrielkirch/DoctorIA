<script setup lang="ts">
import { useSnackbar } from '@/composables/useSnackbar'
import { copyToClipboard } from '@/utils/shareUtils'
import { computed, ref } from 'vue'

interface SocialPlatform {
  id: string
  name: string
  icon: string
  color: string
  shareUrl: (text: string, url?: string) => string
  isAvailable: boolean
}

const props = defineProps<{
  chatId: string
  chatTitle: string
  messageContent?: string // Specific message to share
  shareUrl?: string // Pre-generated share URL
}>()

const emit = defineEmits<{
  shared: [platform: string, url: string]
}>()

const snackbar = useSnackbar()

const isOpen = ref(false)
const isGeneratingUrl = ref(false)
const generatedShareUrl = ref(props.shareUrl || '')


const platforms = ref<SocialPlatform[]>([
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: 'bxl-whatsapp',
    color: '#25D366',
    shareUrl: (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`,
    isAvailable: true
  },
  {
    id: 'instagram',
    name: 'Instagram',
    icon: 'bxl-instagram',
    color: '#E4405F',
    shareUrl: (text: string) => `https://www.instagram.com/`, // Instagram doesn't support direct text sharing
    isAvailable: false // Stories/DM require different approach
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: 'bxl-telegram',
    color: '#0088cc',
    shareUrl: (text: string) => `https://t.me/share/url?url=${encodeURIComponent(text)}`,
    isAvailable: true
  },
  {
    id: 'twitter',
    name: 'Twitter',
    icon: 'bxl-twitter',
    color: '#1DA1F2',
    shareUrl: (text: string, url?: string) => 
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}${url ? `&url=${encodeURIComponent(url)}` : ''}`,
    isAvailable: true
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'bxl-linkedin',
    color: '#0077b5',
    shareUrl: (text: string, url?: string) => 
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url || window.location.href)}`,
    isAvailable: true
  },
  {
    id: 'slack',
    name: 'Slack',
    icon: 'bxl-slack',
    color: '#4A154B',
    shareUrl: (text: string, url?: string) => 
      `slack://channel?team=&id=&message=${encodeURIComponent(text + (url ? ' ' + url : ''))}`,
    isAvailable: true
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    icon: 'bx-chat',
    color: '#6264A7',
    shareUrl: (text: string, url?: string) => 
      `https://teams.microsoft.com/share?msgText=${encodeURIComponent(text + (url ? ' ' + url : ''))}`,
    isAvailable: true
  }
])

const availablePlatforms = computed(() => 
  platforms.value.filter(p => p.isAvailable)
)

const shareText = computed(() => {
  if (props.messageContent) {
    return `${"AI Chat message from"} "${props.chatTitle}": ${props.messageContent}`
  }
  return `${"Check out this AI conversation"} "${props.chatTitle}"`
})

const handleGenerateShareUrl = async () => {
  if (generatedShareUrl.value) return

  isGeneratingUrl.value = true
  
  try {

    await new Promise(resolve => setTimeout(resolve, 1000))
    generatedShareUrl.value = `${window.location.origin}/c/${props.chatId}?shared=true`
  }
  catch (error) {
    snackbar.error("Could not generate share URL")
  }
  finally {
    isGeneratingUrl.value = false
  }
}

const handlePlatformShare = (platform: SocialPlatform) => {
  const shareUrl = platform.shareUrl(shareText.value, generatedShareUrl.value)
  

  if (platform.id === 'instagram') {

    copyToClipboard(shareText.value)
    snackbar.info("Text copied! Paste it in your Instagram story or message.")
    window.open('https://www.instagram.com/', '_blank')
  }
  else if (platform.id === 'slack' && !shareUrl.startsWith('http')) {

    const webUrl = `https://slack.com/intl/en-br/`
    copyToClipboard(shareText.value)
    snackbar.info("Text copied! Paste it in your Slack message.")
    window.open(webUrl, '_blank')
  }
  else {

    window.open(shareUrl, '_blank', 'width=600,height=400')
  }

  emit('shared', platform.id, shareUrl)
  snackbar.success(("Shared to " + String(platform.name) + " successfully!"))
}

const handleCopyLink = async () => {
  if (!generatedShareUrl.value) {
    await handleGenerateShareUrl()
  }

  const success = await copyToClipboard(generatedShareUrl.value)
  if (success) {
    snackbar.success("Share link copied to clipboard!")
  } else {
    snackbar.error("Could not copy link")
  }
}

const handleOpen = () => {
  isOpen.value = true
  void handleGenerateShareUrl()
}
</script>

<template>
  <div class="ai-chat-social-share">
    <!-- Trigger Button -->
    <VBtn
      variant="text"
      size="small"
      @click="handleOpen"
    >
      <VIcon icon="bx-share" />
      {{ "Share" }}
    </VBtn>

    <!-- Share Dialog -->
    <VDialog
      v-model="isOpen"
      max-width="500"
    >
      <VCard>
        <VCardTitle>
          <div class="d-flex align-center gap-2">
            <VIcon icon="bx-share" />
            {{ "Share Conversation" }}
          </div>
        </VCardTitle>

        <VCardText>
          <div class="social-share-content">
            <!-- Preview Text -->
            <div class="share-preview mb-4">
              <h4 class="text-subtitle-2 mb-2">
                {{ "Share Preview" }}
              </h4>
              <VCard variant="tonal" class="pa-3">
                <div class="text-body-2">{{ shareText }}</div>
              </VCard>
            </div>

            <!-- Share URL -->
            <div class="share-url mb-4">
              <h4 class="text-subtitle-2 mb-2">
                {{ "Share Link" }}
              </h4>
              <div class="d-flex align-center gap-2">
                <VTextField
                  :model-value="generatedShareUrl"
                  variant="outlined"
                  density="compact"
                  readonly
                  :loading="isGeneratingUrl"
                  placeholder="Generating share link..."
                />
                <VBtn
                  icon="bx-copy"
                  variant="outlined"
                  size="small"
                  :disabled="!generatedShareUrl"
                  @click="handleCopyLink"
                />
              </div>
            </div>

            <!-- Social Platforms -->
            <div class="social-platforms">
              <h4 class="text-subtitle-2 mb-3">
                {{ "Choose platform" }}
              </h4>
              
              <div class="platform-grid">
                <VCard
                  v-for="platform in availablePlatforms"
                  :key="platform.id"
                  class="platform-card"
                  variant="outlined"
                  @click="handlePlatformShare(platform)"
                >
                  <VCardText class="text-center pa-3">
                    <VIcon
                      :icon="platform.icon"
                      size="24"
                      :style="{ color: platform.color }"
                      class="mb-2"
                    />
                    <div class="platform-name">{{ platform.name }}</div>
                  </VCardText>
                </VCard>
              </div>
            </div>

            <!-- Special Instructions for Instagram -->
            <VAlert
              v-if="platforms.find(p => p.id === 'instagram')"
              type="info"
              variant="tonal"
              class="mt-4"
            >
              <div class="text-caption">
                <strong>{{ "Instagram" }}:</strong>
                {{ "Text copied! Paste it in your Instagram story or message." }}
              </div>
            </VAlert>
          </div>
        </VCardText>

        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="isOpen = false"
          >
            {{ "Close" }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style lang="scss" scoped>
.social-share-content {
  .share-preview {
    .text-body-2 {
      line-height: 1.4;
    }
  }

  .platform-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 0.75rem;
  }

  .platform-card {
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .platform-name {
      font-size: 0.75rem;
      font-weight: 500;
      color: rgb(var(--v-theme-on-surface));
    }
  }
}
</style>
