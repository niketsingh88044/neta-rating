const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Rating = require('../models/Rating');
const Neta = require('../models/Neta');
const { requireAuth, requireVerified } = require('../middleware/auth');

const router = express.Router();

async function recomputeNeta(netaId) {
  const agg = await Rating.aggregate([
    { $match: { neta: new mongoose.Types.ObjectId(netaId) } },
    { $group: { _id: '$neta', avg: { $avg: '$score' }, count: { $sum: 1 } } },
  ]);
  const { avg = 0, count = 0 } = agg[0] || {};
  await Neta.findByIdAndUpdate(netaId, {
    avgRating: Math.round(avg * 10) / 10,
    ratingCount: count,
  });
}

router.post(
  '/',
  requireAuth,
  requireVerified,
  [
    body('netaId').isMongoId(),
    body('score').isInt({ min: 1, max: 5 }),
    body('comment').optional().isString().isLength({ max: 1000 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { netaId, score, comment } = req.body;
    const neta = await Neta.findById(netaId);
    if (!neta) return res.status(404).json({ error: 'Neta not found' });

    const rating = await Rating.findOneAndUpdate(
      { user: req.userId, neta: netaId },
      { $set: { score, comment: comment || '' } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await recomputeNeta(netaId);
    res.status(201).json({ rating });
  }
);

router.get('/mine', requireAuth, async (req, res) => {
  const ratings = await Rating.find({ user: req.userId }).populate('neta', 'name category');
  res.json({ ratings });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const rating = await Rating.findById(req.params.id);
  if (!rating) return res.status(404).json({ error: 'Not found' });
  if (rating.user.toString() !== req.userId)
    return res.status(403).json({ error: 'Forbidden' });

  const netaId = rating.neta;
  await rating.deleteOne();
  await recomputeNeta(netaId);
  res.json({ ok: true });
});

module.exports = router;
