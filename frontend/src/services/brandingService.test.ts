import { afterEach, describe, expect, it } from 'vitest'
import { BRANDING_STORAGE_KEY, brandingService } from './brandingService'

describe('brandingService', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('loads defaults when nothing is stored', () => {
    const settings = brandingService.load()

    expect(settings).toEqual({
      logo: null,
      brandName: 'DoctorIA',
      showBrandName: true,
      logoMode: 'auto',
      logoAlt: 'DoctorIA',
      logoLight: null,
      logoDark: null,
    })
  })

  it('persists and loads saved settings', () => {
    brandingService.save({
      ...brandingService.defaults,
      logo: 'data:image/webp;base64,abc',
      brandName: 'Coca-Cola',
      showBrandName: false,
      logoMode: 'dark',
    })

    const loaded = brandingService.load()

    expect(loaded.logo).toBe('data:image/webp;base64,abc')
    expect(loaded.brandName).toBe('Coca-Cola')
    expect(loaded.showBrandName).toBe(false)
    expect(loaded.logoMode).toBe('dark')
  })

  it('stores a single localStorage key', () => {
    brandingService.save({ ...brandingService.defaults, brandName: 'Nike' })

    const keys = Object.keys(window.localStorage)

    expect(keys).toEqual([BRANDING_STORAGE_KEY])
  })

  it('falls back to defaults on corrupted JSON', () => {
    window.localStorage.setItem(BRANDING_STORAGE_KEY, '{invalid json')

    expect(brandingService.load()).toEqual(brandingService.defaults)
  })

  it('normalizes invalid fields', () => {
    window.localStorage.setItem(
      BRANDING_STORAGE_KEY,
      JSON.stringify({
        brandName: '   ',
        logoMode: 'neon',
        showBrandName: 'yes',
        logo: 42,
      }),
    )

    const loaded = brandingService.load()

    expect(loaded.brandName).toBe('DoctorIA')
    expect(loaded.logoMode).toBe('auto')
    expect(loaded.showBrandName).toBe(true)
    expect(loaded.logo).toBeNull()
  })

  it('clears stored settings', () => {
    brandingService.save({ ...brandingService.defaults, brandName: 'Nike' })
    brandingService.clear()

    expect(window.localStorage.getItem(BRANDING_STORAGE_KEY)).toBeNull()
    expect(brandingService.load()).toEqual(brandingService.defaults)
  })
})
