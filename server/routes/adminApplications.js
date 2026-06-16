const express = require('express');
const { body, validationResult } = require('express-validator');
const AdminApplication = require('../models/AdminApplication');
const User = require('../models/User');
const { requireAuth, requireAdmin, requireVerified } = require('../middleware/auth');

const router = express.Router();

/* ---------- User-facing: apply / check own status ---------- */

router.post(
  '/',
  requireAuth,
  requireVerified,
  [body('reason').isString().trim().isLength({ min: 10, max: 1000 })],
  async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: 'Please provide a reason (10–1000 chars).' });

    const me = await User.findById(req.userId);
    if (!me) return res.status(404).json({ error: 'User not found' });
    if (me.isAdmin) return res.status(409).json({ error: 'You are already an administrator.' });

    const existing = await AdminApplication.findOne({ user: me._id, status: 'pending' });
    if (existing) return res.status(409).json({ error: 'You already have a pending application.' });

    const app = await AdminApplication.create({ user: me._id, reason: req.body.reason });
    res.status(201).json({ application: app });
  }
);

router.get('/mine', requireAuth, async (req, res) => {
  const apps = await AdminApplication.find({ user: req.userId }).sort({ createdAt: -1 }).limit(10);
  res.json({ applications: apps });
});

/* ---------- Admin-facing: list / approve / reject ---------- */

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const status = req.query.status || 'pending';
  const apps = await AdminApplication.find({ status })
    .populate('user', 'name email isAdmin')
    .populate('decidedBy', 'name email')
    .sort({ createdAt: -1 })
    .limit(200);
  res.json({ applications: apps });
});

router.post(
  '/:id/approve',
  requireAuth,
  requireAdmin,
  [body('note').optional().isString().trim().isLength({ max: 500 })],
  async (req, res) => {
    const app = await AdminApplication.findById(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found' });
    if (app.status !== 'pending') return res.status(409).json({ error: `Already ${app.status}.` });

    const user = await User.findById(app.user);
    if (!user) return res.status(404).json({ error: 'Applicant no longer exists.' });

    user.isAdmin = true;
    await user.save();

    app.status = 'approved';
    app.decidedBy = req.userId;
    app.decidedAt = new Date();
    app.decisionNote = req.body.note || '';
    await app.save();

    res.json({ ok: true, application: app, user: user.toSafeJSON() });
  }
);

router.post(
  '/:id/reject',
  requireAuth,
  requireAdmin,
  [body('note').optional().isString().trim().isLength({ max: 500 })],
  async (req, res) => {
    const app = await AdminApplication.findById(req.params.id);
    if (!app) return res.status(404).json({ error: 'Application not found' });
    if (app.status !== 'pending') return res.status(409).json({ error: `Already ${app.status}.` });

    app.status = 'rejected';
    app.decidedBy = req.userId;
    app.decidedAt = new Date();
    app.decisionNote = req.body.note || '';
    await app.save();

    res.json({ ok: true, application: app });
  }
);

module.exports = router;
