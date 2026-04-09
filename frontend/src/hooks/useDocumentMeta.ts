import { useEffect } from 'react';

interface DocumentMetaOptions {
  /** Page title — will be appended with " | Inspi" */
  title?: string;
  /** Meta description */
  description?: string;
  /** Canonical URL path (e.g. "/sessions/my-session") */
  url?: string;
  /** OG/Twitter image URL */
  image?: string | null;
  /** Content type for og:type (default: "website") */
  type?: string;
}

function setMetaTag(property: string, content: string, isOg = false) {
  const attr = isOg ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Sets document title, meta description, Open Graph, and Twitter Card tags.
 * Tags are cleaned up on unmount (title reset, meta content cleared).
 */
export function useDocumentMeta({
  title,
  description,
  url,
  image,
  type = 'website',
}: DocumentMetaOptions) {
  useEffect(() => {
    const prevTitle = document.title;

    if (title) {
      document.title = `${title} | Inspi`;
      setMetaTag('og:title', title, true);
      setMetaTag('twitter:title', title);
    }

    if (description) {
      setMetaTag('description', description);
      setMetaTag('og:description', description, true);
      setMetaTag('twitter:description', description);
    }

    setMetaTag('og:type', type, true);
    setMetaTag('twitter:card', image ? 'summary_large_image' : 'summary');

    if (url) {
      const fullUrl = `${window.location.origin}${url}`;
      setMetaTag('og:url', fullUrl, true);

      // Set canonical link
      let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!canonical) {
        canonical = document.createElement('link');
        canonical.setAttribute('rel', 'canonical');
        document.head.appendChild(canonical);
      }
      canonical.setAttribute('href', fullUrl);
    }

    if (image) {
      setMetaTag('og:image', image, true);
      setMetaTag('twitter:image', image);
    }

    setMetaTag('og:site_name', 'Inspi – Gruppenstunden-Inspirator', true);

    return () => {
      document.title = prevTitle;
    };
  }, [title, description, url, image, type]);
}
