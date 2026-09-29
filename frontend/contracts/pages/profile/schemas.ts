import { z } from 'zod'
import { Expect, IsEqual, IsMutuallyAssignable } from '../../_parity'
import type {
  ProfileAvatarGroup,
  ProfileChip,
  ProfileHeader,
  ProfileTab,
  ProfileTabCommon,
  ProfileTeams,
  ProfileTeamsTech,
  TeamsTab,
} from './types'

export const profileChipSchema = z.object({
  title: z.string(),
  color: z.string(),
})

export const profileTabCommonSchema = z.object({
  icon: z.string(),
  value: z.string(),
  property: z.string(),
})

export const profileTeamsSchema = profileTabCommonSchema.extend({ color: z.string() })

export const profileAvatarGroupSchema = z.object({
  name: z.string(),
  avatar: z.string(),
})

export const profileTeamsTechSchema = z.object({
  title: z.string(),
  avatar: z.string(),
  members: z.number(),
  chipText: z.string(),
  ChipColor: z.string(),
})

export const profileTabSchema = z.object({
  teams: z.array(profileTeamsSchema),
  about: z.array(profileTabCommonSchema),
  contacts: z.array(profileTabCommonSchema),
  overview: z.array(profileTabCommonSchema),
  teamsTech: z.array(profileTeamsTechSchema),
})

export const profileHeaderSchema = z.object({
  fullName: z.string(),
  coverImg: z.string(),
  location: z.string(),
  profileImg: z.string(),
  joiningDate: z.string(),
  designation: z.string(),
  designationIcon: z.string().optional(),
})

export const teamsTabSchema = z.object({
  title: z.string(),
  avatar: z.string(),
  description: z.string(),
  extraMembers: z.number(),
  chips: z.array(profileChipSchema),
  avatarGroup: z.array(profileAvatarGroupSchema),
})

type _PR1 = Expect<IsEqual<z.infer<typeof profileChipSchema>, ProfileChip>>
type _PR2 = Expect<IsEqual<z.infer<typeof profileTabCommonSchema>, ProfileTabCommon>>
type _PR3 = Expect<IsMutuallyAssignable<z.infer<typeof profileTeamsSchema>, ProfileTeams>>
type _PR4 = Expect<IsEqual<z.infer<typeof profileAvatarGroupSchema>, ProfileAvatarGroup>>
type _PR5 = Expect<IsEqual<z.infer<typeof profileTeamsTechSchema>, ProfileTeamsTech>>
type _PR6 = Expect<IsMutuallyAssignable<z.infer<typeof profileTabSchema>, ProfileTab>>
type _PR7 = Expect<IsEqual<z.infer<typeof profileHeaderSchema>, ProfileHeader>>
type _PR8 = Expect<IsEqual<z.infer<typeof teamsTabSchema>, TeamsTab>>
