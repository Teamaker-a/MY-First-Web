import { loadSiteContent } from './content-store.js?v=20261101a';

const $ = (selector, root = document) => root.querySelector(selector);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

const list = $('#roomLetters');
const papers = ['letter-paper--blossom', 'letter-paper--butterfly', 'letter-paper--plain'];
const rotations = ['-1.4deg', '1deg', '2.1deg'];

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[char];
  });
}

function renderLetters(articles) {
  if (!list) return;
  if (!articles.length) {
    list.innerHTML = '<p class="letter-empty">信纸还在准备中。</p>';
    return;
  }
  list.innerHTML = articles
    .map(
      (article, index) => `
        <a class="letter-card letter-card--${index + 1}"
           href="article.html?id=${encodeURIComponent(article.slug || index)}"
           aria-label="阅读：${esc(article.title)}"
           style="--rot:${rotations[index % rotations.length]};--delay:${0.16 + index * 0.16}s"
           data-depth="${0.12 + index * 0.06}">
          <div class="letter-paper ${papers[index % papers.length]}">
            <div class="letter-content">
              <p class="letter-meta">${esc(article.date)} <span>·</span> ${esc(article.tag)}</p>
              <h2>${esc(article.title)}</h2>
              <p class="letter-excerpt">${esc(article.excerpt)}</p>
              <span class="letter-cta">展信 →</span>
            </div>
            <span class="letter-wax">S</span>
          </div>
        </a>`,
    )
    .join('');
}

function initParallax() {
  if (!canHover || reduceMotion) return;
  const depthElements = Array.from(document.querySelectorAll('[data-depth]'));
  if (!depthElements.length) return;
  let pointerX = 0;
  let pointerY = 0;
  let scheduled = false;

  const update = () => {
    scheduled = false;
    depthElements.forEach((element) => {
      const depth = Number(element.dataset.depth || 0);
      element.style.translate = `${(-pointerX * depth * 20).toFixed(1)}px ${(-pointerY * depth * 13).toFixed(1)}px`;
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
  try {
    const { articles } = await loadSiteContent();
    renderLetters(articles);
  } catch (error) {
    renderLetters([]);
  }
  initParallax();
}

init();
