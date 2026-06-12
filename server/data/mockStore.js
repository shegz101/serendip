export const attendees = [
  {
    id: 'seed-1',
    name: 'Maya Chen',
    role: 'Engineer',
    company: 'Vercel',
    bio: 'Staff engineer, led auth infra for 3 years',
    intent: ['Share knowledge'],
    give: 'Deep expertise in auth systems at scale, happy to advise early-stage startups',
    need: 'Interesting problems to think about, potential angel investments',
    tag: '@mayachen',
  },
  {
    id: 'seed-2',
    name: 'James Okafor',
    role: 'Founder',
    company: 'AuthBase (stealth)',
    bio: 'Building developer auth infrastructure',
    intent: ['Get feedback', 'Find a co-founder'],
    give: 'Early access to AuthBase, technical collaboration',
    need: 'Someone who has done auth at scale and is open to advising',
    tag: '@jamesokafor',
  },
  {
    id: 'seed-3',
    name: 'Sarah Kim',
    role: 'Recruiter',
    company: 'Linear',
    bio: 'Head of engineering hiring at Linear',
    intent: ['Hiring'],
    give: 'Job opportunities at a fast-growing dev tools company',
    need: 'Senior React/TypeScript engineers with product taste',
    tag: '@sarahkim',
  },
  {
    id: 'seed-4',
    name: 'David Mensah',
    role: 'Engineer',
    company: 'Freelance',
    bio: '5 years React, looking for next role',
    intent: ['Job hunting'],
    give: 'Strong React + TypeScript skills, shipped 3 production apps',
    need: 'A senior role at a dev tools or infrastructure company',
    tag: '@davidmensah',
  },
  {
    id: 'seed-5',
    name: 'Priya Nair',
    role: 'VC',
    company: 'Seedcamp',
    bio: 'Seed investor focused on developer tools',
    intent: ['Meet potential customers'],
    give: 'Pre-seed / seed funding, European startup network',
    need: 'Developer tools founders raising their first round',
    tag: '@priyanair',
  },
];

export const matches = [];

export const feedback = [];

const LOCATIONS = [
  'Coffee bar, 2nd floor',
  'Networking lounge, main hall',
  'Outdoor terrace',
  'Quiet zone, 3rd floor',
  'Sponsor lounge',
];

const TIMES = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

export function randomSlot() {
  const time = TIMES[Math.floor(Math.random() * TIMES.length)];
  const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
  return { time, location };
}
