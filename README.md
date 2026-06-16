# Neta Rating

A MERN-stack rating site for Indian politicians, with profile data sourced from
[myneta.info](https://myneta.info/). Logged-in users can rate netas; netas are
categorized as MP, MLA, State Neta, or District Neta.

## Layout

```
project 6/
├── server/    Express + MongoDB API
├── client/    React + Vite frontend
└── scraper/   Node script that pulls profiles from myneta.info
```

## Prerequisites

- Node.js 18+
- MongoDB running locally (or a connection string)

## Quick start

```powershell
# 1. Install
cd server;  npm install
cd ..\client; npm install
cd ..\scraper; npm install

# 2. Configure
copy server\.env.example server\.env
# edit server\.env and set MONGO_URI and JWT_SECRET

# 3. Seed some neta data
cd scraper; node scrape.js

# 4. Run dev
cd ..\server; npm run dev      # http://localhost:5000
cd ..\client; npm run dev      # http://localhost:5173
```

## Stages

- **Stage 1 (current):** auth, neta listing, rating, scraper, category field stored on each neta.
- **Stage 2:** browse-by-category UI (MP / MLA / State / District), category-scoped leaderboards.

## Running the real scraper

The scraper is a Node port of the Python `scrape_myneta.py` / `add_photos.py`
two-step workflow — same headers, same parsing, same JSON shape. It uses
Node's built-in `fetch` + cheerio; no Chromium/Playwright needed.

The scraper needs network access to myneta.info. If a gateway is filtering the
site (campus Wi-Fi often does), it'll detect the block page and exit with a
clear error. Switch to a hotspot / VPN and retry.

```powershell
cd "scraper"

# Fast first pass — list page only, ~5 seconds, ~480 records, no photos:
$env:NO_PHOTOS = "1"; node scrape.js; Remove-Item env:NO_PHOTOS

# Or do it in one shot (list + per-candidate photo fetch, ~5 min):
node scrape.js

# Enrich an existing file with missing photos (resumable — skips ones already filled):
node add-photos.js

# Load data/lok_sabha_2024_winners.json into MongoDB:
node import-ls2024.js
```

Useful env vars on `scrape.js`:
- `NO_PHOTOS=1` — skip per-candidate photo fetch
- `MAX=10` — only process first 10 candidates (for testing)
- `DELAY_MS=200` — tune politeness delay (default 400ms)
- `BASE=...` `LIST=...` — point at a different election

Sample data (without scraping) is also available via `node sample-seed.js`.
