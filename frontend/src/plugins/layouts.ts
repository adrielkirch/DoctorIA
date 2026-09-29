import type { App } from 'vue'

import { createLayouts } from '@layouts'
import type { PartialDeep } from 'type-fest'

import { layoutConfig } from '@themeConfig'


import '@layouts/styles/index.scss'

export default function (app: App) {

  app.use(createLayouts(layoutConfig as PartialDeep<typeof layoutConfig, NonNullable<unknown>>))
}
