export interface AwardConfig {
  slug: string;
  name: string;
  shortName: string;
  precedenceRank: number;
  colorHex: string;
  establishedYear: number;
  branchVariants: string[];
  description: string;
  emotionalRegister: 'transcendent' | 'solemn' | 'heroic' | 'distinguished' | 'steadfast';
}

export const AWARDS: AwardConfig[] = [
  {
    slug: 'medal-of-honor',
    name: 'Medal of Honor',
    shortName: 'MOH',
    precedenceRank: 1,
    colorHex: '#C9A84C',
    establishedYear: 1861,
    branchVariants: ['Army', 'Navy', 'Marine Corps', 'Air Force', 'Coast Guard'],
    description: 'The highest military decoration, awarded for conspicuous gallantry and intrepidity at the risk of life above and beyond the call of duty.',
    emotionalRegister: 'transcendent',
  },
  {
    slug: 'distinguished-service-cross',
    name: 'Distinguished Service Cross',
    shortName: 'DSC',
    precedenceRank: 2,
    colorHex: '#4A90D9',
    establishedYear: 1918,
    branchVariants: ['Army'],
    description: 'The second-highest military decoration of the U.S. Army, awarded for extraordinary heroism in combat.',
    emotionalRegister: 'heroic',
  },
  {
    slug: 'navy-cross',
    name: 'Navy Cross',
    shortName: 'NC',
    precedenceRank: 3,
    colorHex: '#1B4F8A',
    establishedYear: 1919,
    branchVariants: ['Navy', 'Marine Corps'],
    description: 'The second-highest military decoration of the U.S. Navy and Marine Corps, for extraordinary heroism in combat.',
    emotionalRegister: 'heroic',
  },
  {
    slug: 'air-force-cross',
    name: 'Air Force Cross',
    shortName: 'AFC',
    precedenceRank: 4,
    colorHex: '#5B8DB8',
    establishedYear: 1960,
    branchVariants: ['Air Force'],
    description: 'The second-highest military decoration of the U.S. Air Force, for extraordinary heroism in combat.',
    emotionalRegister: 'heroic',
  },
  {
    slug: 'coast-guard-cross',
    name: 'Coast Guard Cross',
    shortName: 'CGC',
    precedenceRank: 5,
    colorHex: '#003F87',
    establishedYear: 2003,
    branchVariants: ['Coast Guard'],
    description: 'The second-highest military decoration of the U.S. Coast Guard, for extraordinary heroism in combat.',
    emotionalRegister: 'heroic',
  },
  {
    slug: 'silver-star',
    name: 'Silver Star',
    shortName: 'SS',
    precedenceRank: 6,
    colorHex: '#A8A8A8',
    establishedYear: 1918,
    branchVariants: ['Army', 'Navy', 'Marine Corps', 'Air Force', 'Coast Guard'],
    description: 'Awarded for gallantry in action against an enemy of the United States.',
    emotionalRegister: 'heroic',
  },
  {
    slug: 'legion-of-merit',
    name: 'Legion of Merit',
    shortName: 'LOM',
    precedenceRank: 7,
    colorHex: '#8B0000',
    establishedYear: 1942,
    branchVariants: ['Army', 'Navy', 'Marine Corps', 'Air Force', 'Coast Guard'],
    description: 'Awarded for exceptionally meritorious conduct in the performance of outstanding services.',
    emotionalRegister: 'distinguished',
  },
  {
    slug: 'distinguished-flying-cross',
    name: 'Distinguished Flying Cross',
    shortName: 'DFC',
    precedenceRank: 8,
    colorHex: '#7B9EA6',
    establishedYear: 1926,
    branchVariants: ['Army', 'Navy', 'Marine Corps', 'Air Force', 'Coast Guard'],
    description: 'Awarded for heroism or extraordinary achievement while participating in aerial flight.',
    emotionalRegister: 'heroic',
  },
  {
    slug: 'bronze-star',
    name: 'Bronze Star Medal',
    shortName: 'BSM',
    precedenceRank: 11,
    colorHex: '#CD7F32',
    establishedYear: 1944,
    branchVariants: ['Army', 'Navy', 'Marine Corps', 'Air Force', 'Coast Guard'],
    description: 'Awarded for heroic or meritorious achievement or service in a combat zone.',
    emotionalRegister: 'steadfast',
  },
  {
    slug: 'purple-heart',
    name: 'Purple Heart',
    shortName: 'PH',
    precedenceRank: 12,
    colorHex: '#6A0DAD',
    establishedYear: 1782,
    branchVariants: ['Army', 'Navy', 'Marine Corps', 'Air Force', 'Coast Guard', 'Space Force'],
    description: 'Awarded to those wounded or killed while serving in the U.S. military. The oldest military decoration still in use.',
    emotionalRegister: 'solemn',
  },
  {
    slug: 'pow-medal',
    name: 'Prisoner of War Medal',
    shortName: 'POW',
    precedenceRank: 14,
    colorHex: '#8B6914',
    establishedYear: 1985,
    branchVariants: ['Army', 'Navy', 'Marine Corps', 'Air Force', 'Coast Guard'],
    description: 'Awarded to any member of the U.S. Armed Forces taken prisoner of war during any armed conflict.',
    emotionalRegister: 'solemn',
  },
];

export const AWARD_BY_SLUG: Record<string, AwardConfig> = {};
AWARDS.forEach((a) => { AWARD_BY_SLUG[a.slug] = a; });

export const CONFLICTS = [
  { slug: 'civil-war', name: 'Civil War', dateRange: '1861–1865' },
  { slug: 'spanish-american-war', name: 'Spanish-American War', dateRange: '1898' },
  { slug: 'world-war-i', name: 'World War I', dateRange: '1917–1918' },
  { slug: 'world-war-ii', name: 'World War II', dateRange: '1941–1945' },
  { slug: 'korean-war', name: 'Korean War', dateRange: '1950–1953' },
  { slug: 'vietnam-war', name: 'Vietnam War', dateRange: '1955–1975' },
  { slug: 'gulf-war', name: 'Gulf War', dateRange: '1990–1991' },
  { slug: 'iraq', name: 'Iraq War', dateRange: '2003–2011' },
  { slug: 'afghanistan', name: 'War in Afghanistan', dateRange: '2001–2021' },
  { slug: 'global-war-on-terror', name: 'Global War on Terror', dateRange: '2001–Present' },
];

export const BRANCHES = [
  'Army',
  'Navy',
  'Marine Corps',
  'Air Force',
  'Coast Guard',
  'Space Force',
] as const;

export const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia', PR: 'Puerto Rico', GU: 'Guam', VI: 'U.S. Virgin Islands',
  AS: 'American Samoa',
};

export function getAwardColor(slug: string): string {
  return AWARD_BY_SLUG[slug]?.colorHex ?? '#8a9bb5';
}

export function getAwardByPrecedence(): AwardConfig[] {
  return [...AWARDS].sort((a, b) => a.precedenceRank - b.precedenceRank);
}
