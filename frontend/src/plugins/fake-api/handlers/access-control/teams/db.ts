/**
 * Access Control — Times (teams): mock DB + regras de negócio por tenant.
 *
 * COESÃO (skill `access-control-teams`):
 *  - a fonte dos membros é SEMPRE `UserProperties.teamId` — o time NUNCA guarda
 *    lista de membros (`memberCount` é projeção de leitura derivada disto);
 *  - nome é obrigatório e único DENTRO do tenant (case-insensitive);
 *  - remover um time faz CASCATA (`teamId → null` nos membros), então nunca
 *    sobra usuário apontando para time inexistente.
 *
 * @see .specify/skills/access-control-teams/skill.md
 */
import { db as usersDb } from '@db/access-control/users/db'
import type {
    CreateTeamPayload,
    Team,
    TeamView,
    UpdateTeamPayload,
} from 'contracts/access-control/teams/types'

interface TeamsDB {
  teams: Team[]
}

/**
 * Seeds do `workspace-alpha`. `workspace-beta` fica SEM times de propósito —
 * é a prova viva do isolamento por tenant (e o `users/db.ts` distribui os
 * membros entre estes ids).
 */
const baseTeams: Team[] = [
  {
    id: 'team-support',
    tenantId: 'workspace-alpha',
    name: 'Support',
    description: 'Atendimento e suporte ao cliente.',
    color: 'success',
    createdAt: '2026-01-05T09:00:00.000Z',
  },
  {
    id: 'team-sales',
    tenantId: 'workspace-alpha',
    name: 'Sales',
    description: 'Operação comercial e novos negócios.',
    color: 'info',
    createdAt: '2026-01-06T09:00:00.000Z',
  },
  {
    id: 'team-engineering',
    tenantId: 'workspace-alpha',
    name: 'Engineering',
    description: 'Produto e integrações.',
    color: 'primary',
    createdAt: '2026-01-07T09:00:00.000Z',
  },
]

export const db: TeamsDB = {
  teams: baseTeams.map(team => ({ ...team })),
}



/** Times do tenant (nunca vaza time de outro workspace). */
export function listTeams(tenantId: string): Team[] {
  return db.teams.filter(team => team.tenantId === tenantId)
}

export function getTeam(tenantId: string, teamId: string): Team | undefined {
  return db.teams.find(team => team.tenantId === tenantId && team.id === teamId)
}

/** Validação usada pelo handler de usuários (`teamId` no invite/PATCH). */
export function teamExists(tenantId: string, teamId: string): boolean {
  return Boolean(getTeam(tenantId, teamId))
}

/** Membros do time — derivado de `user.teamId` (fonte única). */
export function countMembers(tenantId: string, teamId: string): number {
  return usersDb.users.filter(user => user.tenantId === tenantId && user.teamId === teamId).length
}

/** Projeção pública: sem `tenantId` + `memberCount` derivado. */
export function toTeamView(team: Team): TeamView {
  const { tenantId, ...rest } = team

  return { ...rest, memberCount: countMembers(tenantId, team.id) }
}



const normalizeName = (name: string) => name.trim().toLowerCase()

export function isTeamNameTaken(tenantId: string, name: string, ignoreTeamId?: string): boolean {
  return listTeams(tenantId).some(
    team => team.id !== ignoreTeamId && normalizeName(team.name) === normalizeName(name),
  )
}

/** `team-<slug>` (+ sufixo quando o slug colide) — o id é imutável. */
export function nextTeamId(name: string): string {
  const slug = normalizeName(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'team'

  const taken = new Set(db.teams.map(team => team.id))
  let candidate = `team-${slug}`
  let suffix = 2

  while (taken.has(candidate))
    candidate = `team-${slug}-${suffix++}`

  return candidate
}

export function createTeam(tenantId: string, payload: CreateTeamPayload): Team {
  const team: Team = {
    id: nextTeamId(payload.name),
    tenantId,
    name: payload.name.trim(),
    description: payload.description?.trim() || undefined,
    color: payload.color || undefined,
    createdAt: new Date().toISOString(),
  }

  db.teams.push(team)

  return team
}

/** Atualização PARCIAL — `undefined` quando o time não é do tenant. */
export function updateTeam(
  tenantId: string,
  teamId: string,
  payload: UpdateTeamPayload,
): Team | undefined {
  const team = getTeam(tenantId, teamId)

  if (!team)
    return undefined

  if (payload.name !== undefined)
    team.name = payload.name.trim()
  if (payload.description !== undefined)
    team.description = payload.description.trim() || undefined
  if (payload.color !== undefined)
    team.color = payload.color || undefined

  return team
}

/** Remove o time + CASCATA nos membros. `false` quando não é do tenant. */
export function removeTeam(tenantId: string, teamId: string): boolean {
  const index = db.teams.findIndex(team => team.tenantId === tenantId && team.id === teamId)

  if (index === -1)
    return false

  db.teams.splice(index, 1)

  for (const user of usersDb.users) {
    if (user.tenantId === tenantId && user.teamId === teamId)
      user.teamId = null
  }

  return true
}
