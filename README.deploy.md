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

**One thing blocks the deploy today: CORS.** The API currently returns an
`access-control-allow-origin` header for `http://localhost:5173` but none for
a Netlify origin, so `CORS_ORIGINS` on Railway is still the local default. As
it stands the deployed site will load its shell and then fail every API call —
an empty menu, with the real reason only visible in the browser console.

Set these three on **Railway**, not in `backend/.env` (that file is local only
and is not deployed):

1. **`CORS_ORIGINS`** — add the Netlify origin, comma-separated:
   `https://your-site.netlify.app,http://localhost:5173,http://localhost:5174`
2. **`PAYSTACK_CALLBACK_URL`** — `https://your-site.netlify.app/payment/callback`.
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

Deploy previews get their own URL per pull request. If you want previews to
work against the API, add those origins to `CORS_ORIGINS` too.

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
