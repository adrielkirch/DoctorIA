export interface ProfileChip {
  title: string
  color: string
}

export interface ProfileTabCommon {
  icon: string
  value: string
  property: string
}
export type ProfileTeams = ProfileTabCommon & { color: string }

export interface ProfileAvatarGroup {
  name: string
  avatar: string
}

export interface ProfileTeamsTech {
  title: string
  avatar: string
  members: number
  chipText: string
  ChipColor: string
}

export interface ProfileTab {
  teams: ProfileTeams[]
  about: ProfileTabCommon[]
  contacts: ProfileTabCommon[]
  overview: ProfileTabCommon[]
  teamsTech: ProfileTeamsTech[]
}

export interface ProfileHeader {
  fullName: string
  coverImg: string
  location: string
  profileImg: string
  joiningDate: string
  designation: string
  designationIcon?: string
}

export interface TeamsTab {
  title: string
  avatar: string
  description: string
  extraMembers: number
  chips: ProfileChip[]
  avatarGroup: ProfileAvatarGroup[]
}
