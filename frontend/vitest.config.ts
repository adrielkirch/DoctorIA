import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = __filename.substring(0, __filename.lastIndexOf('/'))

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    server: {
      deps: {
        inline: ['vuetify'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
    },
  },
  resolve: {
    alias: {
      contracts: `${__dirname}/contracts`,
      '@': `${__dirname}/src`,
      '@themeConfig': `${__dirname}/themeConfig.ts`,
      '@core': `${__dirname}/src/@core`,
      '@layouts': `${__dirname}/src/@layouts`,
      '@images': `${__dirname}/src/assets/images`,
      '@styles': `${__dirname}/src/assets/styles`,
      '@configured-variables': `${__dirname}/src/assets/styles/variables/_template.scss`,
      '@db': `${__dirname}/src/plugins/fake-api/handlers`,
      '@api-utils': `${__dirname}/src/plugins/fake-api/utils`,


      'vue-i18n': `${__dirname}/src/plugins/i18n/index.ts`,
    },
  },
})
