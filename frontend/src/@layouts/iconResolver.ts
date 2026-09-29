import type { NavIconProps } from '@layouts/types'

const FALLBACK_ICON_TOKEN = 'bx-circle'

const toIconProps = (icon: NavIconProps | string | undefined): NavIconProps => {
  if (!icon)
    return {}

  if (typeof icon === 'string')
    return { icon }

  return icon
}

const isBoxiconToken = (token: unknown): token is string =>
  typeof token === 'string' && token.startsWith('bx-')

export const resolveNavIconProps = (
  icon: NavIconProps | string | undefined,
  fallback: NavIconProps = {},
): NavIconProps => {
  const source = toIconProps(icon)
  const fallbackToken = isBoxiconToken(fallback.icon) ? fallback.icon : FALLBACK_ICON_TOKEN
  const iconToken = isBoxiconToken(source.icon) ? source.icon : fallbackToken

  return {
    ...fallback,
    ...source,
    icon: iconToken,
  }
}
