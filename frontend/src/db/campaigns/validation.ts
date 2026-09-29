/**
 * Campaigns — regras compartilhadas de validação e normalização.
 *
 * Fonte única para o browser (drawer/editor) e para o fake-api: o que o editor
 * conta é exatamente o que o handler aceita. O texto é sempre NORMALIZADO antes
 * de contar/gravar — o markup do editor nunca consome o limite de caracteres.
 */

/** Limite de caracteres do texto normalizado da mensagem (markup fora). */
export const CAMPAIGN_MESSAGE_MAX_CHARS = 200

/** Tempo padrão na página (segundos) do primeiro slice. */
export const CAMPAIGN_DEFAULT_TIME_ON_PAGE_SECONDS = 10

/**
 * Texto exibido/contado: NBSP vira espaço, runs de whitespace colapsam e as
 * bordas são aparadas. Determinístico para o contador e para o limite.
 */
export function normalizeMessageText(value: string): string {
  return value.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Quantos caracteres visíveis a mensagem consome (markup fora). */
export function countMessageChars(value: string): number {
  return normalizeMessageText(value).length
}

/** Texto normalizado dentro do limite (markup do editor fora da conta). */
export function countsAsCampaignMessage(value: string): boolean {
  return countMessageChars(value) <= CAMPAIGN_MESSAGE_MAX_CHARS
}

/**
 * URL aceita: caminho relativo ao app (`/pricing`) ou absoluta `http`/`https`.
 *
 * Rejeita protocolos perigosos (`javascript:`, `data:`), protocol-relative
 * (`//host`) e valores sem caminho/esquema.
 */
export function isSupportedCampaignUrl(value: string): boolean {
  const url = value.trim()

  if (!url)
    return false


  if (url.startsWith('//'))
    return false

  if (url.startsWith('/'))
    return true


  if (!/^[a-z][\w+.-]*:/i.test(url))
    return false

  try {
    const parsed = new URL(url)

    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  }
  catch {
    return false
  }
}

/** Inteiro >= 0 (o input numérico pode chegar como string/`NaN`). */
export function isValidTimeOnPageSeconds(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}
