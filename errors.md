# Google Search Console — Indexing Errors & Fix Plan

> **Reference:** https://support.google.com/webmasters/answer/7440203
> **Last updated:** Feb 16, 2026

---

## Error 1: Redirect error (3 pages) — FIXABLE

**Status:** Source: Website | Validation: Not Started
**First detected:** Feb 14, 2026

| URL | Last crawled |
|-----|-------------|
| `https://heavymetalstats.com/precious-metals` | Feb 11, 2026 |
| `https://heavymetalstats.com/terms` | Feb 11, 2026 |
| `https://heavymetalstats.com/api-info` | Feb 11, 2026 |

### Diagnosis

Google docs: *"Redirect error: A redirect chain that was too long, A redirect loop, A redirect URL that eventually exceeded the max URL length, A bad or empty URL in the redirect chain."*

**Root cause:** The old `middleware.ts` had a www→non-www 301 redirect. Vercel's domain configuration ALSO handles this redirect at the platform level. When both fired, Google hit a redirect loop:

1. Request to `heavymetalstats.com/precious-metals`
2. Vercel platform redirect → `www.heavymetalstats.com/precious-metals`
3. Middleware redirect → `heavymetalstats.com/precious-metals`
4. → Back to step 2 (infinite loop)

### Fix applied (in code, needs deployment)

1. **Removed `middleware.ts` entirely** — replaced with `proxy.ts` (Next.js 16 convention)
2. **`proxy.ts` has NO redirect logic** — only sets security headers (`X-Robots-Tag`, `X-Frame-Options`, etc.)
3. **All domain-level redirects** (www→non-www, HTTP→HTTPS) are handled solely by Vercel's platform configuration
4. **Previous DemandChart.tsx build error** that blocked deployment has been fixed
5. **Resend API lazy initialization** fixed to prevent build failures during page data collection

### Why the fix wasn't deployed yet

The `error.log` shows Vercel build failed due to a TypeScript error in `DemandChart.tsx` on the same deployment that included the redirect fix. The fix was in the code but never went live. The TypeScript error is now resolved.

### Action required

1. **Deploy** — Push current code to trigger Vercel deployment
2. **Verify Vercel domain config** (see below)
3. **Validate fix in GSC** (see steps at bottom)

---

## Error 2: Page with redirect (2 pages) — NOT A PROBLEM

**Status:** Source: Website | Validation: Started

| URL | Last crawled |
|-----|-------------|
| `http://heavymetalstats.com/` | Feb 11, 2026 |
| `http://www.heavymetalstats.com/` | Jan 24, 2026 |

### Diagnosis

Google docs: *"This is a non-canonical URL that redirects to another page. As such, this URL will not be indexed. The target URL of the redirect might or might not be indexed."*

These are HTTP and/or www variants that correctly 301-redirect to `https://heavymetalstats.com/`. This is **expected and correct behavior**. The canonical homepage IS indexed. **No action needed.**

---

## Error 3: Alternate page with proper canonical tag (1 page) — NOT A PROBLEM

**Status:** Source: Website | Validation: Started

| URL | Last crawled |
|-----|-------------|
| `https://www.heavymetalstats.com/` | Feb 11, 2026 |

### Diagnosis

Google docs: *"This page correctly points to the canonical page, which is indexed, so there is nothing you need to do."*

The www HTTPS variant has the correct canonical tag pointing to `https://heavymetalstats.com/`. Google recognizes the relationship and indexes only the canonical. **No action needed.**

---

## Error 4: Discovered - currently not indexed (2 pages) — GOOGLE'S SYSTEMS

**Status:** Source: Google systems | Validation: Started

| URL | Last crawled |
|-----|-------------|
| `https://heavymetalstats.com/learn/delivery` | N/A |
| `https://heavymetalstats.com/privacy` | N/A |

### Diagnosis

Google docs: *"The page was found by Google, but not crawled yet. Typically, Google wanted to crawl the URL but this was expected to overload the site; therefore Google rescheduled the crawl."*

