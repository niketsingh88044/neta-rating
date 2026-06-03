/*
 * Import Lok Sabha 2024 winners from data/lok_sabha_2024_winners.json into MongoDB.
 *
 * - Fixes em-dash mojibake in party names ("Party â Sharadchandra" -> "Party – Sharadchandra")
 * - Strips reservation suffix from constituency ("ADILABAD (ST)" -> "ADILABAD")
 * - Sets category='MP' and election='Lok Sabha 2024'
 * - Upserts by case-insensitive (name, category) so the sample-seed MPs get
 *   updated in place instead of duplicated. Existing ratings are preserved.
 *
 * Run:  node import-ls2024.js
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const Neta = require(path.join(__dirname, '..', 'server', 'models', 'Neta'));

const SRC = path.join(__dirname, 'data', 'lok_sabha_2024_winners.json');

function fixEncoding(s) {
  if (!s) return '';
  // " â " between words is em-dash mojibake (UTF-8 0xE2 0x80 0x93 read as Latin-1)
  return s.replace(/\s+â\s+/g, ' – ').trim();
}

function stripReservation(s) {
  if (!s) return '';
  return s.replace(/\s*\((?:ST|SC|GEN|GENERAL)\)\s*$/i, '').trim();
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`Source not found: ${SRC}`);
    console.error('Save your scraped JSON there first.');
    process.exit(1);
  }
  const rows = JSON.parse(fs.readFileSync(SRC, 'utf8'));
  if (!Array.isArray(rows) || !rows.length) {
    console.error('Source file is empty or not an array.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Importing ${rows.length} rows...`);

  let inserted = 0, updated = 0, skipped = 0;
  for (const r of rows) {
    const name = (r.name || '').trim();
    if (!name) { skipped += 1; continue; }

    const data = {
      name,
      party: fixEncoding(r.party),
      partyFull: '',
      constituency: stripReservation(r.constituency || ''),
      state: '',
      category: 'MP',
      election: 'Lok Sabha 2024',
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

    // Case-insensitive lookup so "Narendra Modi" sample matches "NARENDRA MODI" scrape.
    const existing = await Neta.findOne({
      name: new RegExp('^' + escapeRe(name) + '$', 'i'),
      category: 'MP',
    });

    if (existing) {
      // Don't clobber rating data.
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
