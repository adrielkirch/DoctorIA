import { describe, expect, it } from 'vitest'
import {
  CAMPAIGN_MESSAGE_MAX_CHARS,
  countMessageChars,
  countsAsCampaignMessage,
  isSupportedCampaignUrl,
  isValidTimeOnPageSeconds,
  normalizeMessageText,
} from './validation'

describe('normalizeMessageText / countMessageChars', () => {
  it('collapses whitespace and NBSP and trims the edges', () => {
    expect(normalizeMessageText('  Olá!\u00A0\n\n   Tudo   bem?  ')).toBe('Olá! Tudo bem?')
  })

  it('returns an empty string for whitespace-only content', () => {
    expect(normalizeMessageText('   \n\t ')).toBe('')
  })

  it('counts the normalized plain text it receives (o HTML nunca chega ao contador)', () => {
    expect(countMessageChars('abc')).toBe(3)
    expect(countMessageChars('   a   b  ')).toBe(3)
  })

  it('enforces the 200-character limit exactly', () => {
    expect(CAMPAIGN_MESSAGE_MAX_CHARS).toBe(200)
    expect(countsAsCampaignMessage('a'.repeat(200))).toBe(true)
    expect(countsAsCampaignMessage('a'.repeat(201))).toBe(false)
    expect(countsAsCampaignMessage('')).toBe(true)
  })
})

describe('isSupportedCampaignUrl', () => {
  it.each(['/pricing', '/', 'https://example.com/welcome', 'http://example.com'])(
    'accepts %s',
    url => expect(isSupportedCampaignUrl(url)).toBe(true),
  )

  it.each([
    '',
    '   ',
    'pricing',
    '//evil.example.com',
    'javascript:alert(1)',
    'data:text/html,<b>x</b>',
    'ftp://example.com',
  ])('rejects %s', url => expect(isSupportedCampaignUrl(url)).toBe(false))
})

describe('isValidTimeOnPageSeconds', () => {
  it('accepts zero and positive integers', () => {
    expect(isValidTimeOnPageSeconds(0)).toBe(true)
    expect(isValidTimeOnPageSeconds(10)).toBe(true)
  })

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '10', null, undefined, ''])(
    'rejects %s',
    value => expect(isValidTimeOnPageSeconds(value)).toBe(false),
  )
})
