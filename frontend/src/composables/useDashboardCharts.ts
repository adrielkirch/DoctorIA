/**
 * Helpers for dashboard charts (`@core/libs/chartjs/components/*`).
 *
 * O template original usava ApexCharts; este projeto padronizou **Chart.js**,
 * que exige cores resolvidas em string (não entende `rgb(var(--v-theme-*))`).
 * Chart.js needs resolved colors and month names in English.
 */
import { computed } from 'vue'
import { useTheme } from 'vuetify'

/** Converte `#rgb`/`#rrggbb` em `rgba(r, g, b, alpha)`. */
export function withAlpha(hex: string, alpha: number): string {
  const normalized = (hex ?? '').replace('#', '').trim()
  const full = normalized.length === 3
    ? normalized.split('').map(char => char + char).join('')
    : normalized

  const red = Number.parseInt(full.slice(0, 2), 16)
  const green = Number.parseInt(full.slice(2, 4), 16)
  const blue = Number.parseInt(full.slice(4, 6), 16)

  if (Number.isNaN(red) || Number.isNaN(green) || Number.isNaN(blue))
    return hex

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

/**
 * Paleta do tema Vuetify ativo em hex + helpers de eixo (ticks/grid) usados
 * pelas `chartOptions` dos cards.
 */
export function useDashboardChartTheme() {
  const vuetifyTheme = useTheme()

  const colors = computed(() => {
    const current = vuetifyTheme.current.value.colors

    return {
      primary: current.primary,
      secondary: current.secondary,
      success: current.success,
      info: current.info,
      warning: current.warning,
      error: current.error,
      surface: current.surface,
      onSurface: current['on-surface'],
    }
  })

  /** Cor de texto neutra (segue light/dark). */
  const textColor = computed(() => colors.value.onSurface)

  /** Grade suave (mesma cor do texto com alpha baixo). */
  const gridColor = computed(() => withAlpha(colors.value.onSurface, 0.1))

  return { colors, textColor, gridColor, withAlpha }
}

/**
 * English axis labels generated with `Intl`.
 */
export function useDashboardChartLabels() {
  const shortMonths = computed(() => {
    const formatter = new Intl.DateTimeFormat('en-US', { month: 'short' })

    return Array.from(
      { length: 12 },
      (_, index) => formatter.format(new Date(2026, index, 1)),
    )
  })

  /** Últimos `count` meses (mais antigo → mais recente) a partir de junho/2026. */
  const lastMonths = (count = 7) => shortMonths.value.slice(12 - count)

  return { shortMonths, lastMonths }
}
