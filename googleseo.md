# Google Search Console — Indexing Issues & Fixes

## Issue 1: "Page with redirect" (NOT a problem)

**Affected URLs:**
- `http://heavymetalstats.com/` (Last crawled: Jan 29, 2026)
- `http://www.heavymetalstats.com/` (Last crawled: Jan 24, 2026)

**Google docs say:**
> "This is a non-canonical URL that redirects to another page. As such, this URL will not be indexed. The target URL of the redirect might or might not be indexed."

**Diagnosis:** These are HTTP and/or www variants that correctly 301-redirect to the canonical `https://heavymetalstats.com/`. This is **expected and correct behavior** — Google is confirming the redirects work. The canonical homepage IS indexed. No action needed.

---

## Issue 2: "Alternate page with proper canonical tag" (NOT a problem)

**Affected URLs:**
- `https://www.heavymetalstats.com/` (Last crawled: Feb 3, 2026)

**Google docs say:**
> "This page is marked as an alternate of another page... This page correctly points to the canonical page, which is indexed, so there is nothing you need to do."

**Diagnosis:** The www HTTPS variant has the correct canonical tag pointing to `https://heavymetalstats.com/`. Google recognizes the relationship and indexes only the canonical. No action needed.

---

## Issue 3: "Failed: Redirect error" on /privacy and other pages (FIXED Feb 11)

**Affected URLs:**
- `https://heavymetalstats.com/privacy` — Live test returned **Redirect error**
- `https://heavymetalstats.com/api-info` — Discovered, never crawled
- `https://heavymetalstats.com/terms` — Discovered, never crawled

**Google Search Console live test result for /privacy (Feb 11, 10:05 PM):**
- Crawl allowed? Yes
- Page fetch: **error — Failed: Redirect error**
- Indexing allowed? N/A
- User-declared canonical: N/A
- Google-selected canonical: Only determined after indexing

**Google docs say:**
> "Redirect error: Google experienced one of the following redirect errors: A redirect chain that was too long, A redirect loop, A redirect URL that eventually exceeded the max URL length, A bad or empty URL in the redirect chain."

### Root cause: Redirect loop between middleware and Vercel

The `middleware.ts` had a www→non-www 301 redirect. But Vercel's domain configuration ALSO handles this redirect at the platform level. When both fired, Google hit a **redirect loop**:

1. Request to `heavymetalstats.com/privacy`
2. Vercel platform redirect → `www.heavymetalstats.com/privacy` (if www is primary domain)
3. Middleware redirect → `heavymetalstats.com/privacy` (strips www)
4. → Back to step 2 (infinite loop)

### Fix applied:

**Removed the www→non-www redirect from `middleware.ts`.** Vercel's platform-level domain config handles this on its own. The middleware now only sets security headers — no redirects.

### Previous fix also applied: Hardcoded canonical removed

`app/layout.tsx` previously had a hardcoded `<link rel="canonical" href="https://heavymetalstats.com" />` in the `<head>` that rendered on EVERY page, telling Google all pages were duplicates of the homepage. This was removed — Next.js metadata `alternates.canonical` now handles per-page canonicals correctly.

### Also applied: Footer navigation on all pages

Every page now links to every other page via a footer nav, creating a strong internal link graph for Google to crawl.

---

## IMPORTANT: Check Vercel domain settings

In **Vercel Dashboard → Settings → Domains**, make sure:
- `heavymetalstats.com` is the **primary domain** (not a redirect)
- `www.heavymetalstats.com` is listed with a **redirect to** `heavymetalstats.com`

If it's the other way around (www is primary, non-www redirects TO www), **flip them**. This is what caused the redirect loop.

---

## Action items (manual steps after deploying)

1. **Verify Vercel domain config** (see above — non-www must be primary)

2. **Test live URLs in Search Console:**
   - Go to URL Inspection → enter `https://heavymetalstats.com/privacy`
   - Click "Test Live URL" — confirm page fetch succeeds (no redirect error)
   - Do the same for `/api-info`, `/terms`, `/precious-metals`

3. **Request indexing** for each URL after confirming no redirect error

4. **Resubmit the sitemap:**
   - Go to Search Console → Sitemaps
   - Submit `https://heavymetalstats.com/sitemap.xml`

5. **Validate fix:**
   - In the Page Indexing report, click "Discovered - currently not indexed"
   - Click "Validate Fix"
   - Google will re-check over the next ~2 weeks

---

## Summary of all canonical URLs (what Google SHOULD index)

| URL | Status | Priority |
|-----|--------|----------|
| `https://heavymetalstats.com/` | Indexed | 1.0 |
| `https://heavymetalstats.com/precious-metals` | Pending index | 0.95 |
| `https://heavymetalstats.com/learn` | Indexed | 0.9 |
| `https://heavymetalstats.com/learn/delivery` | Pending index | 0.85 |
| `https://heavymetalstats.com/api-info` | Redirect error → Fix deployed | 0.7 |
| `https://heavymetalstats.com/privacy` | Redirect error → Fix deployed | 0.3 |
| `https://heavymetalstats.com/terms` | Redirect error → Fix deployed | 0.3 |
