import { reactive } from 'vue';

export type SnackbarColor = 'success' | 'error' | 'warning' | 'info'

const DEFAULT_DURATION = 3000



const state = reactive<{ visible: boolean; text: string; color: SnackbarColor }>({
  visible: false,
  text: '',
  color: 'info',
})

let timer: ReturnType<typeof setTimeout> | null = null

function show(message: string, options: { color?: SnackbarColor; duration?: number } = {}) {
  state.text = message
  state.color = options.color ?? 'info'
  state.visible = true

  if (timer)
    clearTimeout(timer)
  timer = setTimeout(() => { state.visible = false }, options.duration ?? DEFAULT_DURATION)
}

export function useSnackbar() {
  return {
    state,
    success: (message: string) => show(message, { color: 'success' }),
    error: (message: string) => show(message, { color: 'error' }),
    info: (message: string) => show(message, { color: 'info' }),
    warning: (message: string) => show(message, { color: 'warning' }),
  }
}

