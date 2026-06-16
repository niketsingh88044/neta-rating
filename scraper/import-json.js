/*
 * Generalized importer for scrape.js JSON output.
 *
 * Loads any JSON file with the scrape.js shape and upserts into MongoDB with
 * the given category/state/election. Case-insensitive dedup by (name+constituency+category)
 * — preserves existing avgRating/ratingCount on update.
 *
 *   node import-json.js --in data/up_2022_main.json --category MLA --state "Uttar Pradesh" --election "Uttar Pradesh 2022"
 *   node import-json.js --in data/up_bye_2024.json  --category MLA --state "Uttar Pradesh" --election "Uttar Pradesh Bye 2024"
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const Neta = require(path.join(__dirname, '..', 'server', 'models', 'Neta'));

function parseArgs(argv) {
  const out = { in: '', category: '', state: '', election: '' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--in') out.in = argv[++i];
    else if (a === '--category') out.category = argv[++i];
    else if (a === '--state') out.state = argv[++i];
    else if (a === '--election') out.election = argv[++i];
  }
  return out;
}

function fixEncoding(s) {
  if (!s) return '';
  return s.replace(/\s+â\s+/g, ' – ').trim();
}
function stripReservation(s) {
  if (!s) return '';
  // strip " (ST)" / " (SC)" / " (GEN)" suffix
  let v = s.replace(/\s*\((?:ST|SC|GEN|GENERAL)\)\s*$/i, '');
  // strip " : BYE ELECTION ON ..." suffix
  v = v.replace(/\s*:\s*BYE\s*ELECTION\s*ON\s*[\d\-\/]+.*$/i, '');
  return v.trim();
}
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.in || !args.category) {
    console.error('Usage: node import-json.js --in <path> --category <MP|MLA|STATE|DISTRICT> [--state <name>] [--election <name>]');
    process.exit(1);
  }
  const valid = ['MP', 'MLA', 'STATE', 'DISTRICT'];
  if (!valid.includes(args.category)) {
    console.error(`--category must be one of: ${valid.join(', ')}`);
    process.exit(1);
  }
  const file = path.resolve(args.in);
  if (!fs.existsSync(file)) {
    console.error(`Missing input: ${file}`);
    process.exit(1);
  }
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(rows) || !rows.length) {
    console.error('Input is empty or not an array.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Importing ${rows.length} rows as ${args.category}${args.state ? ' / ' + args.state : ''} ...`);

  let inserted = 0, updated = 0, skipped = 0;
  for (const r of rows) {
    const name = (r.name || '').trim();
    if (!name) { skipped += 1; continue; }

    const data = {
      name,
      party: fixEncoding(r.party),
      partyFull: '',
      constituency: stripReservation(r.constituency || ''),
      state: args.state || '',
      category: args.category,
      election: args.election || '',
      age: null,
      criminalCases: parseInt(r.criminal_cases || '0', 10) || 0,
      pendingCases: 0,
      convictedCases: 0,
      education: r.education || '',
      educationDetails: '',
      assets: (r.total_assets || '').replace(/\s+/g, ' ').trim(),
      liabilities: (r.liabilities || '').replace(/\s+/g, ' ').trim(),
      sourceUrl: r.detail_url || '',
      photoUrl: r.photo || '',
    };

    // Dedup by case-insensitive name+constituency+category
    const existing = await Neta.findOne({
      name: new RegExp('^' + escapeRe(name) + '$', 'i'),
      constituency: new RegExp('^' + escapeRe(data.constituency) + '$', 'i'),
      category: args.category,
    });

    if (existing) {
      const { avgRating, ratingCount } = existing;
      Object.assign(existing, data, { avgRating, ratingCount });
      await existing.save();
      updated += 1;
    } else {
      await Neta.create(data);
      inserted += 1;
    }
  }

  console.log(`Done. inserted=${inserted} updated=${updated} skipped=${skipped} (total ${rows.length})`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
