const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { sendMail, verificationEmail } = require('../util/email');

const router = express.Router();

const VERIFICATION_TTL_MS = 15 * 60 * 1000; // 15 minutes — short by design for OTP codes

function signToken(userId) {
  return jwt.sign({ sub: userId.toString() }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '7d',
  });
}

function newVerificationCode() {
  // 6-digit numeric code, zero-padded.
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

async function issueAndSendVerification(user) {
  const code = newVerificationCode();
  user.verificationCode = code;
  user.verificationExpires = new Date(Date.now() + VERIFICATION_TTL_MS);
  await user.save();
  const { subject, text, html } = verificationEmail({ name: user.name, code });
  try {
    await sendMail({ to: user.email, subject, text, html });
  } catch (e) {
    console.error('[auth] verification email send failed:', e.message);
  }
  return code;
}

router.post(
  '/signup',
  [
    body('name').isString().trim().isLength({ min: 2 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isString().isLength({ min: 6 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const user = new User({ name, email });
    await user.setPassword(password);
    await user.save();
    await issueAndSendVerification(user);

    res.status(201).json({ token: signToken(user._id), user: user.toSafeJSON() });
  }
);

router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').isString().notEmpty()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await user.checkPassword(password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    res.json({ token: signToken(user._id), user: user.toSafeJSON() });
  }
);

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: user.toSafeJSON() });
});

router.post(
  '/verify-code',
  requireAuth,
  [body('code').isString().trim().matches(/^\d{6}$/)],
  async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: 'Enter the 6-digit code from your email.' });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.emailVerified) return res.json({ ok: true, user: user.toSafeJSON() });

    if (!user.verificationCode || !user.verificationExpires) {
      return res.status(400).json({ error: 'No code on file. Request a new one.' });
    }
    if (user.verificationExpires.getTime() < Date.now()) {
      return res.status(400).json({ error: 'This code has expired. Request a new one.' });
    }
    if (user.verificationCode !== req.body.code.trim()) {
      return res.status(400).json({ error: 'Incorrect code. Check the email and try again.' });
    }

    user.emailVerified = true;
    user.verificationCode = null;
    user.verificationExpires = null;
    await user.save();
    res.json({ ok: true, user: user.toSafeJSON() });
  }
);

router.post('/resend-verification', requireAuth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.emailVerified) return res.status(409).json({ error: 'Email is already verified.' });
  await issueAndSendVerification(user);
  res.json({ ok: true });
});

module.exports = router;
