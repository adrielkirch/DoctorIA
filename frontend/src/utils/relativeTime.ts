/**
 * Tempo relativo em EN (mesmo padrão do `useNotificationsStore`).
 * Tempos relativos ficam fora do i18n por convenção do projeto.
 */
export function formatRelativeTime(iso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000))

  if (minutes < 1)
    return 'just now'
  if (minutes < 60)
    return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24)
    return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days === 1)
    return 'yesterday'
  if (days < 7)
    return `${days}d ago`

  return new Date(iso).toLocaleDateString()
}
