# Deploying the storefront to Netlify

The customer site is a static SPA. `netlify.toml` in this directory holds the
build command, the SPA redirect, cache headers and security headers — Netlify
reads it automatically, so there is nothing to configure in the UI except the
environment variables below.

## 1. Create the site

This repository *is* the site root, so leave the base directory empty.

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Node version | `22` (pinned in `netlify.toml`) |

## 2. Environment variables

`VITE_API_URL` is already set in `netlify.toml`, pointing at the API on
Railway:

```text
https://sbjbackend-production.up.railway.app/api
```

So there is nothing to add in the Netlify UI. If you move the API, change it
there rather than in the UI, so the value lives in one place.

**It is compiled into the bundle, not read at runtime.** Changing it needs a
fresh deploy, not just a restart. Anything not prefixed `VITE_` is invisible
to the browser, which is why no secret belongs here.

`VITE_VAPID_PUBLIC_KEY` is intentionally left unset. The app then asks the API
at `/push/key` for it, which means rotating the server's VAPID pair cannot
leave a stale key baked into the bundle and break push silently.

## 3. Before this works: the API side

Verified against the live API on 2026-09-22 — it is healthy, the database is
up, Paystack is enabled (test keys) and push is configured.

**One thing blocks the deploy: CORS.** `CORS_ORIGINS` on Railway is still the
local default, so the deployed site loads its shell and then fails every API
call — an empty menu, with the real reason only visible in the console.

The symptom is easy to misread. The preflight comes back `204` carrying
`access-control-allow-credentials`, `access-control-allow-methods` and
`access-control-allow-headers`, which looks like a working CORS response. The
one header missing is `access-control-allow-origin`: Nest's CORS layer omits
it entirely when the origin is not on the allowlist, rather than returning an
error. So a `204` here still means *rejected*.

Set these three on **Railway**, not in `backend/.env` (that file is local only
and is not deployed). The site is live at `https://sbjfoods.netlify.app`, so
these are the literal values:

1. **`CORS_ORIGINS`** — paste exactly this, no spaces after the commas and no
   trailing slash on any entry:

   ```text
   https://sbjfoods.netlify.app,http://localhost:5173,http://localhost:5174
   ```

   The match is an exact string compare against the browser's `Origin` header.
   `https://sbjfoods.netlify.app/` with a trailing slash does not match, and
   neither does the `http://` spelling.

2. **`PAYSTACK_CALLBACK_URL`** — `https://sbjfoods.netlify.app/payment/callback`.
   It still points at localhost, so a live customer would be redirected to
   their own machine after paying.
3. **`PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY`** — still `sk_test_` /
   `pk_test_`. Fine for testing; swap for the live pair before taking real
   money.

The websocket needs nothing. The gateway sets its own CORS to reflect any
origin, so realtime already works from a Netlify origin — verified by
handshake. That asymmetry is worth knowing: if the site goes live before
`CORS_ORIGINS` is fixed, order updates will stream in fine while every REST
call fails, which looks like a very confusing partial outage.

Deploy previews get their own URL per pull request
(`https://deploy-preview-7--sbjfoods.netlify.app`), and an exact-match
allowlist cannot cover them. Either add each preview origin by hand, or change
`main.ts` to take a predicate instead of an array. Nothing here needs it yet.

### Checking it from the terminal

Whether the fix has landed is one command — no browser needed:

```bash
curl -sD - -o /dev/null -X OPTIONS \
  -H 'Origin: https://sbjfoods.netlify.app' \
  -H 'Access-Control-Request-Method: GET' \
  https://sbjbackend-production.up.railway.app/api/testimonials \
  | grep -i access-control-allow-origin
```

One line back means it works. No output means the origin is still rejected.

## 4. What the config does, and why

**The SPA redirect matters more than it looks.** Every route below `/` is owned
by React Router, so `/menu`, `/track` and `/order/:id` only exist client-side.
The one that really counts is `/payment/callback`: Paystack sends the customer
there as a full cross-site navigation, requested cold from the server. Without
the `/* → /index.html 200` rule that request 404s, and to the customer a 404
after paying is indistinguishable from a payment that took their money and
vanished.

**`sw.js` is served `must-revalidate`.** A service worker cached at the edge
pins every returning device to an old build with no way to update itself.

**`/assets/*` is immutable for a year.** Vite fingerprints those filenames, so
the name changes whenever the content does. The images under `/menu`,
`/brand` and `/icons` keep their names across deploys, so they revalidate
instead.

**There is no Content-Security-Policy.** A correct one has to name the API
origin, the websocket origin, Paystack and Google Fonts, and those differ
between deploys. A CSP written without knowing them fails closed and takes
checkout down silently. Add one once the hosts are fixed — it needs at least
`connect-src` for the API and `wss:`, plus `fonts.googleapis.com` and
`fonts.gstatic.com` for the Archivo stylesheet.

## 5. Known rough edge

The bundle is ~518 kB (~169 kB gzipped), mostly GSAP, React and the router. It
builds and ships fine; if first paint on a slow Nigerian mobile connection
becomes a concern, route-level `React.lazy` on `/checkout` and `/track` is the
cheapest win.
