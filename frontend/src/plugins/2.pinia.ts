import { createPinia } from 'pinia'
import type { App } from 'vue'

export const store = createPinia()



if (import.meta.env.DEV)
  (globalThis as any).__pinia = store

export default function (app: App) {
  app.use(store)
}
