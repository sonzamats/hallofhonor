#!/usr/bin/env node
/**
 * Supabase database seeder (Node.js version).
 *
 * Reads data/awards_seed.json and data/master_recipients.json,
 * transforms the data, and upserts into Supabase.
 *
 * Usage:
 *   node scripts/seed.mjs
 *   node scripts/seed.mjs --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = resolve(ROOT, '.env.local');
  if (!existsSync(envPath)) {
    console.error('.env.local not found');
    process.exit(1);
  }
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local');
  process.exit(1);
}

const DRY_RUN = process.argv.includes('--dry-run');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------------------------------------------------------------------
// US State name -> abbreviation mapping
// ---------------------------------------------------------------------------
const STATE_ABBREVS = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN',
  'mississippi': 'MS', 'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE',
  'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC',
  'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK', 'oregon': 'OR',
  'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA',
  'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
  'district of columbia': 'DC', 'puerto rico': 'PR', 'guam': 'GU',
  'american samoa': 'AS', 'u.s. virgin islands': 'VI',
};

function extractStateCode(location) {
  if (!location) return null;
  const lower = location.toLowerCase().trim();

  // Already a 2-letter code
  if (/^[a-z]{2}$/i.test(location.trim())) {
    const upper = location.trim().toUpperCase();
    if (Object.values(STATE_ABBREVS).includes(upper)) return upper;
  }

  // Try matching state name at the end: "City, County, StateName"
  const parts = lower.split(',').map(p => p.trim());
  for (let i = parts.length - 1; i >= 0; i--) {
    // Remove "united states" or "usa" from last part
    let part = parts[i].replace(/,?\s*(united states|usa|u\.s\.a\.)$/i, '').trim();
    if (STATE_ABBREVS[part]) return STATE_ABBREVS[part];
    // Check if it's already a 2-letter code
    if (part.length === 2) {
      const upper = part.toUpperCase();
      if (Object.values(STATE_ABBREVS).includes(upper)) return upper;
    }
  }

  // Fallback: search for any state name in the string
  for (const [name, code] of Object.entries(STATE_ABBREVS)) {
    if (lower.includes(name)) return code;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Conflict name -> slug mapping
// ---------------------------------------------------------------------------
const CONFLICT_MAP = {
  'civil war': 'civil-war',
  'u.s. civil war': 'civil-war',
  'american civil war': 'civil-war',
  'indian wars': 'indian-wars',
  'indian campaigns': 'indian-wars',
  'spanish-american war': 'spanish-american-war',
  'spanish american war': 'spanish-american-war',
  'boxer rebellion': 'boxer-rebellion',
  'philippine insurrection': 'philippine-insurrection',
  'philippine-american war': 'philippine-insurrection',
  'banana wars': 'banana-wars',
  'mexican campaign': 'mexican-campaign',
  'haiti 1915': 'haiti-1915',
  'world war i': 'world-war-i',
  'world war 1': 'world-war-i',
  'wwi': 'world-war-i',
  'interim 1920-1940': 'interim-1920-1940',
  'peacetime': 'peacetime',
  'world war ii': 'world-war-ii',
  'world war 2': 'world-war-ii',
  'wwii': 'world-war-ii',
  'korean war': 'korean-war',
  'korea': 'korean-war',
  'vietnam war': 'vietnam-war',
  'vietnam': 'vietnam-war',
  'gulf war': 'gulf-war',
  'persian gulf war': 'gulf-war',
  'iraq': 'iraq',
  'iraq war': 'iraq',
  'operation iraqi freedom': 'iraq',
  'afghanistan': 'afghanistan',
  'war in afghanistan': 'afghanistan',
  'operation enduring freedom': 'afghanistan',
  'global war on terror': 'global-war-on-terror',
  'war on terrorism': 'global-war-on-terror',
  'somalia': 'somalia',
  'war on terror': 'global-war-on-terror',
};

function normalizeConflict(conflict) {
  if (!conflict) return null;
  const lower = conflict.toLowerCase().trim();
  return CONFLICT_MAP[lower] || slugify(conflict);
}

// ---------------------------------------------------------------------------
// Branch normalization
// ---------------------------------------------------------------------------
function normalizeBranch(branch) {
  if (!branch) return null;
  const lower = branch.toLowerCase().trim();
  if (lower.includes('marine')) return 'Marine Corps';
  if (lower.includes('navy')) return 'Navy';
  if (lower.includes('air force')) return 'Air Force';
  if (lower.includes('coast guard')) return 'Coast Guard';
  if (lower.includes('space force')) return 'Space Force';
  if (lower.includes('army')) return 'Army';
  return branch.trim();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function slugify(text) {
  return text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const NAME_SUFFIXES = new Set(['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv', 'v']);

/**
 * Parse first and last name from a full name, handling suffixes like "Jr", "III".
 * e.g. "Frank Luke Jr" -> { first: "Frank", last: "Luke" }
 * e.g. "John Franklin Baker Jr" -> { first: "John", last: "Baker" }
 */
