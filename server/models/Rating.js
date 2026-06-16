const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    neta: { type: mongoose.Schema.Types.ObjectId, ref: 'Neta', required: true, index: true },
    score: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

ratingSchema.index({ user: 1, neta: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema);
