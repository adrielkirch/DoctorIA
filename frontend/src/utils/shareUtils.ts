/**
 * Copia texto para a área de transferência com fallback para browsers antigos.
 * @returns true se o texto foi copiado com sucesso.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)

      return true
    }

    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    const result = document.execCommand('copy')
    textArea.remove()

    return result
  }
  catch (error) {
    console.error('Erro ao copiar para clipboard:', error)

    return false
  }
}
