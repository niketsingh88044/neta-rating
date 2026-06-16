/*
 * Hand-curated sample data so the app is demonstrable without the scraper.
 *
 * Only public, factual metadata is included (name / party / constituency / state /
 * category). Sensitive affidavit fields (criminal cases, assets, liabilities) are
 * intentionally left empty — those should come from myneta.info via scrape.js.
 *
 * Run:   node sample-seed.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });
// Load mongoose from the server's node_modules so the same instance the Neta
// model was registered on is the one we're connecting. Otherwise findOne()
// will buffer forever against a never-connected mongoose.
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const Neta = require(path.join(__dirname, '..', 'server', 'models', 'Neta'));

const SAMPLES = [
  // ---- MP (Lok Sabha 2024 winners) ----
  { name: 'Narendra Modi',          party: 'BJP',      constituency: 'Varanasi',           state: 'Uttar Pradesh', category: 'MP' },
  { name: 'Rahul Gandhi',           party: 'INC',      constituency: 'Rae Bareli',         state: 'Uttar Pradesh', category: 'MP' },
  { name: 'Amit Shah',              party: 'BJP',      constituency: 'Gandhinagar',        state: 'Gujarat',       category: 'MP' },
  { name: 'Shashi Tharoor',         party: 'INC',      constituency: 'Thiruvananthapuram', state: 'Kerala',        category: 'MP' },
  { name: 'Asaduddin Owaisi',       party: 'AIMIM',    constituency: 'Hyderabad',          state: 'Telangana',     category: 'MP' },
  { name: 'Mahua Moitra',           party: 'TMC',      constituency: 'Krishnanagar',       state: 'West Bengal',   category: 'MP' },
  { name: 'Akhilesh Yadav',         party: 'SP',       constituency: 'Kannauj',            state: 'Uttar Pradesh', category: 'MP' },
  { name: 'Supriya Sule',           party: 'NCP(SP)',  constituency: 'Baramati',           state: 'Maharashtra',   category: 'MP' },
  { name: 'Kanimozhi Karunanidhi',  party: 'DMK',      constituency: 'Thoothukudi',        state: 'Tamil Nadu',    category: 'MP' },
  { name: 'Priyanka Gandhi Vadra',  party: 'INC',      constituency: 'Wayanad',            state: 'Kerala',        category: 'MP' },

  // ---- MLA ----
  { name: 'Arvind Kejriwal',        party: 'AAP',      constituency: 'New Delhi',          state: 'Delhi',         category: 'MLA' },
  { name: 'Tejashwi Yadav',         party: 'RJD',      constituency: 'Raghopur',           state: 'Bihar',         category: 'MLA' },
  { name: 'Devendra Fadnavis',      party: 'BJP',      constituency: 'Nagpur South West',  state: 'Maharashtra',   category: 'MLA' },
  { name: 'Hemant Soren',           party: 'JMM',      constituency: 'Barhait',            state: 'Jharkhand',     category: 'MLA' },
  { name: 'Ashok Gehlot',           party: 'INC',      constituency: 'Sardarpura',         state: 'Rajasthan',     category: 'MLA' },
  { name: 'Bhupesh Baghel',         party: 'INC',      constituency: 'Patan',              state: 'Chhattisgarh',  category: 'MLA' },
  { name: 'Atishi',                 party: 'AAP',      constituency: 'Kalkaji',            state: 'Delhi',         category: 'MLA' },
  { name: 'Aaditya Thackeray',      party: 'SS(UBT)',  constituency: 'Worli',              state: 'Maharashtra',   category: 'MLA' },

  // ---- STATE (Chief Ministers / state-level leaders) ----
  { name: 'Yogi Adityanath',        party: 'BJP',      constituency: 'Chief Minister',     state: 'Uttar Pradesh', category: 'STATE' },
  { name: 'M. K. Stalin',           party: 'DMK',      constituency: 'Chief Minister',     state: 'Tamil Nadu',    category: 'STATE' },
  { name: 'Mamata Banerjee',        party: 'TMC',      constituency: 'Chief Minister',     state: 'West Bengal',   category: 'STATE' },
  { name: 'Pinarayi Vijayan',       party: 'CPI(M)',   constituency: 'Chief Minister',     state: 'Kerala',        category: 'STATE' },
  { name: 'N. Chandrababu Naidu',   party: 'TDP',      constituency: 'Chief Minister',     state: 'Andhra Pradesh', category: 'STATE' },
  { name: 'Revanth Reddy',          party: 'INC',      constituency: 'Chief Minister',     state: 'Telangana',     category: 'STATE' },
  { name: 'Mohan Yadav',            party: 'BJP',      constituency: 'Chief Minister',     state: 'Madhya Pradesh',category: 'STATE' },
  { name: 'Siddaramaiah',           party: 'INC',      constituency: 'Chief Minister',     state: 'Karnataka',     category: 'STATE' },
  { name: 'Naveen Patnaik',         party: 'BJD',      constituency: 'Hinjili (MLA)',      state: 'Odisha',        category: 'STATE' },

  // ---- DISTRICT (mayors / district-level leaders) ----
  { name: 'Shelly Oberoi',          party: 'AAP',      constituency: 'East Patel Nagar',   state: 'Delhi',         category: 'DISTRICT' },
  { name: 'Mahesh Kumar Khinchi',   party: 'AAP',      constituency: 'Deoli',              state: 'Delhi',         category: 'DISTRICT' },
];

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  let inserted = 0;
  let updated = 0;
  for (const row of SAMPLES) {
    const key = { name: row.name, constituency: row.constituency, category: row.category };
    const existing = await Neta.findOne(key);
    const data = {
      ...row,
      sourceUrl: 'https://myneta.info/',
      photoUrl: '',
      age: null,
      education: '',
      assets: '',
      liabilities: '',
      criminalCases: 0,
    };
    if (existing) {
      Object.assign(existing, data);
      await existing.save();
      updated += 1;
    } else {
      await Neta.create(data);
      inserted += 1;
    }
  }
  console.log(`Sample seed done. inserted=${inserted} updated=${updated}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
