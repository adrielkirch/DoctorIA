import TeamCards from '@/views/access-control/teams/TeamCards.vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Times — estado VAZIO da seção (`/access-control/roles`).
 *
 * Bug reportado no demo: um workspace SEM nenhum time (ex.: `workspace-beta`)
 * mostrava apenas o alerta "Nenhum time ainda…" e o tile "+ Add Team" existia
 * só no grid (renderizado quando JÁ há time) — não havia caminho para criar o
 * primeiro time. Este teste trava:
 *  - o CTA do estado vazio (com `teams.manage`);
 *  - a copy de leitura para quem só tem `teams.view` (sem CTA);
 *  - o gating das ações dos cards e o alerta de erro.
 */

interface TeamRow {
  id: string
  name: string
  memberCount: number
  color?: string
  description?: string
}

const state = vi.hoisted(() => ({
  permissions: new Set<string>(),
  teams: [] as TeamRow[],
  isLoading: false,
  error: null as string | null,
}))

vi.mock('@/stores/useAccessControlStore', () => ({
  useAccessControlStore: () => ({
    can: (permission: string) => state.permissions.has(permission),
    ensureLoaded: () => {},
  }),
}))

vi.mock('@/views/access-control/teams/useTeamsStore', () => ({
  useTeamsStore: () => ({
    get hasTeams() { return state.teams.length > 0 },
    get teams() { return state.teams },
    get isLoading() { return state.isLoading },
    get error() { return state.error },
    ensureLoaded: () => {},
    deleteTeam: vi.fn(),
  }),
}))

const stubs = {
  VRow: { template: '<div><slot /></div>' },
  VCol: { template: '<div><slot /></div>' },
  VSkeletonLoader: { template: '<div class="skeleton" />' },
  VAlert: { template: '<div class="alert"><slot /></div>' },
  VCard: { template: '<div><slot /></div>' },
  VCardText: { template: '<div><slot /></div>' },
  VCardActions: { template: '<div><slot /></div>' },
  VAvatar: { template: '<span><slot /></span>' },
  VIcon: { template: '<i />' },
  VChip: { template: '<span><slot /></span>' },
  VBtn: { template: '<button type="button" @click="$emit(\'click\')"><slot /></button>' },
  VDialog: { template: '<div><slot /></div>' },
  VSpacer: { template: '<span />' },
  VSnackbar: { template: '<div><slot /></div>' },
  IconBtn: { template: '<button type="button"><slot /></button>' },
  AddEditTeamDialog: {
    name: 'AddEditTeamDialog',
    props: ['isDialogVisible', 'team'],
    template: '<div class="team-dialog-stub" />',
  },
}

const mountSection = () =>
  mount(TeamCards, { global: { stubs } })

const seededTeams: TeamRow[] = [
  { id: 'team-support', name: 'Support', memberCount: 2, color: 'success' },
  { id: 'team-sales', name: 'Sales', memberCount: 1, color: 'info' },
]

beforeEach(() => {
  state.permissions = new Set(['teams.view', 'teams.manage'])
  state.teams = []
  state.isLoading = false
  state.error = null
})

describe('TeamCards — estado vazio oferece o CTA de criação', () => {
  it('workspace sem times + teams.manage: alerta de vazio E botão "Add Team"', () => {
    const wrapper = mountSection()

    expect(wrapper.find('[data-testid="teams-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="teams-empty"]').text()).toContain('create the first one')


    expect(wrapper.find('[data-testid="team-add"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="team-add"]').text()).toBe('Add Team')
  })

  it('o CTA do estado vazio abre o dialog de criação (sem time selecionado)', async () => {
    const wrapper = mountSection()

    await wrapper.find('[data-testid="team-add"]').trigger('click')

    const dialog = wrapper.findComponent({ name: 'AddEditTeamDialog' })

    expect(dialog.exists()).toBe(true)
    expect(dialog.props('isDialogVisible')).toBe(true)
    expect(dialog.props('team')).toBeNull()
  })

  it('workspace sem times + só teams.view: sem CTA e com a copy de leitura', () => {
    state.permissions = new Set(['teams.view'])

    const wrapper = mountSection()

    expect(wrapper.find('[data-testid="teams-empty"]').text()).toContain('ask an administrator')
    expect(wrapper.find('[data-testid="team-add"]').exists()).toBe(false)
  })

  it('erro de carregamento mostra o alerta de erro (nunca o CTA)', () => {
    state.error = 'boom'

    const wrapper = mountSection()

    expect(wrapper.find('[data-testid="teams-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="teams-empty"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="team-add"]').exists()).toBe(false)
  })
})

describe('TeamCards — cards e ações gateadas por teams.manage', () => {
  it('com times + teams.manage: cards com contagem de membros + tile de criação', () => {
    state.teams = [...seededTeams]

    const wrapper = mountSection()

    expect(wrapper.findAll('[data-testid="team-card"]')).toHaveLength(2)
    expect(wrapper.find('[data-testid="team-member-count"]').text()).toContain('2')
    expect(wrapper.find('[data-testid="team-add"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="team-edit-team-support"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="team-delete-team-support"]').exists()).toBe(true)
  })

  it('com times + só teams.view: cards em leitura, sem nenhuma ação', () => {
    state.permissions = new Set(['teams.view'])
    state.teams = [...seededTeams]

    const wrapper = mountSection()

    expect(wrapper.findAll('[data-testid="team-card"]')).toHaveLength(2)
    expect(wrapper.find('[data-testid="team-add"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="team-edit-team-support"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="team-delete-team-support"]').exists()).toBe(false)
  })
})
