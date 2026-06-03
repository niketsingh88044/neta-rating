/*
 * Promote a user to admin. One-shot CLI.
 *
 *   node make-admin.js you@example.com
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function main() {
  const email = (process.argv[2] || '').trim().toLowerCase();
  if (!email) {
    console.error('Usage: node make-admin.js <email>');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne({ email });
  if (!user) {
    console.error(`No user with email "${email}". Sign up first.`);
    await mongoose.disconnect();
    process.exit(1);
  }
  user.isAdmin = true;
  await user.save();
  console.log(`OK. ${email} is now an admin.`);
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