function parseNames(rec) {
  let first = rec.first_name || '';
  let last = rec.last_name || '';
  const fullName = rec.full_name || '';

  // If last_name is a suffix, re-parse from full_name
  if (NAME_SUFFIXES.has(last.toLowerCase().trim())) {
    const parts = fullName.split(/\s+/).filter(Boolean);
    // Remove suffix parts from the end
    while (parts.length > 1 && NAME_SUFFIXES.has(parts[parts.length - 1].toLowerCase().replace('.', ''))) {
      parts.pop();
    }
    if (parts.length >= 2) {
      first = parts[0];
      last = parts[parts.length - 1];
    } else if (parts.length === 1) {
      first = parts[0];
      last = 'Unknown';
    }
  }

  // Fallback to full_name parsing
  if (!first && fullName) first = fullName.split(' ')[0];
  if (!last && fullName) last = fullName.split(' ').slice(-1)[0];

  return {
    first_name: first || 'Unknown',
    last_name: last || 'Unknown',
  };
}

function parseDate(dateStr) {
  if (!dateStr || !dateStr.trim()) return null;
  const s = dateStr.trim();

  // ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // "Month DD, YYYY"
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return null;
}

function loadJSON(filename) {
  const path = resolve(ROOT, 'data', filename);
  if (!existsSync(path)) {
    console.error(`File not found: ${path}`);
    return [];
  }
  return JSON.parse(readFileSync(path, 'utf-8'));
}

// ---------------------------------------------------------------------------
// Seed awards
// ---------------------------------------------------------------------------
async function seedAwards(awardsData) {
  console.log(`\nSeeding ${awardsData.length} awards...`);
  const slugToId = {};

  for (const award of awardsData) {
    const row = {
      slug: award.slug,
      name: award.name,
      short_name: award.short_name || null,
      precedence_rank: award.precedence_rank || null,
      description: award.description || null,
      established_year: award.established_year || null,
      color_hex: award.color_hex || null,
      branch_variants: award.branch_variants || null,
    };

    if (DRY_RUN) {
      console.log(`  [DRY RUN] Would upsert award: ${row.slug}`);
      slugToId[row.slug] = `dry-${row.slug}`;
      continue;
    }

    const { data, error } = await supabase
      .from('awards')
      .upsert(row, { onConflict: 'slug' })
      .select('id, slug');

    if (error) {
      console.error(`  Error upserting award ${row.slug}:`, error.message);
    } else if (data && data[0]) {
      slugToId[data[0].slug] = data[0].id;
      process.stdout.write('.');
    }
  }
  console.log(`\n  Awards seeded: ${Object.keys(slugToId).length}`);
  return slugToId;
}

