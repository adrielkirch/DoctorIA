import CredentialRow from '@/views/security/credentials/CredentialRow.vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

describe('CredentialRow', () => {
  it('renders masked secret values and no reveal control', () => {
    const wrapper = mount(CredentialRow, {
      props: {
        credential: {
          id: 11,
          tenantId: 'workspace-alpha',
          key: 'OPENAI_API_KEY',
          type: 'SECRET',
          maskedValue: '********',
          description: 'secret',
          updatedAt: '2026-08-01T10:00:00.000Z',
        },
      },
      global: {
        stubs: {
          VBtn: { template: '<button><slot /></button>' },
          VAvatar: { template: '<span><slot /></span>' },
          VChip: { template: '<span><slot /></span>' },
          VIcon: true,
          VListItem: { template: '<article><slot name="prepend" /><slot /><slot name="append" /></article>' },
          VListItemTitle: { template: '<h4><slot /></h4>' },
          VListItemSubtitle: { template: '<p><slot /></p>' },
        },
      },
    })

    expect(wrapper.text()).toContain('********')
    expect(wrapper.text()).not.toContain('Edit Secret')
    expect(wrapper.text()).toContain('Delete Secret')
    expect(wrapper.text()).not.toContain('Reveal')
  })
})
