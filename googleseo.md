# Google Search Console — Indexing Issues & Fixes

## Issue 1: "Page with redirect" (NOT a problem)

**Affected URLs:**
- `http://heavymetalstats.com/` (Last crawled: Jan 29, 2026)
- `http://www.heavymetalstats.com/` (Last crawled: Jan 24, 2026)

**Google docs say:**
> "This is a non-canonical URL that redirects to another page. As such, this URL will not be indexed. The target URL of the redirect might or might not be indexed, depending on what Google thinks about that target URL."

**Diagnosis:** These are HTTP and/or www variants that correctly 301-redirect to the canonical `https://heavymetalstats.com/`. This is **expected and correct behavior** — Google is confirming the redirects work. The canonical homepage IS indexed. No action needed.

---

## Issue 2: "Alternate page with proper canonical tag" (NOT a problem)

**Affected URLs:**
- `https://www.heavymetalstats.com/` (Last crawled: Feb 3, 2026)

**Google docs say:**
> "This page is marked as an alternate of another page... This page correctly points to the canonical page, which is indexed, so there is nothing you need to do."

**Diagnosis:** The www HTTPS variant has the correct canonical tag pointing to `https://heavymetalstats.com/`. Google recognizes the relationship and indexes only the canonical. The middleware 301 redirect + metadata canonical are both working correctly. No action needed.

---

## Issue 3: "Discovered - currently not indexed" (FIXED)

**Affected URLs:**
- `https://heavymetalstats.com/api-info` (Last crawled: N/A)
- `https://heavymetalstats.com/privacy` (Last crawled: N/A)
- `https://heavymetalstats.com/terms` (Last crawled: N/A)

**Google docs say:**
> "The page was found by Google, but not crawled yet. Typically, Google wanted to crawl the URL but this was expected to overload the site; therefore Google rescheduled the crawl. This is why the last crawl date is empty on the report."

**Diagnosis:** "Last crawled: N/A" means Google has NEVER visited these pages — it only discovered they exist (from the sitemap or internal links) but chose not to crawl them.

### Root cause found: Conflicting canonical tag in layout.tsx

`app/layout.tsx` had a **hardcoded** `<link rel="canonical" href="https://heavymetalstats.com" />` inside the `<head>` tag. This raw HTML element rendered on EVERY page of the site, regardless of what each page's Next.js metadata `alternates.canonical` was set to.

This meant:
- `/api-info` told Google its canonical was `https://heavymetalstats.com` (the homepage)
- `/privacy` told Google its canonical was `https://heavymetalstats.com` (the homepage)
- `/terms` told Google its canonical was `https://heavymetalstats.com` (the homepage)
- `/learn` told Google its canonical was `https://heavymetalstats.com` (the homepage)

Google interpreted these pages as duplicates of the homepage and deprioritized crawling them entirely.

### Fixes applied:

1. **Removed the hardcoded `<link rel="canonical">` from `app/layout.tsx`** — Next.js now handles canonicals per-page via the `alternates.canonical` metadata export on each page (which was already set correctly on every page).

2. **Added footer navigation to ALL pages** — Every page now links to every other page via a footer nav. This creates a strong internal link graph so Google can discover and crawl all pages from any entry point:
   - `app/learn/page.tsx` — Added footer nav
   - `app/learn/delivery/page.tsx` — Added footer nav
   - `app/privacy/page.tsx` — Added footer nav
   - `app/terms/page.tsx` — Added footer nav
   - `app/api-info/page.tsx` — Added footer nav
   - `app/page.tsx` — Already had footer nav (added previously)
   - `app/precious-metals/page.tsx` — Already had footer nav

---

## Action items (manual steps in Google Search Console)

After deploying these fixes:

1. **Request indexing for each affected URL:**
   - Go to Google Search Console → URL Inspection
   - Enter each URL one at a time:
     - `https://heavymetalstats.com/api-info`
     - `https://heavymetalstats.com/privacy`
     - `https://heavymetalstats.com/terms`
     - `https://heavymetalstats.com/precious-metals` (new page)
   - Click "Request Indexing" for each

2. **Resubmit the sitemap:**
   - Go to Search Console → Sitemaps
   - Submit `https://heavymetalstats.com/sitemap.xml`

3. **Validate fix for "Discovered - currently not indexed":**
   - In the Page Indexing report, click on the "Discovered - currently not indexed" row
   - Click "Validate Fix" to tell Google you've addressed the issue
   - Google will re-check the affected URLs over the next ~2 weeks

4. **Monitor:** Check back in 1-2 weeks. The "Page with redirect" and "Alternate page with proper canonical tag" entries will remain — that's normal and expected. The "Discovered - currently not indexed" entries should transition to "Indexed" once Google recrawls.

---

## Summary of all canonical URLs (what Google SHOULD index)

| URL | Status | Priority |
|-----|--------|----------|
| `https://heavymetalstats.com/` | Indexed | 1.0 |
| `https://heavymetalstats.com/precious-metals` | Pending index | 0.95 |
| `https://heavymetalstats.com/learn` | Indexed | 0.9 |
| `https://heavymetalstats.com/learn/delivery` | Pending index | 0.85 |
| `https://heavymetalstats.com/api-info` | Discovered, not indexed → Fix deployed | 0.7 |
| `https://heavymetalstats.com/privacy` | Discovered, not indexed → Fix deployed | 0.3 |
| `https://heavymetalstats.com/terms` | Discovered, not indexed → Fix deployed | 0.3 |
