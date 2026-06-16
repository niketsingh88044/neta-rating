const express = require('express');
const path = require('path');
const cheerio = require('cheerio');
const { body, validationResult } = require('express-validator');
const Neta = require('../models/Neta');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { localizePhoto } = require('../util/localizePhoto');

const scraperLib = require('../util/scraperLib');

const router = express.Router();
router.use(requireAuth, requireAdmin);

const VALID_CATEGORIES = ['MP', 'MLA', 'STATE', 'DISTRICT'];

/* ---------- Single-candidate auto-fill ---------- */
/**
 * POST /api/admin/scrape-candidate { detailUrl }
 * Visits a myneta candidate detail page and returns fields the Add form can use.
 */
router.post(
  '/scrape-candidate',
  [body('detailUrl').isURL({ require_protocol: true })],
  async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg });

    try {
      const html = await scraperLib.fetchHtml(req.body.detailUrl);
      const parsed = parseDetailPage(html, req.body.detailUrl);
      res.json({ candidate: parsed });
    } catch (e) {
      res.status(502).json({ error: `Fetch failed: ${e.message}` });
    }
  }
);

/* ---------- CRUD on netas ---------- */

router.post(
  '/netas',
  [
    body('name').isString().trim().isLength({ min: 1 }),
    body('category').isIn(VALID_CATEGORIES),
  ],
  async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg });
    const data = sanitize(req.body);

    const dup = await findDuplicate(data);
    if (dup) {
      return res.status(409).json({
        error: duplicateMessage(dup),
        duplicateId: dup._id,
      });
    }

    const neta = await Neta.create(data);
    // Once the doc has an _id, localize a remote photo into /photos/<id>.<ext>.
    if (/^https?:/i.test(neta.photoUrl || '')) {
      const local = await localizePhoto(neta.photoUrl, neta._id);
      if (local !== neta.photoUrl) {
        neta.photoUrl = local;
        await neta.save();
      }
    }
    res.status(201).json({ neta });
  }
);

router.put('/netas/:id', async (req, res) => {
  const neta = await Neta.findById(req.params.id);
  if (!neta) return res.status(404).json({ error: 'Not found' });
  const patch = sanitize(req.body);
  delete patch.avgRating;
  delete patch.ratingCount;

  // If the edit changes any of the identity fields, ensure it doesn't collide.
  const probe = {
    name: patch.name ?? neta.name,
    constituency: patch.constituency ?? neta.constituency,
    category: patch.category ?? neta.category,
  };
  const identityChanged =
    probe.name !== neta.name || probe.constituency !== neta.constituency || probe.category !== neta.category;
  if (identityChanged) {
    const dup = await findDuplicate(probe, neta._id);
    if (dup) {
      return res.status(409).json({
        error: duplicateMessage(dup),
        duplicateId: dup._id,
      });
    }
  }

  // If admin pasted a new remote URL, localize it.
  if (patch.photoUrl && /^https?:/i.test(patch.photoUrl) && patch.photoUrl !== neta.photoUrl) {
    patch.photoUrl = await localizePhoto(patch.photoUrl, neta._id);
  }
  Object.assign(neta, patch);
  await neta.save();
  res.json({ neta });
});

