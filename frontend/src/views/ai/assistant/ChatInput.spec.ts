import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ChatInput from './ChatInput.vue'
import { ACCEPT_ATTRIBUTE, isSupportedFile } from './chatInputFormats'

const mocks = vi.hoisted(() => ({
  $api: vi.fn(),
  snackbar: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

vi.mock('@/utils/api', () => ({ $api: mocks.$api }))
vi.mock('@/composables/useSnackbar', () => ({ useSnackbar: () => mocks.snackbar }))

function mountInput(props: Record<string, unknown> = {}) {
  setActivePinia(createPinia())

  return mount(ChatInput, {
    props,
    global: {
      plugins: [createPinia()],
      stubs: {

        ModelSelector: { template: '<span class="model-selector-stub" />' },
        VIcon: { template: '<span class="icon-stub" />' },




        VMenu: {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<div class="menu-stub"><slot name="activator" :props="{ onClick: () => $emit(\'update:modelValue\', !modelValue) }" /><div v-if="modelValue" class="menu-content"><slot /></div></div>',
        },
        VTooltip: { template: '<span class="tooltip-stub"><slot /></span>' },
        VChip: { template: '<span class="chip-stub"><slot /></span>' },
        VCard: { template: '<div class="card-stub"><slot /></div>' },
        VList: { template: '<div class="list-stub"><slot /></div>' },
        VListItem: { template: '<div class="list-item-stub"><slot name="prepend" /><slot /><slot name="append" /></div>' },
        VListItemTitle: { template: '<div class="item-title-stub"><slot /></div>' },
        VListItemSubtitle: { template: '<div class="item-subtitle-stub"><slot /></div>' },
      },
    },
  })
}

describe('ChatInput — input inteligente com drag & drop', () => {
  enableAutoUnmount(afterEach)

  beforeEach(() => {
    setActivePinia(createPinia())


    mocks.$api.mockReset()
    mocks.$api.mockResolvedValue({ skills: [], total: 0, totalPages: 0, page: 1 })
  })

  it('Enter envia a mensagem (trim) e limpa o campo', async () => {
    const wrapper = mountInput()

    const editable = wrapper.find('.chat-input__editable')

    ;(editable.element as HTMLElement).textContent = '  olá mundo  '
    await editable.trigger('input')
    await editable.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('send')).toEqual([['olá mundo']])
    expect((editable.element as HTMLElement).textContent).toBe('')
  })

  it('Shift+Enter quebra linha e não envia', async () => {
    const wrapper = mountInput()

    const editable = wrapper.find('.chat-input__editable')

    ;(editable.element as HTMLElement).textContent = 'linha'
    await editable.trigger('input')
    await editable.trigger('keydown', { key: 'Enter', shiftKey: true })

    expect(wrapper.emitted('send')).toBeUndefined()
  })

  it('drop filtra formatos não suportados e emite fileSelect', async () => {
    const wrapper = mountInput()
    const supported = new File(['x'], 'doc.txt', { type: 'text/plain' })
    const unsupported = new File(['x'], 'virus.exe', { type: 'application/x-msdownload' })

    await wrapper.trigger('drop', { dataTransfer: { files: [supported, unsupported] } })

    expect(wrapper.emitted('fileSelect')).toHaveLength(1)
    expect(wrapper.emitted('fileSelect')![0][0]).toEqual([supported])
    expect(mocks.snackbar.warning).toHaveBeenCalledWith('Some files are not supported.')
  })

  it('aceita .md com MIME vazio via extensão (fallback)', () => {
    const md = new File(['# titulo'], 'README.md', { type: '' })

    expect(isSupportedFile(md)).toBe(true)
    expect(isSupportedFile(new File(['x'], 'a.exe', { type: '' }))).toBe(false)
    expect(ACCEPT_ATTRIBUTE).toContain('.pdf')
    expect(ACCEPT_ATTRIBUTE).toContain('.ts')
  })

  it('input de arquivo existe com accept dos formatos suportados', () => {
    const wrapper = mountInput()

    const input = wrapper.find('input[type="file"]')

    expect(input.exists()).toBe(true)
    expect(input.attributes('accept')).toContain('.png')
    expect(input.attributes('accept')).toContain('.json')
  })

  it('prop disabled desabilita o input e o botão de enviar', async () => {
    const wrapper = mountInput({ disabled: true })

    const editable = wrapper.find('.chat-input__editable')

    expect(editable.attributes('contenteditable')).toBe('false')

    ;(editable.element as HTMLElement).textContent = 'oi'
    await editable.trigger('input')
    await wrapper.find('.chat-input__send').trigger('click')

    expect(wrapper.emitted('send')).toBeUndefined()
  })

  it('Fase 3: com streaming=true o botão vira STOP (emite stop, não send)', async () => {
    const wrapper = mountInput({ streaming: true })


    expect(wrapper.find('.chat-input__send').attributes('disabled')).toBeUndefined()

    await wrapper.find('.chat-input__send').trigger('click')

    expect(wrapper.emitted('stop')).toHaveLength(1)
    expect(wrapper.emitted('send')).toBeUndefined()
  })

  it('clique no botão de enviar também envia (não só Enter)', async () => {
    const wrapper = mountInput()

    const editable = wrapper.find('.chat-input__editable')

    ;(editable.element as HTMLElement).textContent = 'oi'
    await editable.trigger('input')
    await wrapper.find('.chat-input__send').trigger('click')

    expect(wrapper.emitted('send')).toEqual([['oi']])
  })

  it('exibe o overlay de drag enquanto há arquivos arrastando', async () => {
    const wrapper = mountInput()

    expect(wrapper.find('.chat-input__overlay').exists()).toBe(false)

    await wrapper.trigger('dragenter', { dataTransfer: {} })
    await wrapper.trigger('dragover', { dataTransfer: {} })

    expect(wrapper.find('.chat-input__overlay').exists()).toBe(true)
    expect(wrapper.text()).toContain('Drop your files here')

    await wrapper.trigger('dragleave', { dataTransfer: {} })
    await wrapper.trigger('dragleave', { dataTransfer: {} })

    expect(wrapper.find('.chat-input__overlay').exists()).toBe(false)
  })

  it('seletor de skills: lista alfabética, insere token no meio e substitui no envio', async () => {
    mocks.$api.mockResolvedValue({
      skills: [
        { id: 1, tenantId: 'workspace-alpha', name: 'Skill Epic Paper', command: '/epic-paper', category: 'Resource', type: 'DEFAULT', instructions: 'x', color: '#1A4A8A', icon: 'bx-file-md', createdAt: '2026-01-01' },
        { id: 2, tenantId: 'workspace-alpha', name: 'Skill Video Use', command: '/video-use', category: 'Resource', type: 'DEFAULT', instructions: 'x', color: '#1E3A5F', icon: 'bx-video', createdAt: '2026-01-01' },
        { id: 4, tenantId: 'workspace-alpha', name: 'Vue Component Generator', command: '/vibe-code', category: 'Custom Logic', type: 'CUSTOM', instructions: 'x', color: '#1A3A2A', icon: 'bx-code-alt', createdAt: '2026-06-01' },
      ],
      total: 3,
      totalPages: 1,
      page: 1,
    })

    const wrapper = mountInput()

    await flushPromises()


    expect(wrapper.find('.menu-stub').exists()).toBe(true)
    await wrapper.find('.menu-stub .chat-input__action').trigger('click')
    await flushPromises()

    expect(wrapper.find('.menu-content').exists()).toBe(true)


    const items = wrapper.findAll('.list-item-stub')

    expect(items.map(i => i.text().trim())).toEqual(['/epic-paper', '/vibe-code', '/video-use'])


    const editable = wrapper.find('.chat-input__editable')

    ;(editable.element as HTMLElement).textContent = 'siga a skill '
    await editable.trigger('input')

    await items[1].trigger('click') // /vibe-code
    await flushPromises()

    expect(wrapper.findAll('.skill-token')).toHaveLength(1)
    expect((wrapper.find('.skill-token').element as HTMLElement).textContent).toBe('/vibe-code')


    await editable.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(wrapper.emitted('send')).toEqual([['siga a skill /vibe-code']])
    expect(wrapper.findAll('.skill-token')).toHaveLength(0)
  })

  it('sem skills no workspace o seletor de skills não aparece', async () => {

    const wrapper = mountInput()

    await flushPromises()

    expect(wrapper.find('.menu-stub').exists()).toBe(false)
  })
})
