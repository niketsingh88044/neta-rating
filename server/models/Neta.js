const mongoose = require('mongoose');

const CATEGORIES = ['MP', 'MLA', 'STATE', 'DISTRICT'];

const netaSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: true },
    party: { type: String, trim: true },
    partyFull: { type: String, trim: true },
    constituency: { type: String, trim: true },
    state: { type: String, trim: true, index: true },
    category: { type: String, enum: CATEGORIES, required: true, index: true },
    election: { type: String, trim: true },
    age: Number,
    fatherOrHusband: String,
    selfProfession: String,
    spouseProfession: String,
    education: String,
    educationDetails: String,
    assets: String,
    liabilities: String,
    criminalCases: { type: Number, default: 0 },
    pendingCases: { type: Number, default: 0 },
    convictedCases: { type: Number, default: 0 },
    voterInfo: String,
    sourceUrl: String,
    photoUrl: String,
    avgRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    editorialReview: {
      text: { type: String, default: '' },
      updatedAt: Date,
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      source: { type: String, enum: ['ai', 'admin', ''], default: '' },
    },
  },
  { timestamps: true }
);

netaSchema.index({ name: 'text', constituency: 'text', party: 'text' });

netaSchema.statics.CATEGORIES = CATEGORIES;

module.exports = mongoose.model('Neta', netaSchema);
