import { describe, expect, it, vi } from 'vitest'
import {
    isMonochromeImage,
    isSupportedLogoFile,
    processLogoFile,
    validateLogoFile,
} from './brandingImages'

const makeFile = (type: string, name: string, size = 100) =>
  new File([new Uint8Array(size)], name, { type })

describe('validateLogoFile', () => {
  it('accepts PNG files', () => {
    expect(validateLogoFile(makeFile('image/png', 'logo.png'))).toBeNull()
  })

  it('accepts SVG files (by mime or by extension)', () => {
    expect(validateLogoFile(makeFile('image/svg+xml', 'logo.svg'))).toBeNull()
    expect(validateLogoFile(makeFile('', 'logo.svg'))).toBeNull()
  })

  it('rejects JPG files', () => {
    const error = validateLogoFile(makeFile('image/jpeg', 'logo.jpg'))

    expect(error).toContain('PNG or SVG')
  })

  it('rejects files over 1 MB', () => {
    const error = validateLogoFile(makeFile('image/png', 'big.png', 1024 * 1024 + 1))

    expect(error).toContain('1 MB')
  })

  it('rejects null/undefined input', () => {
    expect(validateLogoFile(null)).toContain('PNG or SVG')
    expect(validateLogoFile(undefined)).toContain('PNG or SVG')
  })
})

describe('isSupportedLogoFile', () => {
  it('only allows PNG and SVG', () => {
    expect(isSupportedLogoFile(makeFile('image/png', 'a.png'))).toBe(true)
    expect(isSupportedLogoFile(makeFile('image/svg+xml', 'a.svg'))).toBe(true)
    expect(isSupportedLogoFile(makeFile('image/jpeg', 'a.jpg'))).toBe(false)
    expect(isSupportedLogoFile(makeFile('image/webp', 'a.webp'))).toBe(false)
  })
})

describe('processLogoFile', () => {
  it('keeps SVG files as data URLs', async () => {
    const file = new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'logo.svg', {
      type: 'image/svg+xml',
    })

    const result = await processLogoFile(file)

    expect(result).toMatch(/^data:image\/svg\+xml/)
  })
})

describe('isMonochromeImage', () => {
  it('resolves false when the image fails to load', async () => {

    class FakeFailingImage {
      onerror: (() => void) | null = null
      onload: (() => void) | null = null

      private _src = ''

      get src() {
        return this._src
      }

      set src(value: string) {
        this._src = value
        queueMicrotask(() => this.onerror?.())
      }
    }

    vi.stubGlobal('Image', FakeFailingImage)

    try {
      await expect(isMonochromeImage('data:image/png;base64,aaaa')).resolves.toBe(false)
    }
    finally {
      vi.unstubAllGlobals()
    }
  })
})
