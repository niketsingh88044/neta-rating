require('dotenv').config();
// Some restrictive DNS servers (e.g. campus networks) refuse SRV-record queries,
// which breaks `mongodb+srv://` Atlas connections. Pre-empt that by routing
// Node's resolver at public DNS when MONGO_URI uses SRV.
if ((process.env.MONGO_URI || '').startsWith('mongodb+srv://')) {
  require('dns').setServers(['8.8.8.8', '1.1.1.1']);
}
const path = require('path');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Locally-cached candidate photos. Populated by `node scraper/download-photos.js`.
app.use(
  '/photos',
  express.static(path.join(__dirname, 'public', 'photos'), {
    maxAge: '7d',
    fallthrough: true,
  })
);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/netas', require('./routes/netas'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/admin-applications', require('./routes/adminApplications'));

// In production, serve the built React app from client/dist and let the SPA
// router handle any non-/api path. In dev, Vite handles the frontend on :5173.
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist, { maxAge: '1h' }));
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => console.log(`API listening on :${PORT}`));
});
