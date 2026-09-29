import { afterEach, describe, expect, it, vi } from 'vitest'
import { computeDateRangePreset } from './dateRangePresets'

/** ISO `yyyy-mm-dd` com as partes locais — mesmo contrato do calendário do filtro. */
function localIso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

function addDays(base: Date, days: number): Date {
  const date = new Date(base)

  date.setDate(date.getDate() + days)

  return date
}

afterEach(() => {
  vi.useRealTimers()
})

describe('computeDateRangePreset', () => {
  it('last7Days = hoje + 6 dias anteriores (inclusive os dois extremos)', () => {
    const today = new Date()
    const { start, end } = computeDateRangePreset('last7Days')

    expect(end).toBe(localIso(today))
    expect(start).toBe(localIso(addDays(today, -6)))
  })

  it('last30Days = hoje + 29 dias anteriores', () => {
    const today = new Date()
    const { start, end } = computeDateRangePreset('last30Days')

    expect(end).toBe(localIso(today))
    expect(start).toBe(localIso(addDays(today, -29)))
  })

  it('last3Months e last6Months terminam hoje e começam N meses atrás', () => {
    const today = new Date()

    for (const [key, months] of [['last3Months', 3], ['last6Months', 6]] as const) {
      const expectedStart = new Date(today)

      expectedStart.setMonth(expectedStart.getMonth() - months)

      const { start, end } = computeDateRangePreset(key)

      expect(end).toBe(localIso(today))
      expect(start).toBe(localIso(expectedStart))
    }
  })

  it('lastYear = 1º de janeiro até 31 de dezembro do ano anterior', () => {
    const previousYear = new Date().getFullYear() - 1

    expect(computeDateRangePreset('lastYear')).toEqual({
      start: `${previousYear}-01-01`,
      end: `${previousYear}-12-31`,
    })
  })

  it('thisWeek começa na segunda-feira da semana corrente e termina hoje', () => {
    const today = new Date()
    const monday = new Date(today)

    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))

    const { start, end } = computeDateRangePreset('thisWeek')

    expect(start).toBe(localIso(monday))
    expect(end).toBe(localIso(today))
    expect(monday.getDay()).toBe(1)
  })

  it('thisMonth começa no dia 1º e termina hoje', () => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)

    expect(computeDateRangePreset('thisMonth')).toEqual({
      start: localIso(firstDay),
      end: localIso(today),
    })
  })

  it('custom devolve start === end (hoje) — o range vem do calendário', () => {
    const today = localIso(new Date())

    expect(computeDateRangePreset('custom')).toEqual({ start: today, end: today })
  })

  it('todas as chaves devolvem ISO yyyy-mm-dd parseável sem shift de dia', () => {
    const keys = ['last7Days', 'last30Days', 'last3Months', 'last6Months', 'lastYear', 'thisWeek', 'thisMonth', 'custom']

    for (const key of keys) {
      const { start, end } = computeDateRangePreset(key)

      expect(start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(end).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(start <= end).toBe(true)

      for (const iso of [start, end]) {
        const [year, month, day] = iso.split('-').map(Number)


        expect(localIso(new Date(year, month - 1, day))).toBe(iso)
      }
    }
  })

  it('23h no fuso local não empurra o dia para frente (regressão do toISOString)', () => {

    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 21, 23, 30))

    const { start, end } = computeDateRangePreset('last7Days')

    expect(end).toBe('2026-09-21')
    expect(start).toBe('2026-09-15')
  })
})
