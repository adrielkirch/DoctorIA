export type LogoMode = 'auto' | 'original' | 'light' | 'dark'

export interface BrandingSettings {

  /** Custom uploaded logo (data URL) or `null` to use the default app logo. */
  logo: string | null

  /** Brand/company name rendered next to the logo. */
  brandName: string

  /** Whether the brand name is rendered next to the logo. */
  showBrandName: boolean

  /** How the logo adapts to the current theme. */
  logoMode: LogoMode

  /** Accessible label of the logo. */
  logoAlt: string

  /** Optional variant used on light theme. */
  logoLight?: string | null

  /** Optional variant used on dark theme. */
  logoDark?: string | null
}
