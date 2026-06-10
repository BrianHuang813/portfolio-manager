# Portfolio Manager

Personal investment dashboard — React + Vite SPA deployed to GitHub Pages.

Aggregates holdings from **Charles Schwab**, **OKX**, **Zerion** (self-custody wallets), and **Futu/Moomoo** (via Google Sheets) into a single real-time dashboard with charts, PnL tracking, and news.

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/<your-username>/portfolio-manager.git
cd portfolio-manager
npm install
```

### 2. Start dev server

```bash
npm run dev
```

Open `http://localhost:5173/portfolio-manager/`

### 3. Configure credentials

Navigate to **Settings** in the app. Enter API credentials for each platform — they are stored in your browser's `localStorage` only and never transmitted to any server.

---

## Platform Setup

### Charles Schwab

1. Register at [developer.schwab.com](https://developer.schwab.com/products/trader-api--individual)
2. Create an Individual Developer app — note your `App Key` and `App Secret`
3. Set the Callback URL in your Schwab app to `https://127.0.0.1`
4. Run the helper script to obtain a `refresh_token`:
   ```bash
   npm run schwab-auth
   ```
   Enter your App Key, App Secret, and `https://127.0.0.1` as the Callback URL. After authorizing in the browser, copy the full redirect URL from the address bar (the page will error — that's expected) and paste it into the terminal. The script prints the new `refresh_token`.
5. Paste `appKey`, `appSecret`, and `refreshToken` into Settings → Schwab
6. The app auto-refreshes the access token on every fetch
7. `refresh_token` expires every ~7 days — re-run `npm run schwab-auth` to renew

### OKX

1. Create an API key at OKX → Account → API Management
2. Set permissions to **Read** only (no trading permissions needed)
3. Paste `apiKey`, `secret`, and `passphrase` into Settings → OKX

### Zerion

1. Get an API key from [developers.zerion.io](https://developers.zerion.io/)
2. Paste your `apiKey` and wallet addresses (comma-separated) into Settings → Zerion

### Futu / Moomoo (via Google Sheets)

Futu's OpenD gateway cannot be called from the browser. Use a Python script to write positions to Google Sheets using the schema below.

**Required sheet tab name:** `Futu`

**Column schema (A–K):**

| Col | Field | Type | Example |
|-----|-------|------|---------|
| A | `symbol` | string | `700.HK` |
| B | `name` | string | `Tencent Holdings` |
| C | `qty` | number | `100` |
| D | `costBasis` | number (USD/unit) | `45.20` |
| E | `marketValue` | number (USD total) | `4890.00` |
| F | `unrealizedPL` | number (USD) | `370.00` |
| G | `unrealizedPLPercent` | number | `8.18` |
| H | `platform` | string | `futu` |
| I | `type` | string | `stock` |
| J | `lastUpdated` | ISO 8601 | `2026-04-05T10:00:00Z` |
| K | `currency` | string | `USD` |

**Important:** Pre-convert all HKD/other currencies to USD in your Python script.

Make the sheet either **publicly readable** or add a `sheetsApiKey` in Settings → Google Sheets.

### Finnhub (News)

1. Get a free API key at [finnhub.io](https://finnhub.io/)
2. Paste `apiKey` into Settings → Finnhub

---

## Deploy to GitHub Pages

### One-time setup

1. Set your repo to **Private** on GitHub
2. Go to repo **Settings → Pages → Source**: set to `gh-pages` branch
3. The GitHub Actions workflow (`.github/workflows/deploy.yml`) auto-deploys on push to `main`

### Before deploying

Replace `portfolio-manager` with your actual repo name in two places:

```ts
// vite.config.ts
base: '/your-repo-name/',

// src/App.tsx
basename="/your-repo-name"
```

### Trigger deployment

```bash
git push origin main
```

Your app will be live at: `https://<your-username>.github.io/portfolio-manager/`

---

## Security

- All API keys are stored in `localStorage` only
- Keys are never committed to git (`.env.local` is gitignored)
- Keep this repository **Private**
- Do not share your `localStorage` contents

---

## Architecture

```
src/
├── types/         # HoldingRecord, Platform, NewsArticle
├── config/        # Constants (refresh interval, etc.)
├── utils/         # storage, crypto (HMAC), snapshot (JSONL), normalize
├── services/      # Per-platform fetch functions
├── hooks/         # useAllHoldings, useNews (React Query)
├── store/         # Zustand UI state
├── components/    # Layout + Dashboard + Settings components
└── pages/         # Dashboard, Settings
```

State layers:
- **React Query** — server state, caching, auto-refetch
- **Zustand** — UI state (filters, selected symbol, platform badges)
- **localStorage** — API keys, last successful holdings per platform, and long-term JSONL snapshot history
