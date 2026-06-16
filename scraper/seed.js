/*
 * Load scraped data/netas.json into MongoDB. Upserts on (name + constituency + category).
 * Reads MONGO_URI from ../server/.env or environment.
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });
// Use the server's mongoose instance (the Neta model is registered on it).
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const Neta = require(path.join(__dirname, '..', 'server', 'models', 'Neta'));

async function main() {
  const file = path.join(__dirname, 'data', 'netas.json');
  if (!fs.existsSync(file)) {
    console.error('No data file. Run `node scrape.js` first.');
    process.exit(1);
  }
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  await mongoose.connect(process.env.MONGO_URI);

  let inserted = 0;
  let updated = 0;
  for (const row of rows) {
    const key = { name: row.name, constituency: row.constituency, category: row.category };
    const existing = await Neta.findOne(key);
    if (existing) {
      Object.assign(existing, row);
      await existing.save();
      updated += 1;
    } else {
      await Neta.create(row);
      inserted += 1;
    }
  }
  console.log(`Done. inserted=${inserted} updated=${updated}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