// ---------------------------------------------------------------------------
// Deduplicate source data
// ---------------------------------------------------------------------------
function deduplicateSourceData(recipients) {
  const seen = new Map();
  const unique = [];

  for (const rec of recipients) {
    // Build a dedup key from source_url (most reliable), falling back to
    // name + branch + conflict + date_of_action
    const sourceUrl = (rec.source_url || '').toLowerCase().trim();
    const first = (rec.first_name || rec.full_name?.split(' ')[0] || '').toLowerCase().trim();
    const last = (rec.last_name || rec.full_name?.split(' ').slice(-1)[0] || '').toLowerCase().trim();
    const branch = (rec.branch || '').toLowerCase().trim();
    const conflict = (rec.conflict || '').toLowerCase().trim();
    const dateAction = (rec.date_of_action || '').toLowerCase().trim();

    // Prefer source_url as dedup key (each CMOHS page is unique per recipient)
    const key = sourceUrl || `${first}|${last}|${branch}|${conflict}|${dateAction}`;

    if (!seen.has(key)) {
      seen.set(key, true);
      unique.push(rec);
    }
  }

  const removed = recipients.length - unique.length;
  if (removed > 0) {
    console.log(`  Deduplicated source data: removed ${removed} duplicates (${recipients.length} -> ${unique.length})`);
  }
  return unique;
}

// ---------------------------------------------------------------------------
// Clear existing data (for idempotent re-seeding)
// ---------------------------------------------------------------------------
async function clearExistingData() {
  if (DRY_RUN) {
    console.log('\n  [DRY RUN] Would clear recipient_awards and recipients tables');
    return;
  }

  console.log('\n  Clearing existing recipient_awards...');
  // Delete all recipient_awards links first (foreign key dependency)
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const { data } = await supabase
      .from('recipient_awards')
      .select('id')
      .range(offset, offset + PAGE - 1);
    if (!data || data.length === 0) break;
    const ids = data.map(r => r.id);
    const { error } = await supabase
      .from('recipient_awards')
      .delete()
      .in('id', ids);
    if (error) {
      console.error('  Error clearing recipient_awards:', error.message);
      break;
    }
    process.stdout.write('.');
  }

  console.log('\n  Clearing existing recipients...');
  while (true) {
    const { data } = await supabase
      .from('recipients')
      .select('id')
      .range(0, PAGE - 1);
    if (!data || data.length === 0) break;
    const ids = data.map(r => r.id);
    const { error } = await supabase
      .from('recipients')
      .delete()
      .in('id', ids);
    if (error) {
      console.error('  Error clearing recipients:', error.message);
      break;
    }
    process.stdout.write('.');
  }
  console.log('\n  Tables cleared.');
}

// ---------------------------------------------------------------------------
// Seed recipients
// ---------------------------------------------------------------------------
async function seedRecipients(recipients) {
  // Filter out scraping artifacts (e.g., nav text captured as records)
  recipients = recipients.filter(r => r.full_name && !r.full_name.includes('Questions?'));

  // Deduplicate source data before inserting
  recipients = deduplicateSourceData(recipients);

  console.log(`\nSeeding ${recipients.length} recipients...`);
  const BATCH = 50;
  let inserted = 0;
  let errors = 0;
  const dbRecipients = [];

  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH);
    const rows = batch.map(rec => {
      const stateCode = extractStateCode(rec.entered_service_state);
      const { first_name, last_name } = parseNames(rec);
      return {
        first_name,
        last_name,
        rank: rec.rank || null,
        branch: normalizeBranch(rec.branch),
        conflict: normalizeConflict(rec.conflict),
        entered_service_state: stateCode,
        date_of_action: parseDate(rec.date_of_action),
        date_awarded: parseDate(rec.date_awarded),
        date_of_birth: parseDate(rec.date_of_birth),
        date_of_death: parseDate(rec.date_of_death),
        posthumous: rec.posthumous === true,
        pow: rec.pow === true,
        citation: rec.citation || null,
        photo_url: rec.photo_url || null,
        action_location_name: rec.action_location_name || null,
        birth_city: rec.birth_location?.split(',')[0]?.trim() || null,
        birth_state: rec.birth_location ? extractStateCode(rec.birth_location) : null,
        birth_country: rec.birth_location?.includes('United States') ? 'US' : null,
      };
    });

    if (DRY_RUN) {
      rows.forEach(r => dbRecipients.push({ ...r, full_name: `${r.first_name} ${r.last_name}`, id: `dry-${slugify(r.first_name + ' ' + r.last_name)}` }));
      inserted += rows.length;
      continue;
    }

    const { data, error } = await supabase
      .from('recipients')
      .insert(rows)
      .select('id, full_name, branch');

    if (error) {
      errors += rows.length;
      console.error(`\n  Error inserting batch ${i}-${i + BATCH}:`, error.message);
    } else if (data) {
      dbRecipients.push(...data);
      inserted += data.length;
      process.stdout.write('.');
    }
  }

  console.log(`\n  Recipients inserted: ${inserted}, errors: ${errors}`);
  return { dbRecipients, originalRecipients: recipients };
}

