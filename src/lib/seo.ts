import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/*
 * Per-route title, description and canonical.
 *
 * WORTH KNOWING: this runs in JavaScript, so it reaches Google (which renders
 * pages) but NOT WhatsApp, Facebook or X, whose scrapers only read the raw
 * HTML. Those always see the static tags in index.html. That is fine — every
 * share shows the same brand card — but it does mean a link to /menu will not
 * preview differently from the home page. Fixing that properly needs
 * prerendering or SSR; see README.seo.md.
 */

export const SITE_URL = (
  import.meta.env.VITE_SITE_URL ?? 'https://sbjfoods.netlify.app'
).replace(/\/$/, '');

const DEFAULT_TITLE =
  'SBJ Foods and Drinks — Nigerian food delivery in Lagos';

const DEFAULT_DESCRIPTION =
  'Jollof, swallow and soup, shawarma and small chops, cooked to order in Lagos. Delivery to Ikeja, Yaba, Surulere and Lekki, or collect in store. Plates from ₦200.';

export interface SeoOptions {
  title?: string;
  description?: string;
  /// Path only, e.g. "/menu". Defaults to the current location.
  path?: string;
  /// Order pages and the like must never be indexed.
  noIndex?: boolean;
}

function setMeta(selector: string, attr: string, value: string): void {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    const [key, val] = selector.replace(/^meta\[|\]$/g, '').split('=');
    tag.setAttribute(key, val.replace(/"/g, ''));
    document.head.appendChild(tag);
  }
  tag.setAttribute(attr, value);
}

function setCanonical(href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
}

export function useSeo({
  title,
  description,
  path,
  noIndex = false,
}: SeoOptions): void {
  const { pathname } = useLocation();
  const url = `${SITE_URL}${path ?? pathname}`;

  useEffect(() => {
    const fullTitle = title
      ? `${title} · SBJ Foods and Drinks`
      : DEFAULT_TITLE;
    const desc = description ?? DEFAULT_DESCRIPTION;

    document.title = fullTitle;
    setMeta('meta[name="description"]', 'content', desc);
    setCanonical(url);

    // Keep og/twitter in step for anything that does run JS, such as an
    // in-app browser preview.
    setMeta('meta[property="og:title"]', 'content', fullTitle);
    setMeta('meta[property="og:description"]', 'content', desc);
    setMeta('meta[property="og:url"]', 'content', url);
    setMeta('meta[name="twitter:title"]', 'content', fullTitle);
    setMeta('meta[name="twitter:description"]', 'content', desc);

    setMeta(
      'meta[name="robots"]',
      'content',
      noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
    );
  }, [title, description, url, noIndex]);
}