These pages exist, have correct canonical tags, and are in the sitemap. Google found them but hasn't crawled yet. This is Google's scheduling decision. **Requesting indexing will speed this up.**

---

## Why pages aren't indexed — Summary table

| Reason | Source | Validation | Pages | Action |
|--------|--------|------------|-------|--------|
| Discovered - currently not indexed | Google systems | Started | 2 | Request indexing |
| Crawled - currently not indexed | Google systems | N/A | 0 | None |
| **Redirect error** | **Website** | **Not Started** | **3** | **Deploy fix + Validate** |
| Page with redirect | Website | Started | 2 | None (expected) |
| Alternate page with proper canonical tag | Website | Started | 1 | None (expected) |

---

## Vercel Domain Configuration (CRITICAL)

In **Vercel Dashboard → Settings → Domains**, verify:

- `heavymetalstats.com` is the **primary domain** (serves the app)
- `www.heavymetalstats.com` is configured to **redirect to** `heavymetalstats.com`

If www is primary and non-www redirects TO www, **flip them**. This is what originally caused the redirect loop.

---

## Google Search Console Validation Steps

### Step 1: Deploy the fix

Push the current code to `main` to trigger a Vercel deployment. Verify the build succeeds in the Vercel dashboard.

### Step 2: Test live URLs in Search Console

For each URL with a redirect error, verify the fix works:

1. Go to **Google Search Console → URL Inspection**
2. Enter `https://heavymetalstats.com/precious-metals`
3. Click **"Test Live URL"**
4. Confirm: Page fetch succeeds (no redirect error), Indexing allowed = Yes
5. Click **"Request Indexing"**
6. Repeat for:
   - `https://heavymetalstats.com/terms`
   - `https://heavymetalstats.com/api-info`

### Step 3: Request indexing for discovered pages

Also request indexing for the "Discovered - currently not indexed" pages:

1. URL Inspection → `https://heavymetalstats.com/learn/delivery` → **Request Indexing**
2. URL Inspection → `https://heavymetalstats.com/privacy` → **Request Indexing**

### Step 4: Validate the redirect error fix

1. Go to **Page Indexing report** in Search Console
2. Click the **"Redirect error"** row in the "Why pages aren't indexed" table
3. Click **"Validate Fix"**
4. Google will re-check over the next ~2 weeks and send email notifications

### Step 5: Resubmit the sitemap

1. Go to **Search Console → Sitemaps**
2. Submit: `https://heavymetalstats.com/sitemap.xml`
3. This tells Google to re-crawl all pages in the sitemap

---

## All canonical URLs (what Google SHOULD index)

| URL | Current Status | Priority |
|-----|---------------|----------|
| `https://heavymetalstats.com/` | Indexed | 1.0 |
| `https://heavymetalstats.com/precious-metals` | Redirect error → Fix pending deploy | 0.95 |
| `https://heavymetalstats.com/learn` | Indexed | 0.9 |
| `https://heavymetalstats.com/learn/delivery` | Discovered, not crawled | 0.85 |
| `https://heavymetalstats.com/api-info` | Redirect error → Fix pending deploy | 0.7 |
| `https://heavymetalstats.com/about` | Indexed | 0.6 |
| `https://heavymetalstats.com/contact` | Indexed | 0.6 |
| `https://heavymetalstats.com/privacy` | Discovered, not crawled | 0.3 |
| `https://heavymetalstats.com/terms` | Redirect error → Fix pending deploy | 0.3 |

---

## Code changes made (Feb 16, 2026)

1. **Resend API lazy initialization** — `subscribe/route.ts` and `send/route.ts` now use `getResend()` instead of module-level `new Resend()`. Prevents build failures when `RESEND_API_KEY` isn't available during static analysis.
2. **No redirect code anywhere** — `proxy.ts` only sets headers, `next.config.ts` only sets security headers. All redirects handled by Vercel platform.
3. **Canonical tags correct** — Each page has its own `alternates.canonical` in metadata. No hardcoded canonical in `layout.tsx`.
4. **Sitemap correct** — All 9 pages listed with proper URLs.
5. **Robots.txt correct** — Allows Googlebot full access, references sitemap.