// ---------------------------------------------------------------------------
// Link recipient_awards
// ---------------------------------------------------------------------------
async function linkAwards(slugToId, dbRecipients, originalRecipients) {
  console.log(`\nLinking recipient awards...`);

  // Use positional matching: dbRecipients[i] corresponds to originalRecipients[i]
  // since they were inserted in the same order.  Fall back to name matching
  // if the arrays differ in length.
  const usePositional = dbRecipients.length === originalRecipients.length;

  // Build name lookup as fallback (using first_name+last_name to match DB full_name)
  const nameLookup = new Map();
  for (const r of dbRecipients) {
    const key = `${(r.full_name || '').toLowerCase()}|${(r.branch || '').toLowerCase()}`;
    nameLookup.set(key, r.id);
  }

  const rows = [];
  for (let idx = 0; idx < originalRecipients.length; idx++) {
    const rec = originalRecipients[idx];

    // Try positional match first (most reliable)
    let recipientId = usePositional ? dbRecipients[idx]?.id : null;

    // Fall back to name matching
    if (!recipientId) {
      const branch = normalizeBranch(rec.branch);
      // Try original full_name
      let key = `${(rec.full_name || '').toLowerCase()}|${(branch || '').toLowerCase()}`;
      recipientId = nameLookup.get(key);
      // Try first+last as DB may generate full_name that way
      if (!recipientId) {
        const first = rec.first_name || (rec.full_name || '').split(' ')[0] || '';
        const last = rec.last_name || (rec.full_name || '').split(' ').slice(-1)[0] || '';
        key = `${first.toLowerCase()} ${last.toLowerCase()}|${(branch || '').toLowerCase()}`;
        recipientId = nameLookup.get(key);
      }
    }

    if (!recipientId) continue;

    for (const awardName of (rec.awards || [])) {
      const slug = slugify(awardName);
      const awardId = slugToId[slug];
      if (!awardId) continue;
      rows.push({ recipient_id: recipientId, award_id: awardId });
    }
  }

  console.log(`  Total links to create: ${rows.length}`);

  if (DRY_RUN || rows.length === 0) return;

  const BATCH = 100;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { data, error } = await supabase
      .from('recipient_awards')
      .insert(batch)
      .select('id');

    if (error) {
      errors += batch.length;
      console.error(`\n  Error linking batch ${i}:`, error.message);
    } else {
      inserted += data?.length || 0;
      process.stdout.write('.');
    }
  }

  console.log(`\n  Links created: ${inserted}, errors: ${errors}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('='.repeat(60));
  console.log('HALL OF VALOR — Database Seeder');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log('='.repeat(60));

  const awardsData = loadJSON('awards_seed.json');
  const recipientsData = loadJSON('master_recipients.json');

  console.log(`Loaded ${awardsData.length} awards, ${recipientsData.length} recipients`);

  // 0. Clear existing data for idempotent re-seeding
  await clearExistingData();

  // 1. Seed awards
  const slugToId = await seedAwards(awardsData);

  // 2. Seed recipients
  const { dbRecipients, originalRecipients } = await seedRecipients(recipientsData);

  // 3. Link awards
  await linkAwards(slugToId, dbRecipients, originalRecipients);

  console.log('\n' + '='.repeat(60));
  console.log('DONE');
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
