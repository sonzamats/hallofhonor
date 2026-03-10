export function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Unknown';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatYear(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).getFullYear().toString();
  } catch {
    return '';
  }
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '...';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function findDramaticSentence(citation: string): string | null {
  const actionVerbs = /charged|destroyed|single-handedly|despite|under fire|gallantly|heroically|fearlessly|voluntarily|disregarding|braving|exposing|rushing|eliminated|neutralized|rescued|saved|killed|wounded|engaged|assaulted|stormed|seized|defended|withstood|repelled/i;
  const sentences = citation.match(/[^.!]+[.!]+/g) ?? [];
  const dramatic = sentences
    .filter((s) => actionVerbs.test(s))
    .sort((a, b) => b.length - a.length);
  return dramatic[0]?.trim() ?? null;
}

export function generatePatternSeed(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Fetch all rows from a Supabase query by paginating through results.
 * Supabase/PostgREST may cap responses at db_max_rows (default 1000),
 * so this fetches in batches using .range() to get everything.
 */
export async function fetchAllRows<T>(
  buildQuery: () => { range: (from: number, to: number) => Promise<{ data: T[] | null; error: any }> },
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await buildQuery().range(offset, offset + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  return all;
}

const STATE_CODE_TO_NAME: Record<string, string> = {
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
  DC: 'District of Columbia', PR: 'Puerto Rico', GU: 'Guam', AS: 'American Samoa', VI: 'U.S. Virgin Islands',
};

const STATE_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_CODE_TO_NAME).map(([code, name]) => [name.toLowerCase(), code])
);

const VALID_STATE_CODES = new Set(Object.keys(STATE_CODE_TO_NAME));

export function stateCodeToName(code: string): string {
  return STATE_CODE_TO_NAME[code] ?? code;
}

/**
 * Extract a 2-letter state code from a location string.
 * Handles: "CA", "California", "San Francisco, California",
 * "Terre Haute, Vigo County, Indiana", etc.
 */
export function extractStateCode(location: string | null): string | null {
  if (!location) return null;
  const trimmed = location.trim();

  // Already a 2-letter code
  if (trimmed.length === 2) {
    const upper = trimmed.toUpperCase();
    if (VALID_STATE_CODES.has(upper)) return upper;
  }

  const lower = trimmed.toLowerCase();

  // Try matching parts from right to left (most specific last)
  const parts = lower.split(',').map((p) => p.trim());
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i]
      .replace(/,?\s*(united states|usa|u\.s\.a\.)$/i, '')
      .trim();
    // Check full state name match
    if (STATE_NAME_TO_CODE[part]) return STATE_NAME_TO_CODE[part];
    // Check if it's a 2-letter code
    if (part.length === 2) {
      const upper = part.toUpperCase();
      if (VALID_STATE_CODES.has(upper)) return upper;
    }
  }

  // Fallback: search for any state name anywhere in the string
  for (const [name, code] of Object.entries(STATE_NAME_TO_CODE)) {
    if (lower.includes(name)) return code;
  }

  // Special case: Hawaiian island names and counties
  const hawaiianKeywords = ['honolulu', 'oahu', 'maui', 'kauai', 'kona', 'hilo', 'waialua', 'pearl harbor'];
  for (const kw of hawaiianKeywords) {
    if (lower.includes(kw)) return 'HI';
  }

  return null;
}
