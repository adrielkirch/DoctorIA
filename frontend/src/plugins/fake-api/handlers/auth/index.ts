import { buildAbilityRulesForRole, tenantRoleToGlobalRole } from '@db/access-control/roles/db'
import { db } from '@db/auth/db'
import { membershipsByUserId, tenants } from '@db/tenant/db'
import type { User, UserOut } from 'contracts/auth/types'
import type { Tenant } from 'contracts/types/tenant'
import type { PathParams } from 'msw'
import { HttpResponse, http } from 'msw'

/**
 * Abilities CASL PROVISÓRIAS do login (Parte 2/3 — role é tenant-scoped).
 *
 * Antes de escolher um tenant NÃO existe role global: uma pessoa pode ser
 * `client` hoje e virar `owner` do próprio workspace amanhã. Por isso as
 * abilities do login são a **união das memberships** (owner/admin em qualquer
 * workspace → manage all; senão → mínimo privilégio). O valor definitivo é
 * calculado por tenant no `my-access` (store sincroniza ao carregar).
 */
function abilityRulesFor(user: User): UserOut['userAbilityRules'] {
  const membershipRoles = membershipsByUserId[String(user.id)]?.map(m => m.role) ?? []




  const globalRoleId = membershipRoles.length
    ? tenantRoleToGlobalRole(membershipRoles[0])
    : 'member'

  return buildAbilityRulesForRole(globalRoleId)
}

/**
 * Gera um access token fake para usuários criados em runtime (o db seed só
 * cobre os ids 1..10). O app não valida o token — apenas a sua existência.
 */
function generateAccessToken(userId: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify({ id: userId }))

  return `${header}.${payload}.msw-fake-signature`
}

/**
 * Retorna o access token seedado do usuário.
 * ⚠️ `db.userTokens` é um array 0-INDEXADO (index 0 = id 1). Usamos `userId - 1`
 * — sem isso, `getAccessToken(1)` devolve o token do id 2 (client) e o admin
 * autentica como CLIENT no my-access/gateway (nav vazia, permissões erradas).
 */
