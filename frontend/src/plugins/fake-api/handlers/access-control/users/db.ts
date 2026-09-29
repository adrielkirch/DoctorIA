import type { UserProperties } from 'contracts/access-control/users/types'


interface DB {
  users: UserProperties[]
}

const baseUsers = [
  {
    id: 1,
    fullName: 'Galasasen Slixby',
      company: 'Yotz PVT LTD',
      role: 'editor',
      username: 'gslixby0',
      country: 'El Salvador',
      contact: '(479) 232-9151',
      email: 'gslixby0@abc.net.au',
      currentPlan: 'enterprise',
      status: 'inactive',
      avatar: '',
      billing: 'Manual-Credit Card',
    },
    {
      id: 2,
      fullName: 'Halsey Redmore',
      company: 'Skinder PVT LTD',
      role: 'author',
      username: 'hredmore1',
      country: 'Albania',
      contact: '(472) 607-9137',
      email: 'hredmore1@imgur.com',
      currentPlan: 'team',
      status: 'pending',
      avatar: '',
      billing: 'Auto debit',
    },
    {
      id: 3,
      fullName: 'Marjory Sicely',
      company: 'Oozz PVT LTD',
      role: 'maintainer',
      username: 'msicely2',
      country: 'Russia',
      contact: '(321) 264-4599',
      email: 'msicely2@who.int',
      currentPlan: 'enterprise',
      status: 'active',
        avatar: '',
        billing: 'Manual-Credit Card',
    },
    {
      id: 4,
      fullName: 'Cyrill Risby',
      company: 'Oozz PVT LTD',
      role: 'maintainer',
      username: 'crisby3',
      country: 'China',
      contact: '(923) 690-6806',
      email: 'crisby3@wordpress.com',
      currentPlan: 'team',
      status: 'inactive',
      avatar: '',
      billing: 'Auto debit',
    },
    {
      id: 5,
      fullName: 'Maggy Hurran',
      company: 'Aimbo PVT LTD',
      role: 'subscriber',
      username: 'mhurran4',
      country: 'Pakistan',
      contact: '(669) 914-1078',
      email: 'mhurran4@yahoo.co.jp',
      currentPlan: 'enterprise',
      status: 'pending',
      avatar: '',
      billing: 'Manual-Cash',
    },
    {
      id: 6,
      fullName: 'Silvain Halstead',
      company: 'Jaxbean PVT LTD',
      role: 'author',
      username: 'shalstead5',
      country: 'China',
      contact: '(958) 973-3093',
      email: 'shalstead5@shinystat.com',
      currentPlan: 'company',
      status: 'active',
      avatar: '',
      billing: 'Manual-Credit Card',
    },
    {
      id: 7,
      fullName: 'Breena Gallemore',
      company: 'Jazzy PVT LTD',
      role: 'subscriber',
      username: 'bgallemore6',
      country: 'Canada',
      contact: '(825) 977-8152',
      email: 'bgallemore6@boston.com',
      currentPlan: 'company',
      status: 'pending',
      avatar: '',
      billing: 'Manual-PayPal',
    },
    {
      id: 8,
      fullName: 'Kathryne Liger',
      company: 'Pixoboo PVT LTD',
      role: 'author',
      username: 'kliger7',
      country: 'France',
      contact: '(187) 440-0934',
      email: 'kliger7@vinaora.com',
      currentPlan: 'enterprise',
      status: 'pending',
      avatar: '',
      billing: 'Auto debit',
    },
    {
      id: 9,
      fullName: 'Franz Scotfurth',
      company: 'Tekfly PVT LTD',
      role: 'subscriber',
      username: 'fscotfurth8',
      country: 'China',
      contact: '(978) 146-5443',
      email: 'fscotfurth8@dailymotion.com',
      currentPlan: 'team',
      status: 'pending',
      avatar: '',
      billing: 'Manual-Credit Card',
    },
    {
      id: 10,
      fullName: 'Jillene Bellany',
      company: 'Gigashots PVT LTD',
      role: 'maintainer',
      username: 'jbellany9',
      country: 'Jamaica',
      contact: '(589) 284-6732',
      email: 'jbellany9@kickstarter.com',
      currentPlan: 'company',
      status: 'inactive',
      avatar: '',
      billing: 'Manual-Credit Card',
    },
] satisfies Omit<UserProperties, 'tenantId'>[]





const LEGACY_ROLE_TO_GLOBAL: Record<string, string> = {
  admin: 'admin',
  editor: 'member',
  author: 'member',
  maintainer: 'developer',
  subscriber: 'member',
}



const SEED_TEAM_IDS = ['team-support', 'team-sales', 'team-engineering'] as const






export const db: DB = {
  users: baseUsers.map(user => ({
    ...user,
    tenantId: 'workspace-alpha',
    role: LEGACY_ROLE_TO_GLOBAL[user.role] ?? user.role,
    teamId: user.id % 5 === 0 ? null : SEED_TEAM_IDS[user.id % SEED_TEAM_IDS.length],
  })),
}
