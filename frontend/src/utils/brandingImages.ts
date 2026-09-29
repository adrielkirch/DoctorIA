


export const LOGO_MAX_SIZE_BYTES = 1024 * 1024 // 1 MB
export const LOGO_MAX_DIMENSION = 512
export const LOGO_WEBP_QUALITY = 0.85

export const isSvgFile = (file: File): boolean =>
  file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')

export const isSupportedLogoFile = (file: File): boolean =>
  file.type === 'image/png' || isSvgFile(file)

export const validateLogoFile = (file: File | null | undefined): string | null => {
  if (!file)
    return 'Select a PNG or SVG file.'

  if (!isSupportedLogoFile(file))
    return 'Only PNG or SVG files are allowed.'

  if (file.size > LOGO_MAX_SIZE_BYTES)
    return 'Maximum size is 1 MB.'

  return null
}

export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })

const compressRasterToWebP = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const scale = Math.min(1, LOGO_MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight))
      const width = Math.max(1, Math.round(image.naturalWidth * scale))
      const height = Math.max(1, Math.round(image.naturalHeight * scale))

      const canvas = document.createElement('canvas')

      canvas.width = width
      canvas.height = height

      const context = canvas.getContext('2d')
      if (!context) {

        fileToDataUrl(file).then(resolve).catch(reject)

        return
      }

      context.drawImage(image, 0, 0, width, height)
      resolve(canvas.toDataURL('image/webp', LOGO_WEBP_QUALITY))
    }

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to process the image.'))
    }

    image.src = objectUrl
  })

/**
 * Processes an uploaded logo for storage:
 * - SVG → kept as-is (data URL).
 * - PNG → resized to a reasonable maximum dimension and compressed to WebP
 *   (data URL), preserving transparency. Never store giant images directly.
 */
export const processLogoFile = async (file: File): Promise<string> => {
  if (isSvgFile(file))
    return fileToDataUrl(file)

  return compressRasterToWebP(file)
}

const monochromeCache = new Map<string, boolean>()

/**
 * Detects whether an image is monochrome (grayscale). Used by the `auto`
 * logo mode to decide if a CSS inversion is safe in dark mode — colored
 * logos (e.g. Coca-Cola, Google, Nike) are never inverted automatically.
 */
export const isMonochromeImage = (src: string): Promise<boolean> => {
  const cached = monochromeCache.get(src)
  if (cached !== undefined)
    return Promise.resolve(cached)

  return new Promise(resolve => {
    const image = new Image()

    image.onload = () => {
      try {
        const size = 64
        const canvas = document.createElement('canvas')

        canvas.width = size
        canvas.height = size

        const context = canvas.getContext('2d')
        if (!context) {
          monochromeCache.set(src, false)
          resolve(false)

          return
        }

        context.drawImage(image, 0, 0, size, size)

        const { data } = context.getImageData(0, 0, size, size)

        let isMonochrome = true
        for (let index = 0; index < data.length; index += 4) {
          const alpha = data[index + 3]
          if (alpha === 0)
            continue

          const red = data[index]
          const green = data[index + 1]
          const blue = data[index + 2]

          if (Math.abs(red - green) > 24 || Math.abs(green - blue) > 24 || Math.abs(red - blue) > 24) {
            isMonochrome = false
            break
          }
        }

        monochromeCache.set(src, isMonochrome)
        resolve(isMonochrome)
      }
      catch {
        monochromeCache.set(src, false)
        resolve(false)
      }
    }

    image.onerror = () => {
      monochromeCache.set(src, false)
      resolve(false)
    }

    image.src = src
  })
}
