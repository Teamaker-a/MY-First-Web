import { site as fallbackProfile, articles as fallbackArticles, travel as fallbackTravel, works as fallbackWorks } from './data.js?v=20261029a';

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

function normalizeWorks(list) {
  if (!Array.isArray(list)) return null;
  return list.map((work, index) => ({
    ...work,
    title: String(work.title || `作品 ${index + 1}`),
    type: String(work.type || '网页 / 排版'),
    year: String(work.year || ''),
    desc: String(work.desc || ''),
    link: String(work.link || ''),
    accent: String(work.accent || '#52604c'),
    cover: String(work.cover || ''),
  }));
}

function normalizePhoto(photo, index) {
  if (!photo || typeof photo !== 'object') {
    return { src: '', caption: `第 ${index + 1} 张` };
  }
  return {
    ...photo,
    src: String(photo.src || ''),
    caption: String(photo.caption || `第 ${index + 1} 张`),
  };
}

function normalizeTravel(source) {
  const raw = source && typeof source === 'object' ? source : fallbackTravel;
  const places = {};
  Object.entries(raw.places || {}).forEach(([name, place]) => {
    if (!place || typeof place !== 'object') return;
    places[name] = {
      ...place,
      title: String(place.title || ''),
      subtitle: String(place.subtitle || ''),
      note: String(place.note || ''),
      wish: Boolean(place.wish),
      photos: Array.isArray(place.photos)
        ? place.photos.map(normalizePhoto)
        : [],
    };
  });
  return {
    demo: Boolean(raw.demo),
    visited: Array.isArray(raw.visited) ? raw.visited.map(String) : [],
    wishlist: Array.isArray(raw.wishlist) ? raw.wishlist.map(String) : [],
    places,
  };
}

function fallbackContent() {
  return {
    profile: { ...fallbackProfile },
    articles: normalizeArticles(fallbackArticles) || [],
    travel: normalizeTravel(fallbackTravel),
    works: normalizeWorks(fallbackWorks) || [],
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
      travel: normalizeTravel(data.travel && typeof data.travel === 'object' ? data.travel : fallbackTravel),
      works: normalizeWorks(data.works) ?? normalizeWorks(fallbackWorks) ?? [],
    };
  } catch (error) {
    cached = fallbackContent();
  }
  return cached;
}

export function clearSiteContentCache() {
  cached = null;
}
