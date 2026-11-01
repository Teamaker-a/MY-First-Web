import { works } from './data.js?v=20261029a';
import { loadSiteContent } from './content-store.js?v=20261101a';

const $ = (selector, root = document) => root.querySelector(selector);
const page = document.body.dataset.page;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[char];
  });
}

function safeImageSrc(value) {
  const source = String(value || '').trim();
  if (/^https?:\/\//i.test(source)) return source;
  if (/^(assets\/|\.\/|\.\.\/)/i.test(source)) return source;
  return '';
}

function renderBody(blocks) {
  const list = Array.isArray(blocks) ? blocks : [String(blocks || '')];
  return list
    .map((block) => {
      const text = String(block || '').trim();
      if (!text) return '';
      const image = text.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/);
      if (image) {
        const src = safeImageSrc(image[2]);
        if (!src) return '';
        return `<figure class="letter-figure">
          <img src="${esc(src)}" alt="${esc(image[1])}" loading="lazy">
          <figcaption>${esc(image[1])}</figcaption>
        </figure>`;
      }
      return `<p>${esc(text).replace(/\n/g, '<br>')}</p>`;
    })
    .join('');
}

function workCard(work, index) {
  const number = String(index + 1).padStart(2, '0');
  const hasLink = work.link && work.link !== '#';
  const href = hasLink ? work.link : 'works.html';
  const external = /^https?:/i.test(href);
  const tags = String(work.type || '')
    .split('/')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => `<span class="sb-tag">${esc(tag)}</span>`)
    .join('');
  const tilts = ['-0.35deg', '0.4deg', '-0.15deg'];

  return `
    <a class="sb-work reveal" href="${esc(href)}"${external ? ' target="_blank" rel="noreferrer"' : ''}
       ${hasLink ? '' : 'data-placeholder="true" aria-disabled="true"'}
       style="--accent:${esc(work.accent || '#52604c')};--tilt:${tilts[index % tilts.length]}">
      <span class="sb-tape" aria-hidden="true"></span>
      <div class="sb-work-cover">
        <div class="cover-topline">
          <span>PLATE ${number}</span>
          <span>${esc(work.year)}</span>
        </div>
        <span class="cover-num">${number}</span>
        <span class="cover-bottomline">${esc(work.type)}</span>
      </div>
      <div class="sb-work-body">
        <p class="sb-work-meta">
          <span>${esc(work.type)}</span>
          <span>${esc(work.year)}</span>
        </p>
        <h3>${esc(work.title)}</h3>
        <p>${esc(work.desc)}</p>
        <div class="sb-work-foot">
          <div class="sb-tags">${tags}</div>
          <span class="work-link">${hasLink ? '查看项目 →' : '链接待补充'}</span>
        </div>
      </div>
    </a>`;
}

function renderWorks() {
  const box = $('#worksGrid');
  if (!box) return;
  box.innerHTML = works.map(workCard).join('');
  box.querySelectorAll('.sb-work[data-placeholder="true"]').forEach((card) => {
    card.addEventListener('click', (event) => event.preventDefault());
  });
}

async function renderArticle() {
  const params = new URLSearchParams(window.location.search);
  const rawId = params.get('id') || '0';
  const { articles } = await loadSiteContent();

  let article = null;
  if (/^\d+$/.test(rawId)) article = articles[Number(rawId)] || null;
  if (!article) article = articles.find((item) => item.slug === rawId) || null;
  if (!article) article = articles[0] || null;

  const title = $('#articleTitle');
  const tag = $('#articleTag');
  const meta = $('#articleMeta');
  const body = $('#articleBody');

  if (!article) {
    if (title) title.textContent = '还没有文章';
    if (tag) tag.textContent = 'WRITING';
    if (meta) meta.textContent = 'WRITING';
    if (body) body.innerHTML = '<p>文章正在准备中。</p>';
    document.title = '还没有文章 · 沈旭斐';
    return;
  }

  if (title) title.textContent = article.title;
  if (tag) tag.textContent = `WRITING · ${article.tag}`;
  if (meta) meta.textContent = `${article.date} · 沈旭斐`;
  if (body) body.innerHTML = renderBody(article.body);
  document.title = `${article.title} · 沈旭斐`;
}

function initReveal() {
  const items = Array.from(document.querySelectorAll('.reveal'));
  if (!items.length) return;
  if (!('IntersectionObserver' in window) || reduceMotion) {
    items.forEach((item) => item.classList.add('in'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
  );
  items.forEach((item) => observer.observe(item));

  // Keep content visible even when a browser or an embedded webview
  // fails to deliver IntersectionObserver callbacks.
  window.setTimeout(() => {
    items.forEach((item) => item.classList.add('in'));
    observer.disconnect();
  }, 1400);
}

function initParallax() {
  if (reduceMotion || !canHover) return;
  const layers = Array.from(document.querySelectorAll('[data-depth]'));
  if (!layers.length) return;

  let pointerX = 0;
  let pointerY = 0;
  let scheduled = false;

  const update = () => {
    scheduled = false;
    layers.forEach((layer) => {
      const depth = Number(layer.dataset.depth || 0);
      layer.style.translate = `${(-pointerX * depth * 22).toFixed(1)}px ${(-pointerY * depth * 14).toFixed(1)}px`;
    });
  };

  window.addEventListener(
    'pointermove',
    (event) => {
      pointerX = event.clientX / window.innerWidth - 0.5;
      pointerY = event.clientY / window.innerHeight - 0.5;
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );

  window.addEventListener(
    'pointerleave',
    () => {
      pointerX = 0;
      pointerY = 0;
      requestAnimationFrame(update);
    },
    { passive: true },
  );
}

async function init() {
  if (page === 'works') renderWorks();
  if (page === 'article') await renderArticle();
  initReveal();
  initParallax();
}

init();
