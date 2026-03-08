import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(resolve(__dirname, '../data/master_recipients.json'), 'utf-8'));

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
  const parts = lower.split(',').map(p => p.trim());
  for (let i = parts.length - 1; i >= 0; i--) {
    let part = parts[i].replace(/,?\s*(united states|usa|u\.s\.a\.)$/i, '').trim();
    if (STATE_ABBREVS[part]) return STATE_ABBREVS[part];
    if (part.length === 2) {
      const upper = part.toUpperCase();
      if (Object.values(STATE_ABBREVS).includes(upper)) return upper;
    }
  }
  for (const [name, code] of Object.entries(STATE_ABBREVS)) {
    if (lower.includes(name)) return code;
  }
  return null;
}

const codes = {};
let nullCount = 0;
const nullExamples = [];
for (const r of data) {
  const code = extractStateCode(r.entered_service_state);
  if (!code) {
    nullCount++;
    if (nullExamples.length < 10) nullExamples.push(r.entered_service_state);
    continue;
  }
  codes[code] = (codes[code] || 0) + 1;
}
const sorted = Object.entries(codes).sort((a, b) => b[1] - a[1]);
console.log('Extracted state codes:');
sorted.forEach(([s, c]) => console.log(`  ${s}: ${c}`));
console.log(`\nCould not extract: ${nullCount}`);
console.log('Examples of unmatched:', nullExamples);
