import type { BrandingSettings, LogoMode } from '@/@core/types/branding'




export const BRANDING_STORAGE_KEY = 'doctoria.branding'

const LOGO_MODES: LogoMode[] = ['auto', 'original', 'light', 'dark']

export const defaultBranding = (): BrandingSettings => ({
  logo: null,
  brandName: 'DoctorIA',
  showBrandName: true,
  logoMode: 'auto',
  logoAlt: 'DoctorIA',
  logoLight: null,
  logoDark: null,
})

const isLogoMode = (value: unknown): value is LogoMode =>
  typeof value === 'string' && (LOGO_MODES as string[]).includes(value)

const normalize = (value: Partial<BrandingSettings> | null | undefined): BrandingSettings => {
  const defaults = defaultBranding()

  if (!value || typeof value !== 'object')
    return defaults

  return {
    logo: typeof value.logo === 'string' ? value.logo : null,
    brandName:
      typeof value.brandName === 'string' && value.brandName.trim()
        ? value.brandName
        : defaults.brandName,
    showBrandName:
      typeof value.showBrandName === 'boolean' ? value.showBrandName : defaults.showBrandName,
    logoMode: isLogoMode(value.logoMode) ? value.logoMode : defaults.logoMode,
    logoAlt:
      typeof value.logoAlt === 'string' && value.logoAlt.trim() ? value.logoAlt : defaults.logoAlt,
    logoLight: typeof value.logoLight === 'string' ? value.logoLight : null,
    logoDark: typeof value.logoDark === 'string' ? value.logoDark : null,
  }
}

export const brandingService = {
  defaults: defaultBranding(),

  load(): BrandingSettings {
    if (typeof window === 'undefined')
      return defaultBranding()

    try {
      const raw = window.localStorage.getItem(BRANDING_STORAGE_KEY)

      return raw ? normalize(JSON.parse(raw)) : defaultBranding()
    }
    catch {
      return defaultBranding()
    }
  },

  save(settings: BrandingSettings): void {
    if (typeof window === 'undefined')
      return

    window.localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(normalize(settings)))
  },

  clear(): void {
    if (typeof window === 'undefined')
      return

    window.localStorage.removeItem(BRANDING_STORAGE_KEY)
  },
}
