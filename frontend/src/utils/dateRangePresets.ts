export interface DateRangeFilterValue {
  presetKey: string
  start: string
  end: string
}

/**
 * ISO `yyyy-mm-dd` montado com as partes LOCAIS da data — `toISOString()`
 * empurra o dia para frente/atrás em fusos diferentes de UTC (23h em UTC-3 já
 * é o dia seguinte em UTC), o que desalinhava o range do calendário.
 */
function toIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

/** Único ponto de cálculo dos presets de `AppDateRangeFilter` (reusado pelas stores que guardam o período selecionado). */
export function computeDateRangePreset(key: string): { start: string; end: string } {
  const today = new Date()
  const end = new Date(today)

  if (key === 'last7Days') {
    const start = new Date(today)

    start.setDate(start.getDate() - 6)

    return { start: toIso(start), end: toIso(end) }
  }

  if (key === 'last30Days') {
    const start = new Date(today)

    start.setDate(start.getDate() - 29)

    return { start: toIso(start), end: toIso(end) }
  }

  if (key === 'last3Months') {
    const start = new Date(today)

    start.setMonth(start.getMonth() - 3)

    return { start: toIso(start), end: toIso(end) }
  }

  if (key === 'last6Months') {
    const start = new Date(today)

    start.setMonth(start.getMonth() - 6)

    return { start: toIso(start), end: toIso(end) }
  }

  if (key === 'lastYear') {
    const year = today.getFullYear() - 1

    return { start: `${year}-01-01`, end: `${year}-12-31` }
  }

  if (key === 'thisWeek') {
    const start = new Date(today)
    const mondayOffset = (start.getDay() + 6) % 7

    start.setDate(start.getDate() - mondayOffset)

    return { start: toIso(start), end: toIso(end) }
  }

  if (key === 'thisMonth') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1)

    return { start: toIso(start), end: toIso(end) }
  }


  return { start: toIso(end), end: toIso(end) }
}
