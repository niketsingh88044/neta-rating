const jwt = require('jsonwebtoken');
const User = require('../models/User');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (_e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function requireAdmin(req, res, next) {
  if (!req.userId) return res.status(401).json({ error: 'Not authenticated' });
  const user = await User.findById(req.userId).select('isAdmin');
  if (!user || !user.isAdmin) return res.status(403).json({ error: 'Admin only' });
  next();
}

async function requireVerified(req, res, next) {
  if (!req.userId) return res.status(401).json({ error: 'Not authenticated' });
  const user = await User.findById(req.userId).select('emailVerified isAdmin');
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  // Admins are implicitly trusted — they're created via the make-admin script.
  if (!user.emailVerified && !user.isAdmin) {
    return res.status(403).json({ error: 'Please verify your email to perform this action.', code: 'EMAIL_UNVERIFIED' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, requireVerified };