function getAccessToken(userId: number): string {
  return db.userTokens[userId - 1] ?? generateAccessToken(userId)
}

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function toUserOut(user: User): UserOut['userData'] {
  return Object.fromEntries(
    Object.entries({ ...user })
      .filter(([key, _]) => !(key === 'password' || key === 'abilityRules' || key === 'role')),
  ) as UserOut['userData']
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/


const RESET_PASSWORD_TOKEN = 'demo-reset-token'


export const handlerAuth = [

  http.post<PathParams>(('*/api/auth/login'), async ({ request }) => {
    const { email, password } = await request.json() as { email: string; password: string }

    let errors: Record<string, string[]> = {
      email: ['Something went wrong'],
    }

    const user = db.users.find(u => u.email === email && u.password === password)

    if (user) {
      try {

        const userData = { ...user }

        const response: UserOut = {
          userAbilityRules: abilityRulesFor(userData),
          accessToken: getAccessToken(user.id),
          userData: toUserOut(userData),
          memberships: membershipsByUserId[String(user.id)] ?? [],


          currentTenantId: '',
        }

        return HttpResponse.json(response,
          { status: 200 })
      }
      catch (e: unknown) {
        errors = { email: [e as string] }
      }
    }
    else {
      errors = { email: ['Invalid email or password'] }
    }

    return HttpResponse.json({ errors }, { status: 400 })
  }),

  http.post<PathParams>(('*/api/auth/register'), async ({ request }) => {
    const body = await request.json() as {
      username?: string
      email?: string
      password?: string
      fullName?: string
    }

    const username = body.username?.trim() ?? ''
    const email = body.email?.trim() ?? ''
    const password = body.password ?? ''

    const errors: Record<string, string[]> = {}

    if (!username)
      errors.username = ['Username is required']

    if (!email)
      errors.email = ['Email is required']

    else if (db.users.some(u => u.email === email))
      errors.email = ['Email already exists']

    if (!password)
      errors.password = ['Password is required']

    else if (password.length < 6)
      errors.password = ['Password must be at least 6 characters']

    if (Object.keys(errors).length > 0)
      return HttpResponse.json({ errors }, { status: 400 })

    const newId = Math.max(...db.users.map(u => u.id), 0) + 1

    const user: User = {
      id: newId,
      fullName: body.fullName?.trim() || username,
      username,
      password,
      email,
      role: 'admin',
      abilityRules: [{ action: 'manage', subject: 'all' }],
    }

    db.users.push(user)



    const slug = normalizeSlug(username) || `user-${newId}`

    const tenant: Tenant = {
      id: `workspace-${slug}`,
      name: `${username}'s workspace`,
      slug,
      plan: 'free',
      createdAt: new Date().toISOString(),
    }

    tenants.push(tenant)
    membershipsByUserId[String(newId)] = [{ tenantId: tenant.id, role: 'owner', tenant }]

    const response: UserOut = {
      userAbilityRules: abilityRulesFor(user),
      accessToken: getAccessToken(user.id),
      userData: toUserOut(user),
      memberships: membershipsByUserId[String(user.id)] ?? [],
      currentTenantId: '',
    }

    return HttpResponse.json(response, { status: 201 })
  }),

  http.post<PathParams>('*/api/auth/forgot-password', async ({ request }) => {
    const { email } = await request.json() as { email?: string }

    const errors: Record<string, string[]> = {}

    if (!email?.trim())
      errors.email = ['Email is required']

    else if (!EMAIL_REGEX.test(email.trim()))
      errors.email = ['Enter a valid email address']

    if (Object.keys(errors).length > 0)
      return HttpResponse.json({ errors }, { status: 400 })



    return HttpResponse.json({
      message: 'We sent a password reset link to your email if an account exists.',
    }, { status: 200 })
  }),

  http.post<PathParams>('*/api/auth/reset-password', async ({ request }) => {
    const body = await request.json() as {
      email?: string
      token?: string
      password?: string
    }

    const errors: Record<string, string[]> = {}

    if (!body.token)
      errors.token = ['Reset token is required']

    else if (body.token !== RESET_PASSWORD_TOKEN)
      errors.token = ['Invalid or expired reset token']

    if (!body.password)
      errors.password = ['Password is required']

    else if (body.password.length < 6)
      errors.password = ['Password must be at least 6 characters']

    if (Object.keys(errors).length > 0)
      return HttpResponse.json({ errors }, { status: 400 })


    if (body.email?.trim()) {
      const user = db.users.find(u => u.email === body.email!.trim())
      if (user)
        user.password = body.password!
    }

    return HttpResponse.json({
      message: 'Your password has been reset. Please sign in with your new password.',
    }, { status: 200 })
  }),

  http.post<PathParams>('*/api/auth/two-step-verification', async ({ request }) => {
    const { email, code } = await request.json() as { email?: string; code?: string }

    const errors: Record<string, string[]> = {}

    if (!email?.trim())
      errors.email = ['Email is required']

    else if (!db.users.some(u => u.email === email.trim()))
      errors.email = ['No account found with this email']

    if (!code?.trim())
      errors.code = ['Verification code is required']

    else if (code.trim() !== db.twoFactorCode)
      errors.code = ['Invalid verification code']

    if (Object.keys(errors).length > 0)
      return HttpResponse.json({ errors }, { status: 400 })

    const user = db.users.find(u => u.email === email!.trim())!

    const response: UserOut = {
      userAbilityRules: abilityRulesFor(user),
      accessToken: getAccessToken(user.id),
      userData: toUserOut(user),
      memberships: membershipsByUserId[String(user.id)] ?? [],
      currentTenantId: '',
    }

    return HttpResponse.json(response, { status: 200 })
  }),
]
