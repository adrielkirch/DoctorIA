/**
 * This is an advanced example for creating icon bundles for Iconify SVG Framework.
 *
 * It creates a bundle from:
 * - All SVG files in a directory.
 * - Custom JSON files.
 * - Iconify icon sets.
 * - SVG framework.
 *
 * This example uses Iconify Tools to import and clean up icons.
 * For Iconify Tools documentation visit https://docs.iconify.design/tools/tools2/
 */
import { promises as fs } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'


import { cleanupSVG, importDirectory, isEmptyColor, parseColors, runSVGO } from '@iconify/tools'
import type { IconifyJSON } from '@iconify/types'
import { getIcons, getIconsCSS, stringToIcon } from '@iconify/utils'


const require = createRequire(import.meta.url)

/**
 * Script configuration
 */
interface BundleScriptCustomSVGConfig {


  dir: string


  monotone: boolean


  prefix: string
}

interface BundleScriptCustomJSONConfig {


  filename: string


  icons?: string[]
}

interface BundleScriptConfig {


  svg?: BundleScriptCustomSVGConfig[]


  icons?: string[]




  json?: (string | BundleScriptCustomJSONConfig)[]
}

const sources: BundleScriptConfig = {

  svg: [











  ],

  icons: [






  ],

  json: [




    require.resolve('@iconify-json/bx/icons.json'),
    {
      filename: require.resolve('@iconify-json/mdi/icons.json'),
      icons: [
        'close-circle',
        'language-javascript',
        'language-typescript',
        'translate',
        'arrow-bottom-left',
        'arrow-bottom-right',
        'arrow-top-left',
        'arrow-top-right',
        'arrow-collapse-all',
        'arrow-down-left',
      ],
    },
    {
      filename: require.resolve('@iconify-json/fa/icons.json'),
      icons: [
        'circle',
      ],
    },












  ],
}


const target = join(__dirname, 'icons.css')

/**
 * Do stuff!
 */

;(async function () {

  const dir = dirname(target)
  try {
    await fs.mkdir(dir, {
      recursive: true,
    })
  }
  catch (err) {

  }

  const allIcons: IconifyJSON[] = []

  /**
   * Convert sources.icons to sources.json
   */
  if (sources.icons) {
    const sourcesJSON = sources.json ? sources.json : (sources.json = [])


    const organizedList = organizeIconsList(sources.icons)

    for (const prefix in organizedList) {
      const filename = require.resolve(`@iconify/json/json/${prefix}.json`)

      sourcesJSON.push({
        filename,
        icons: organizedList[prefix],
      })
    }
  }

  /**
   * Bundle JSON files and collect icons
   */
  if (sources.json) {
    for (let i = 0; i < sources.json.length; i++) {
      const item = sources.json[i]


      const filename = typeof item === 'string' ? item : item.filename
      const content = JSON.parse(await fs.readFile(filename, 'utf8')) as IconifyJSON

      for (const key in content) {
        if (key === 'prefix' && content.prefix === 'tabler') {
          for (const k in content.icons)
            content.icons[k].body = content.icons[k].body.replace(/stroke-width="2"/g, 'stroke-width="1.5"')
        }
      }


      if (typeof item !== 'string' && item.icons?.length) {
        const filteredContent = getIcons(content, item.icons)

        if (!filteredContent)
          throw new Error(`Cannot find required icons in ${filename}`)


        allIcons.push(filteredContent)
      }
      else {

        allIcons.push(content)
      }
    }
  }

  /**
   * Bundle custom SVG icons and collect icons
   */
  if (sources.svg) {
    for (let i = 0; i < sources.svg.length; i++) {
      const source = sources.svg[i]


      const iconSet = await importDirectory(source.dir, {
        prefix: source.prefix,
      })


      await iconSet.forEach(async (name, type) => {
        if (type !== 'icon')
          return


        const svg = iconSet.toSVG(name)

        if (!svg) {

          iconSet.remove(name)

          return
        }


        try {

          await cleanupSVG(svg)

          if (source.monotone) {


            await parseColors(svg, {
              defaultColor: 'currentColor',
              callback: (attr, colorStr, color) => {
                return !color || isEmptyColor(color) ? colorStr : 'currentColor'
              },
            })
          }


          await runSVGO(svg)
        }
        catch (err) {

          console.error(`Error parsing ${name} from ${source.dir}:`, err)
          iconSet.remove(name)

          return
        }


        iconSet.fromSVG(name, svg)
      })


      allIcons.push(iconSet.export())
    }
  }


  const cssContent = allIcons
    .map(iconSet => getIconsCSS(
      iconSet,
      Object.keys(iconSet.icons),
      {
        iconSelector: '.{prefix}-{name}',
        mode: 'mask',
      },
    ))
    .join('\n')


  await fs.writeFile(target, cssContent, 'utf8')

  console.log(`Saved CSS to ${target}!`)
})().catch(err => {
  console.error(err)
})

/**
 * Sort icon names by prefix
 */
function organizeIconsList(icons: string[]): Record<string, string[]> {
  const sorted: Record<string, string[]> = Object.create(null)

  icons.forEach(icon => {
    const item = stringToIcon(icon)

    if (!item)
      return

    const prefix = item.prefix
    const prefixList = sorted[prefix] ? sorted[prefix] : (sorted[prefix] = [])

    const name = item.name

    if (!prefixList.includes(name))
      prefixList.push(name)
  })

  return sorted
}
