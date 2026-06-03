const express = require('express');
const Neta = require('../models/Neta');
const Rating = require('../models/Rating');

const router = express.Router();

router.get('/', async (req, res) => {
  const { q, category, state, party, sort, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (category) filter.category = String(category).toUpperCase();
  if (state) filter.state = state;
  if (party) filter.party = party;
  if (q) filter.$text = { $search: q };

  const sortMap = {
    top: { avgRating: -1, ratingCount: -1 },
    new: { createdAt: -1 },
    name: { name: 1 },
  };
  const sortBy = sortMap[sort] || sortMap.top;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

  const [items, total] = await Promise.all([
    Neta.find(filter)
      .sort(sortBy)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Neta.countDocuments(filter),
  ]);

  res.json({ items, total, page: pageNum, limit: limitNum });
});

router.get('/categories', (_req, res) => {
  res.json({ categories: Neta.CATEGORIES });
});

router.get('/states', async (_req, res) => {
  const states = await Neta.distinct('state', { state: { $ne: '' } });
  res.json({ states: states.sort() });
});

router.get('/:id', async (req, res) => {
  const neta = await Neta.findById(req.params.id);
  if (!neta) return res.status(404).json({ error: 'Not found' });
  const recent = await Rating.find({ neta: neta._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('user', 'name');
  res.json({ neta, recentRatings: recent });
});

module.exports = router;
