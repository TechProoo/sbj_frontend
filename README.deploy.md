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

Set these under **Site configuration → Environment variables**.

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | `https://your-api-host/api` |
| `VITE_VAPID_PUBLIC_KEY` | the public half of the API's VAPID pair |

**These are compiled into the bundle, not read at runtime.** Changing either
one needs a fresh deploy — clearing the cache and redeploying, not just
restarting. Anything not prefixed `VITE_` is invisible to the browser, which
is why no secret belongs here.

`VITE_VAPID_PUBLIC_KEY` is optional: left unset, the app asks the API at
`/push/key` instead. Setting it saves one request on the first subscribe.

## 3. Three things to change on the API side

The storefront cannot work alone. Once you know the Netlify URL:

1. **`CORS_ORIGINS`** in `backend/.env` must include the deployed origin, e.g.
   `https://sbjfoods.netlify.app`. Without it every API call fails CORS and the
   menu never loads.
2. **`PAYSTACK_CALLBACK_URL`** must become
   `https://sbjfoods.netlify.app/payment/callback`. It still points at
   localhost, so a live customer would be redirected to their own machine
   after paying.
3. **The API must be served over HTTPS.** Netlify serves the site over TLS, and
   a browser blocks a plain-HTTP request or websocket from an HTTPS page as
   mixed content. This applies to the realtime gateway too.

Deploy previews get their own URL per pull request. If you want previews to
work against the API, add the wildcard to `CORS_ORIGINS` as well.

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
