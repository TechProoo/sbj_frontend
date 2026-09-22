/*
 * Regenerates public/og/share.jpg — the 1200x630 card WhatsApp, Facebook and
 * X show when somebody pastes a link to the site.
 *
 * Run it after changing the name, the strapline, the delivery zones or the
 * phone number, so the card cannot drift from the meta tags:
 *
 *     npm install --no-save sharp
 *     node scripts/og-card.mjs
 *
 * sharp is not a dependency of the app — it is only needed here, and the card
 * is regenerated rarely enough that carrying it in node_modules is not worth
 * the install time.
 *
 * Afterwards, force the scrapers to re-read it. They cache a preview for days:
 * Facebook and Instagram via developers.facebook.com/tools/debug (Scrape
 * Again); WhatsApp has no debugger and clears on its own, though a URL with a
 * fresh query string (?v=2) previews immediately.
 */
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Resolved from this file, so it works whatever the working directory is.
const ROOT = fileURLToPath(new URL('../public', import.meta.url));
const W = 1200, H = 630;
const VERMILLION = '#e8431f';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="scrim" x1="0" y1="0" x2="1" y2="0.35">
      <stop offset="0%"   stop-color="#0d0d0d" stop-opacity="0.94"/>
      <stop offset="55%"  stop-color="#0d0d0d" stop-opacity="0.82"/>
      <stop offset="100%" stop-color="#0d0d0d" stop-opacity="0.42"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#scrim)"/>
  <rect x="0" y="0" width="14" height="${H}" fill="${VERMILLION}"/>

  <text x="72" y="118" font-family="Archivo, 'Segoe UI', Arial, sans-serif"
        font-size="26" font-weight="700" letter-spacing="5.5" fill="${VERMILLION}">
    ${esc('UI, IBADAN · DELIVERY · PICKUP')}
  </text>

  <text x="68" y="248" font-family="Archivo, 'Segoe UI Black', Arial, sans-serif"
        font-size="92" font-weight="900" letter-spacing="-2.5" fill="#ffffff">SBJ Foods</text>
  <text x="68" y="342" font-family="Archivo, 'Segoe UI Black', Arial, sans-serif"
        font-size="92" font-weight="900" letter-spacing="-2.5" fill="#ffffff">and Drinks</text>

  <rect x="72" y="382" width="86" height="5" fill="${VERMILLION}"/>

  <text x="72" y="444" font-family="Archivo, 'Segoe UI', Arial, sans-serif"
        font-size="31" font-weight="600" fill="#ffffff" opacity="0.94">
    ${esc('Cooked to order at the Indy Hall cafeteria.')}
  </text>

  <text x="72" y="500" font-family="Archivo, 'Segoe UI', Arial, sans-serif"
        font-size="24" font-weight="500" fill="#ffffff" opacity="0.66">
    ${esc('Jollof · Swallow and soup · Shawarma · Small chops · Drinks')}
  </text>

  <text x="72" y="556" font-family="Archivo, 'Segoe UI', Arial, sans-serif"
        font-size="24" font-weight="700" fill="${VERMILLION}">
    ${esc('Campus · Agbowo · Sango · Bodija · Orogun   ·   0911 237 8705')}
  </text>
</svg>`;

const logo = await sharp(`${ROOT}/brand/sbj-logo.png`)
  .resize(152, 152, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

await sharp(`${ROOT}/menu/jollof-rice.jpg`)
  .resize(W, H, { fit: 'cover', position: 'right' })
  .modulate({ brightness: 0.78 })
  .composite([
    { input: Buffer.from(svg), top: 0, left: 0 },
    { input: logo, top: 58, left: W - 152 - 64 },
  ])
  // Baseline, NOT progressive. mozjpeg defaults to progressive, and some link
  // scrapers (WhatsApp among them) are unreliable with progressive JPEGs —
  // not a risk worth taking on the one image the whole preview depends on.
  .jpeg({ quality: 86, progressive: false, mozjpeg: false, chromaSubsampling: '4:4:4' })
  .toFile(`${ROOT}/og/share.jpg`);

const meta = await sharp(`${ROOT}/og/share.jpg`).metadata();
console.log(`share.jpg  ${meta.width}x${meta.height}  ${(readFileSync(`${ROOT}/og/share.jpg`).length / 1024).toFixed(0)} KB`);
