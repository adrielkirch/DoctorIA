import type { App } from 'vue'

import { createMongoAbility } from '@casl/ability'
import { abilitiesPlugin } from '@casl/vue'
import type { Ability, Actions, Rule, Subjects } from './ability'



let activeAbility: Ability | null = null

/**
 * Atualiza as abilities do usuário em runtime (login, troca de tenant).
 * No-op antes do app instalar o plugin (ex.: SSR/testes unitários).
 */
export function updateUserAbility(rules: Rule[]): void {
  activeAbility?.update(rules)
}

/**
 * Instância ativa da ability (definida no boot a partir dos cookies e atualizada
 * em login/troca de tenant). Usada fora do contexto de componentes (redirects,
 * guards) onde `useAbility()` do @casl/vue não resolve via inject.
 */
export function getActiveAbility(): Ability | null {
  return activeAbility
}

export default function (app: App) {
  const userAbilityRules = useCookie<Rule[]>('userAbilityRules')
  const memberships = useCookie<Array<{ role?: string }> | null>('memberships')




  const fallbackRules: Rule[] = (memberships.value ?? []).some(m => m.role === 'owner' || m.role === 'admin')
    ? [{ action: 'manage', subject: 'all' }]
    : []

  const initialAbility = createMongoAbility<[Actions, Subjects]>(
    userAbilityRules.value?.length ? userAbilityRules.value : fallbackRules,
  )

  activeAbility = initialAbility

  app.use(abilitiesPlugin, initialAbility, {
    useGlobalProperties: true,
  })
}

