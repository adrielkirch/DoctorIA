import { createApp } from 'vue'

import App from '@/App.vue'
import { registerPlugins } from '@core/utils/plugins'


import '@core/scss/template/index.scss'
import '@styles/styles.scss'

async function bootstrap() {

  const app = createApp(App)






  await registerPlugins(app)


  app.mount('#app')
}

void bootstrap()
