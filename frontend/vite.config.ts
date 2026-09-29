import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { fileURLToPath } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import type { TreeNode } from 'unplugin-vue-router'
import { VueRouterAutoImports } from 'unplugin-vue-router'
import VueRouter from 'unplugin-vue-router/vite'
import { defineConfig } from 'vite'
import VueDevTools from 'vite-plugin-vue-devtools'
import MetaLayouts from 'vite-plugin-vue-meta-layouts'
import vuetify from 'vite-plugin-vuetify'
import svgLoader from 'vite-svg-loader'






const routeNameSegments = (node: TreeNode): string[] => {
  const own = node.value.subSegments
    .filter(segment => typeof segment !== 'string' || segment.length > 0)
    .map(segment => {
      if (typeof segment === 'string')
        return segment.replace(/([a-z\d])([A-Z])/g, '$1-$2').toLowerCase()

      return `${segment.isSplat ? '$' : ''}${segment.paramName}${segment.modifier}`
    })

  const { parent } = node

  return parent && !parent.isRoot()
    ? [...routeNameSegments(parent), ...own]
    : own
}








const usePolling = process.env.VITE_WATCH_USE_POLLING === 'true'
const pollInterval = Number(process.env.VITE_WATCH_POLL_INTERVAL ?? 1000)


const watchIgnored = ['**/coverage/**', '**/dist/**', '**/docs/**', '**/.specify/**']

export default defineConfig({
  plugins: [


    VueRouter({
      getRouteName: routeNode => routeNameSegments(routeNode).join('-'),
    }),
    vue({
      template: {
        compilerOptions: {
          isCustomElement: tag => tag === 'swiper-container' || tag === 'swiper-slide',
        },
      },
    }),
    VueDevTools(),
    vueJsx(),


    vuetify({
      styles: {
        configFile: 'src/assets/styles/variables/_vuetify.scss',
      },
    }),


    MetaLayouts({
      target: './src/layouts',
      defaultLayout: 'default',
    }),


    Components({
      dirs: ['src/@core/components', 'src/views/demos', 'src/components'],
      dts: true,
    }),


    AutoImport({
      imports: [
        'vue',
        VueRouterAutoImports,
        '@vueuse/core',
        '@vueuse/math',
        'pinia',
        { '@/plugins/i18n': ['useI18n'] },
      ],
      dirs: [
        './src/@core/utils',
        './src/@core/composable/',
        './src/composables/',
        './src/utils/',
        './src/plugins/*/composables/*',
      ],
      vueTemplate: true,


      ignore: ['useCookies', 'useStorage'],
    }),


    svgLoader(),
  ],
  define: { 'process.env': {} },
  resolve: {
    alias: {
      contracts: fileURLToPath(new URL('./contracts', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@themeConfig': fileURLToPath(new URL('./themeConfig.ts', import.meta.url)),
      '@core': fileURLToPath(new URL('./src/@core', import.meta.url)),
      '@layouts': fileURLToPath(new URL('./src/@layouts', import.meta.url)),
      '@images': fileURLToPath(new URL('./src/assets/images/', import.meta.url)),
      '@styles': fileURLToPath(new URL('./src/assets/styles/', import.meta.url)),
      '@configured-variables': fileURLToPath(new URL('./src/assets/styles/variables/_template.scss', import.meta.url)),
      '@db': fileURLToPath(new URL('./src/plugins/fake-api/handlers/', import.meta.url)),
      '@api-utils': fileURLToPath(new URL('./src/plugins/fake-api/utils/', import.meta.url)),


      'vue-i18n': fileURLToPath(new URL('./src/plugins/i18n/index.ts', import.meta.url)),
    },
  },
  server: {





    host: true,
    watch: {
      ignored: watchIgnored,


      usePolling,
      ...(usePolling ? { interval: pollInterval } : {}),
    },
  },
  build: {
    chunkSizeWarningLimit: 5000,
  },
  optimizeDeps: {
    exclude: ['vuetify'],
    entries: [
      './src/**/*.vue',
    ],
  },
})
