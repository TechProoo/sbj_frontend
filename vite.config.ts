import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

/*
 * robots.txt and sitemap.xml both have to name the site's real origin, and
 * Vite only substitutes `%VITE_*%` inside index.html — anything dropped in
 * public/ is copied verbatim. So they are generated here instead, from the
 * same VITE_SITE_URL the meta tags use, and served in dev as well so the two
 * cannot drift.
 */
function seoFiles(siteUrl: string): Plugin {
  const origin = siteUrl.replace(/\/$/, '');

  const robots = `# SBJ Foods and Drinks

User-agent: *
Allow: /

# Nothing useful to a search engine, and an order URL is somebody's receipt.
Disallow: /checkout
Disallow: /order/
Disallow: /payment/
Disallow: /track

# Link previews depend on these fetching the page and its og:image, so they
# are never blocked.
User-agent: facebookexternalhit
Allow: /

User-agent: Twitterbot
Allow: /

Sitemap: ${origin}/sitemap.xml
`;

  const page = (path: string, freq: string, priority: string) =>
    `  <url>\n    <loc>${origin}${path}</loc>\n    <changefreq>${freq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Only pages worth indexing. Checkout, receipts, the payment callback and
     tracking are per-customer or transient, and are excluded here and in
     robots.txt. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${page('/', 'weekly', '1.0')}
${page('/menu', 'daily', '0.9')}
${page('/feed', 'daily', '0.6')}
</urlset>
`;

  const files: Record<string, string> = {
    '/robots.txt': robots,
    '/sitemap.xml': sitemap,
  };

  return {
    name: 'sbj-seo-files',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const body = req.url ? files[req.url.split('?')[0]] : undefined;
        if (!body) return next();
        res.setHeader(
          'Content-Type',
          req.url?.startsWith('/sitemap')
            ? 'application/xml; charset=utf-8'
            : 'text/plain; charset=utf-8',
        );
        res.end(body);
      });
    },

    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots });
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const siteUrl = env.VITE_SITE_URL ?? 'https://sbjfoods.netlify.app';

  return {
    plugins: [react(), seoFiles(siteUrl)],
    server: { port: 5173 },
  };
});
