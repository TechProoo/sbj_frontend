# SEO — what is set up, and what you still have to do

Everything here is already wired. The list at the bottom is the part that
needs your real business details, and it matters more for a restaurant than
any of the technical work.

---

## What is in place

**`index.html`** carries the static tags: title, description, canonical,
robots, full Open Graph, a Twitter `summary_large_image` card, and a
`Restaurant` JSON-LD block. Every URL in it is built from `VITE_SITE_URL`,
substituted at build time.

**`src/lib/seo.ts`** exports `useSeo()`. Each page calls it to set its own
title, description, canonical and robots tag when the route changes.

**`vite.config.ts`** generates `robots.txt` and `sitemap.xml` from the same
`VITE_SITE_URL`, both at build time and in `vite dev`, so the two can never
disagree about the site's address.

**`public/og/share.jpg`** is the 1200×630 card people see when the link is
pasted into WhatsApp, Instagram DMs, Facebook or X.

### Which pages are indexed

| Route | Indexed | Why |
| --- | --- | --- |
| `/` | yes | |
| `/menu` | yes | The page most likely to rank — it has the dish names on it |
| `/feed` | yes | |
| `/checkout` | no | Nothing for a search engine to read |
| `/order/:id` | no | Somebody's receipt |
| `/payment/callback` | no | Carries a payment reference |
| `/track` | no | A per-customer lookup |

The excluded routes are blocked twice — `noindex` from `useSeo`, and a
`Disallow` in `robots.txt`.

---

## One limitation worth understanding

`useSeo` runs in JavaScript. Google renders pages, so it sees the per-route
titles and descriptions. **WhatsApp, Facebook and X do not run JavaScript when
they scrape a link** — they read the raw HTML and stop.

In practice: every link anyone shares, whatever page it points at, shows the
home page's card — the SBJ name, the tagline and `share.jpg`. That is a
perfectly good outcome and most restaurants ship exactly this. It only becomes
a problem if you want a shared `/menu` link to preview differently from the
home page.

Fixing it properly means prerendering the HTML for each route at build time
(`vite-plugin-prerender` or similar) or moving to a framework that renders on
the server. That is a real change to how the site is built, so it is not worth
doing until you actually want it.

---

## Before launch — the part that needs you

### 1. Set the real domain

`VITE_SITE_URL` in [netlify.toml](netlify.toml) is currently
`https://sbjfoods.netlify.app`. The moment a custom domain is attached, change
it and redeploy.

It has to be the exact origin customers visit, including whether you keep
`www.` or not. If it points at the wrong host, every canonical tag on the site
is telling Google that the real site is a duplicate of somewhere else — that
is worse than having no SEO at all.

It is baked in at build time, so changing it needs a redeploy, not a restart.

### 2. ~~Fill in the address and phone number~~ — done

The JSON-LD now carries the real ones:

```
Independence Hall Cafeteria, Great Independence Hall, University of Ibadan
Ibadan, Oyo State
+234 911 237 8705
```

**Check the delivery zones.** The site currently names Agbowo, Sango, Bodija
and Orogun as the areas served beyond campus. Those are my pick of the
neighbourhoods next to UI, not something you told me — change them in
[index.html](index.html) (`areaServed`) and
[src/components/Footer.tsx](src/components/Footer.tsx) if you cover different
ground.

### 3. Create a Google Business Profile

This is the single highest-value item on the list, and it is not something
code can do.

When a student searches "food near UI" or "jollof Agbowo", the
map pack at the top of the results comes from Google Business Profile, not
from the website. Claim the listing at
[business.google.com](https://business.google.com), use the **same** name,
address and phone number as above — Google cross-checks them and a mismatch
quietly costs you the listing — add photos, and set the opening hours to match
(the site declares 08:00–21:30 daily; change both if that is wrong).

### 4. Submit the sitemap

Once the domain is live, add the site in
[Google Search Console](https://search.google.com/search-console) and submit
`https://yourdomain/sitemap.xml`. This is also where you find out if anything
is broken.

### 5. Replace the placeholder content

The testimonials and the promotions carousel currently hold seeded
placeholders, clearly labelled as such in the database. Real reviews from real
customers are worth far more here than anything else on this list — and
publishing invented ones is both dishonest and, for a business, unlawful
advertising in most places.

---

## Checking your work

After deploying:

- **Rich results** — paste the URL into
  [search.google.com/test/rich-results](https://search.google.com/test/rich-results).
  It should find the `Restaurant` block.
- **Share card** — paste the URL into
  [developers.facebook.com/tools/debug](https://developers.facebook.com/tools/debug/)
  and hit *Scrape Again*. Do this after any change to `share.jpg`, because
  Facebook caches the old image for days otherwise.
- **robots and sitemap** — open `/robots.txt` and `/sitemap.xml` directly and
  confirm they name the real domain, not `sbjfoods.netlify.app`.
- **Per-route titles** — open `/menu` and check the browser tab says
  "The full menu · SBJ Foods and Drinks".
