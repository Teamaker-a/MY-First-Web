import { site as fallbackProfile, articles as fallbackArticles } from './data.js?v=20261029a';

const CONTENT_URL = new URL('../content/site.json', import.meta.url);

let cached = null;

function normalizeArticles(list) {
  if (!Array.isArray(list)) return null;
  return list.map((article, index) => ({
    ...article,
    slug: String(article.slug || `post-${index + 1}`).trim() || `post-${index + 1}`,
    title: String(article.title || '无题'),
    date: String(article.date || ''),
    tag: String(article.tag || '随笔'),
    excerpt: String(article.excerpt || ''),
    body: Array.isArray(article.body)
      ? article.body.map((block) => String(block))
      : String(article.body || '')
          .split(/\n\s*\n/)
          .map((block) => block.trim())
          .filter(Boolean),
  }));
}

function fallbackContent() {
  return {
    profile: { ...fallbackProfile },
    articles: normalizeArticles(fallbackArticles) || [],
  };
}

export async function loadSiteContent() {
  if (cached) return cached;
  try {
    const response = await fetch(CONTENT_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`content ${response.status}`);
    const data = await response.json();
    const normalized = normalizeArticles(data.articles);
    const profile =
      data.profile && typeof data.profile === 'object'
        ? { ...fallbackProfile, ...data.profile }
        : { ...fallbackProfile };
    cached = {
      profile,
      articles: normalized ?? normalizeArticles(fallbackArticles) ?? [],
    };
  } catch (error) {
    cached = fallbackContent();
  }
  return cached;
}

export function clearSiteContentCache() {
  cached = null;
}
