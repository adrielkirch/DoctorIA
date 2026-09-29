import type { BrandingSettings } from '@/@core/types/branding'
import { brandingService } from '@/services/brandingService'
import { useTheme } from 'vuetify'



const state = ref<BrandingSettings>(brandingService.load())

const persist = () => {
  brandingService.save(state.value)
}

/**
 * Single source of truth for the white-label brand identity.
 *
 * ```text
 * Components
 *     ↓
 * useBranding()
 *     ↓
 * brandingService
 *     ↓
 * Mock API / localStorage  (future: Real API)
 * ```
 */
export const useBranding = () => {
  const { global } = useTheme()

  const currentTheme = computed<'light' | 'dark'>(() =>
    global.name.value === 'dark' ? 'dark' : 'light',
  )

  const updateBranding = (partial: Partial<BrandingSettings>) => {
    state.value = { ...state.value, ...partial }
    persist()
  }

  const resetBranding = () => {
    state.value = { ...brandingService.defaults }
    persist()
  }

  return {
    branding: readonly(state),
    currentTheme,
    updateBranding,
    resetBranding,
  }
}
