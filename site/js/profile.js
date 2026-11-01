import { loadSiteContent } from './content-store.js?v=20261101a';

const setAll = (selector, value) => {
  const text = String(value || '').trim();
  if (!text) return;
  document.querySelectorAll(selector).forEach((element) => {
    element.textContent = text;
  });
};

async function init() {
  try {
    const { profile } = await loadSiteContent();
    setAll('[data-profile-name]', profile.name);
    setAll('[data-profile-tagline]', profile.tagline);
    setAll('[data-profile-intro]', profile.intro);
  } catch (error) {
    // Keep the static fallback copy when content cannot be loaded.
  }
}

init();