router.delete('/netas/:id', async (req, res) => {
  const r = await Neta.findByIdAndDelete(req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

/* ---------- Bulk scrape + import ---------- */

router.post(
  '/scrape-import',
  [
    body('listingUrl').isURL({ require_protocol: true }),
    body('category').isIn(VALID_CATEGORIES),
    body('state').optional().isString(),
    body('election').optional().isString(),
    body('withPhotos').optional().isBoolean(),
  ],
  async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ error: errs.array()[0].msg });

    const { listingUrl, category, state = '', election = '', withPhotos = false } = req.body;
    let baseUrl;
    try {
      const u = new URL(listingUrl);
      baseUrl = u.origin + u.pathname.replace(/\/[^/]*$/, '/');
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    let rows;
    try {
      const html = await scraperLib.fetchHtml(listingUrl);
      rows = scraperLib.parseList(html, baseUrl);
    } catch (e) {
      return res.status(502).json({ error: `Listing fetch failed: ${e.message}` });
    }
    if (!rows.length) return res.status(422).json({ error: 'No candidate rows found at that URL.' });

    // Photo fetch is slow. Cap at 25 in the sync path.
    const PHOTO_LIMIT = 25;
    if (withPhotos) {
      const toPhoto = rows.slice(0, PHOTO_LIMIT);
      for (const r of toPhoto) {
        await new Promise((s) => setTimeout(s, 200));
        try {
          const html = await scraperLib.fetchHtml(r.detail_url);
          r.photo = scraperLib.findPhoto(html, r.detail_url);
        } catch (_e) {}
      }
    }

    let inserted = 0, updated = 0, photosLocalized = 0;
    for (const r of rows) {
      const name = (r.name || '').trim();
      if (!name) continue;
      const data = {
        name,
        party: fixEncoding(r.party),
        constituency: stripReservation(r.constituency || ''),
        state,
        category,
        election,
        criminalCases: parseInt(r.criminal_cases || '0', 10) || 0,
        education: r.education || '',
        assets: (r.total_assets || '').replace(/\s+/g, ' ').trim(),
        liabilities: (r.liabilities || '').replace(/\s+/g, ' ').trim(),
        sourceUrl: r.detail_url || '',
        photoUrl: r.photo || '',
      };
      const existing = await findDuplicate(data);

      let doc;
      if (existing) {
        const { avgRating, ratingCount } = existing;
        Object.assign(existing, data, { avgRating, ratingCount });
        await existing.save();
        updated += 1;
        doc = existing;
      } else {
        doc = await Neta.create(data);
        inserted += 1;
      }

      // Localize the photo we just stored (only the ones we actually fetched).
      if (withPhotos && doc.photoUrl && /^https?:/i.test(doc.photoUrl)) {
        const local = await localizePhoto(doc.photoUrl, doc._id);
        if (local !== doc.photoUrl) {
          doc.photoUrl = local;
          await doc.save();
          photosLocalized += 1;
        }
      }
    }

    res.json({
      ok: true,
      parsed: rows.length,
      inserted,
      updated,
      photosFetched: withPhotos ? Math.min(rows.length, PHOTO_LIMIT) : 0,
      photosLocalized,
      note: withPhotos && rows.length > PHOTO_LIMIT
        ? `Photos fetched only for first ${PHOTO_LIMIT} of ${rows.length}. For the rest, run "node download-photos.js" from the scraper directory.`
        : undefined,
    });
  }
);

/* ---------- helpers ---------- */

function sanitize(body = {}) {
  const allowed = [
    'name','party','partyFull','constituency','state','category','election',
    'age','fatherOrHusband','selfProfession','spouseProfession',
    'education','educationDetails','assets','liabilities',
    'criminalCases','pendingCases','convictedCases',
    'voterInfo','sourceUrl','photoUrl',
  ];
  const out = {};
  for (const k of allowed) if (body[k] !== undefined) out[k] = body[k];
  if (out.category) out.category = String(out.category).toUpperCase();
  return out;
}

function fixEncoding(s) {
  if (!s) return '';
  return s.replace(/\s+â\s+/g, ' – ').trim();
}
function stripReservation(s) {
  if (!s) return '';
  let v = s.replace(/\s*\((?:ST|SC|GEN|GENERAL)\)\s*$/i, '');
  v = v.replace(/\s*:\s*BYE\s*ELECTION\s*ON\s*[\d\-\/]+.*$/i, '');
  return v.trim();
}
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Look up an existing neta that would collide with `data` on (name, constituency,
 * category) — all matched case-insensitively. If `excludeId` is provided, that
 * doc is ignored (used by the update path so a record doesn't collide with itself).
 */
async function findDuplicate({ name, constituency, category }, excludeId = null) {
  if (!name || !category) return null;
  const query = {
    name: new RegExp('^' + escapeRe(String(name).trim()) + '$', 'i'),
    constituency: new RegExp('^' + escapeRe(String(constituency || '').trim()) + '$', 'i'),
    category,
  };
  if (excludeId) query._id = { $ne: excludeId };
  return Neta.findOne(query);
}

function duplicateMessage(dup) {
  const where = dup.constituency ? ` from ${dup.constituency}` : '';
  return `A ${dup.category} named "${dup.name}"${where} already exists. Edit the existing record instead of adding a duplicate.`;
}

/**
 * Parse a myneta candidate detail page into the same field names the Add form
 * uses. Best-effort — returns whatever it can extract.
 */
function parseDetailPage(html, url) {
  const $ = cheerio.load(html);

  // Title format: "Name(Full Party(Short)):Constituency- CONST(...)(STATE) - Affidavit..."
  const title = $('title').text() || '';
  const titleMatch = title.match(
    /^([^(]+)\(([^()]+)\(([^()]+)\)\):Constituency-\s*([^()]+)(?:\(([^()]+)\))?\s*\(([^()]+)\)/i
  );
  const h2 = ($('h2').first().text() || '').trim().replace(/\(.*?\)\s*$/, '').trim();
  const h3 = ($('h3').first().text() || '').trim();

  const name = h2 || (titleMatch ? titleMatch[1].trim() : '');
  const party = titleMatch ? titleMatch[3].trim() : '';
  const partyFull = titleMatch ? titleMatch[2].trim() : '';
  const constituency = titleMatch ? stripReservation(titleMatch[4].trim()) : '';
  const state = titleMatch ? (titleMatch[6] || titleMatch[5] || '').trim() : '';
  const election = h3;

  // Photo
  let photo = $('img[alt="profile image"]').attr('src') || '';
  if (!photo) {
    $('img').each((_, img) => {
      const src = $(img).attr('src') || '';
      if (/images_candidate/i.test(src)) { photo = src; return false; }
    });
  }
  if (photo && !/^https?:/i.test(photo)) {
    try { photo = new URL(photo, url).toString(); } catch { photo = ''; }
  }

  // Labelled fields from the body HTML
  const body = html;
  const pluck = (label) => {
    const m = body.match(new RegExp(`<b>\\s*${label}\\s*:?\\s*</b>\\s*([^<\\n\\r]+)`, 'i'));
    return m ? m[1].replace(/&amp;/g, '&').trim() : '';
  };
  const age = parseInt(pluck('Age'), 10) || null;
  const selfProfession = pluck('Self Profession');
  const spouseProfession = pluck('Spouse Profession');

  // Education
  let education = '', educationDetails = '';
  const eduBlock = body.match(/<h3>\s*Educational Details\s*<\/h3>\s*<hr\s*\/?>([\s\S]*?)<\/div>/i);
  if (eduBlock) {
    const inner = cheerio.load(`<div>${eduBlock[1]}</div>`).root().text();
    const catMatch = inner.match(/Category\s*:\s*([^\n\r]+)/i);
    if (catMatch) education = catMatch[1].trim();
    educationDetails = inner.replace(/Category\s*:[^\n\r]*/i, '').replace(/\s+/g, ' ').trim().slice(0, 800);
  }

  // Criminal cases count
  const cmMatch = body.match(/Number of Criminal Cases\s*:\s*<span[^>]*>\s*(\d+)/i);
  const criminalCases = cmMatch ? parseInt(cmMatch[1], 10) : 0;

  // Assets / Liabilities
  let assets = '', liabilities = '';
  $('table tr').each((_, tr) => {
    const tds = $(tr).find('td');
    if (tds.length >= 2) {
      const label = $(tds[0]).text().trim().toLowerCase();
      if (label === 'assets:' || label === 'total assets:') assets = $(tds[1]).text().replace(/\s+/g, ' ').trim();
      else if (label === 'liabilities:' || label === 'total liabilities:') liabilities = $(tds[1]).text().replace(/\s+/g, ' ').trim();
    }
  });

  return {
    name, party, partyFull, constituency, state, election,
    age, selfProfession, spouseProfession,
    education, educationDetails,
    criminalCases, assets, liabilities,
    photoUrl: photo,
    sourceUrl: url,
  };
}

module.exports = router;
