import { authorize } from '@api-utils/authorize'
import { genId } from '@api-utils/genId'
import { paginateArray } from '@api-utils/paginateArray'
import { getTenantId } from '@api-utils/tenant'
import { db } from '@db/ai/skills/db'
import type { Skill, SkillCreatePayload, SkillUpdatePayload } from 'contracts/ai/skills/types'
import { HttpResponse, http } from 'msw'

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

export const handlerAiSkills = [




  http.get('*/api/ai/skills', ({ request }) => {
    const denied = authorize(request, ['ai.skills.view', 'ai.skills.use'])
    if (denied)
      return denied

    const url = new URL(request.url)
    const tenantId = getTenantId(request)
    const q = url.searchParams.get('q')?.trim().toLowerCase() ?? ''
    const type = url.searchParams.get('type')?.trim().toUpperCase() ?? ''
    const page = parsePositiveInt(url.searchParams.get('page'), 1)
    const itemsPerPage = Math.min(parsePositiveInt(url.searchParams.get('itemsPerPage'), 12), 100)

    let skills = db.skills.filter(s => s.tenantId === tenantId)

    if (q) {
      skills = skills.filter(s =>
        s.name.toLowerCase().includes(q)
        || s.command.toLowerCase().includes(q),
      )
    }
    if (type === 'DEFAULT' || type === 'CUSTOM')
      skills = skills.filter(s => s.type === type)

    const total = skills.length
    const totalPages = Math.ceil(total / itemsPerPage)

    return HttpResponse.json({
      skills: paginateArray(skills, itemsPerPage, page),
      total,
      totalPages,
      page,
    })
  }),


  http.post('*/api/ai/skills', async ({ request }) => {
    const denied = authorize(request, 'ai.skills.manage')
    if (denied)
      return denied

    const payload = await request.json() as SkillCreatePayload

    const normalised = payload.command.startsWith('/')
      ? payload.command.toLowerCase()
      : `/${payload.command.toLowerCase()}`

    const duplicate = db.skills.find(
      s => s.command.toLowerCase() === normalised,
    )

    if (duplicate)
      return HttpResponse.json({ message: 'Command already in use' }, { status: 409 })

    const newSkill: Skill = {
      id: genId(db.skills),
      tenantId: getTenantId(request),
      name: payload.name,
      command: normalised,
      category: payload.category,
      type: 'CUSTOM',
      instructions: payload.instructions,
      color: payload.color,
      icon: payload.icon,
      createdAt: new Date().toISOString(),
    }

    db.skills.push(newSkill)

    return HttpResponse.json({ skill: newSkill }, { status: 201 })
  }),


  http.patch('*/api/ai/skills/:id', async ({ request, params }) => {
    const denied = authorize(request, 'ai.skills.manage')
    if (denied)
      return denied

    const id = Number(params.id)
    const tenantId = getTenantId(request)
    const index = db.skills.findIndex(s => s.id === id && s.tenantId === tenantId)

    if (index === -1)
      return HttpResponse.json({ message: 'Skill not found' }, { status: 404 })

    const skill = db.skills[index]

    if (skill.type === 'DEFAULT')
      return HttpResponse.json({ message: 'Default skills cannot be modified' }, { status: 403 })

    const payload = await request.json() as Partial<SkillUpdatePayload>

    if (payload.command) {
      const normalised = payload.command.startsWith('/')
        ? payload.command.toLowerCase()
        : `/${payload.command.toLowerCase()}`

      const duplicate = db.skills.find(
        s => s.command.toLowerCase() === normalised && s.id !== id,
      )

      if (duplicate)
        return HttpResponse.json({ message: 'Command already in use' }, { status: 409 })

      payload.command = normalised
    }

    db.skills[index] = { ...skill, ...payload }

    return HttpResponse.json({ skill: db.skills[index] })
  }),


  http.delete('*/api/ai/skills/:id', ({ request, params }) => {
    const denied = authorize(request, 'ai.skills.manage')
    if (denied)
      return denied

    const id = Number(params.id)
    const tenantId = getTenantId(request)
    const index = db.skills.findIndex(s => s.id === id && s.tenantId === tenantId)

    if (index === -1)
      return HttpResponse.json({ message: 'Skill not found' }, { status: 404 })

    if (db.skills[index].type === 'DEFAULT')
      return HttpResponse.json({ message: 'Default skills cannot be deleted' }, { status: 403 })

    db.skills.splice(index, 1)

    return new HttpResponse(null, { status: 204 })
  }),
]
