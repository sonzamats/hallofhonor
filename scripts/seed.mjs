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
// Seed recipients
// ---------------------------------------------------------------------------
async function seedRecipients(recipients) {
  console.log(`\nSeeding ${recipients.length} recipients...`);
  const BATCH = 50;
  let inserted = 0;
  let errors = 0;
  const dbRecipients = [];

  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH);
    const rows = batch.map(rec => {
      const stateCode = extractStateCode(rec.entered_service_state);
      return {
        first_name: rec.first_name || rec.full_name?.split(' ')[0] || 'Unknown',
        last_name: rec.last_name || rec.full_name?.split(' ').slice(-1)[0] || 'Unknown',
        full_name: rec.full_name || `${rec.first_name || ''} ${rec.last_name || ''}`.trim(),
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
      rows.forEach(r => dbRecipients.push({ ...r, id: `dry-${slugify(r.full_name)}` }));
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

  // Build lookup: (full_name_lower, branch_lower) -> db id
  const nameLookup = new Map();
  for (const r of dbRecipients) {
    const key = `${(r.full_name || '').toLowerCase()}|${(r.branch || '').toLowerCase()}`;
    nameLookup.set(key, r.id);
  }

  const rows = [];
  for (const rec of originalRecipients) {
    const branch = normalizeBranch(rec.branch);
    const key = `${(rec.full_name || '').toLowerCase()}|${(branch || '').toLowerCase()}`;
    const recipientId = nameLookup.get(key);
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
      .upsert(batch, { onConflict: 'recipient_id,award_id' })
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
