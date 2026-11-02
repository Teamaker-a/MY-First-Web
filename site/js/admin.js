import { GitHubApiError, GitHubClient, parseRepo } from './github-client.js?v=20261101a';
import { travel as fallbackTravel, works as fallbackWorks } from './data.js?v=20261029a';

const CONFIG_KEY = 'sx-content-admin-config-v1';
const TOKEN_KEY = 'sx-content-admin-token-v1';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const DEFAULT_CONFIG = {
  repo: '',
  branch: 'main',
  siteRoot: 'site',
  contentPath: 'site/content/site.json',
  mediaPath: 'site/assets/images/uploads',
  travelMediaPath: 'site/assets/images/travel',
  worksMediaPath: 'site/assets/images/works',
};

const EMPTY_PROFILE = {
  name: '',
  tagline: '',
  intro: '',
  email: '',
  location: '',
  github: '',
  xiaohongshu: '',
};

const PROVINCES = [
  '北京市', '天津市', '河北省', '山西省', '内蒙古自治区', '辽宁省', '吉林省', '黑龙江省',
  '上海市', '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省', '河南省',
  '湖北省', '湖南省', '广东省', '广西壮族自治区', '海南省', '重庆市', '四川省', '贵州省',
  '云南省', '西藏自治区', '陕西省', '甘肃省', '青海省', '宁夏回族自治区', '新疆维吾尔自治区',
  '台湾省', '香港特别行政区', '澳门特别行政区',
];

const state = {
  client: null,
  config: null,
  content: null,
  sha: null,
  savedSnapshot: '',
  selectedSlug: null,
  selectedProvince: null,
  selectedWorkIndex: null,
  isNew: false,
  newArticle: null,
  dirty: false,
  saving: false,
  lastError: '',
  view: 'articles',
  user: null,
  source: '',
  commitUrl: '',
};

const dom = {
  loginView: document.getElementById('loginView'),
  appView: document.getElementById('appView'),
  loginForm: document.getElementById('loginForm'),
  loginButton: document.getElementById('loginButton'),
  loginError: document.getElementById('loginError'),
  tokenInput: document.getElementById('tokenInput'),
  repoInput: document.getElementById('repoInput'),
  branchInput: document.getElementById('branchInput'),
  siteRootInput: document.getElementById('siteRootInput'),
  contentPathInput: document.getElementById('contentPathInput'),
  mediaPathInput: document.getElementById('mediaPathInput'),
  travelMediaPathInput: document.getElementById('travelMediaPathInput'),
  worksMediaPathInput: document.getElementById('worksMediaPathInput'),
  repoLabel: document.getElementById('repoLabel'),
  branchLabel: document.getElementById('branchLabel'),
  repoLink: document.getElementById('repoLink'),
  accountLabel: document.getElementById('accountLabel'),
  logoutButton: document.getElementById('logoutButton'),
  viewTitle: document.getElementById('viewTitle'),
  saveStatus: document.getElementById('saveStatus'),
  commitLink: document.getElementById('commitLink'),
  articlesPanel: document.getElementById('articlesPanel'),
  profilePanel: document.getElementById('profilePanel'),
  worksPanel: document.getElementById('worksPanel'),
  travelPanel: document.getElementById('travelPanel'),
  settingsPanel: document.getElementById('settingsPanel'),
  newArticleBtn: document.getElementById('newArticleBtn'),
  articleCount: document.getElementById('articleCount'),
  articleList: document.getElementById('articleList'),
  editorEmpty: document.getElementById('editorEmpty'),
  articleForm: document.getElementById('articleForm'),
  editorMode: document.getElementById('editorMode'),
  editorHeading: document.getElementById('editorHeading'),
  viewArticleLink: document.getElementById('viewArticleLink'),
  deleteArticleBtn: document.getElementById('deleteArticleBtn'),
  articleTitleInput: document.getElementById('articleTitleInput'),
  articleDateInput: document.getElementById('articleDateInput'),
  articleSlugInput: document.getElementById('articleSlugInput'),
  articleTagInput: document.getElementById('articleTagInput'),
  articleExcerptInput: document.getElementById('articleExcerptInput'),
  articleBodyInput: document.getElementById('articleBodyInput'),
  imageInput: document.getElementById('imageInput'),
  uploadStatus: document.getElementById('uploadStatus'),
  editorStatus: document.getElementById('editorStatus'),
  profileForm: document.getElementById('profileForm'),
  profileNameInput: document.getElementById('profileNameInput'),
  profileEmailInput: document.getElementById('profileEmailInput'),
  profileTaglineInput: document.getElementById('profileTaglineInput'),
  profileIntroInput: document.getElementById('profileIntroInput'),
  profileLocationInput: document.getElementById('profileLocationInput'),
  profileGithubInput: document.getElementById('profileGithubInput'),
  profileXhsInput: document.getElementById('profileXhsInput'),
  settingsForm: document.getElementById('settingsForm'),
  settingsRepoInput: document.getElementById('settingsRepoInput'),
  settingsBranchInput: document.getElementById('settingsBranchInput'),
  settingsSiteRootInput: document.getElementById('settingsSiteRootInput'),
  settingsContentPathInput: document.getElementById('settingsContentPathInput'),
  settingsMediaPathInput: document.getElementById('settingsMediaPathInput'),
  settingsTravelMediaPathInput: document.getElementById('settingsTravelMediaPathInput'),
  settingsWorksMediaPathInput: document.getElementById('settingsWorksMediaPathInput'),
  tokenStatus: document.getElementById('tokenStatus'),
  changeTokenBtn: document.getElementById('changeTokenBtn'),
  newProvinceSelect: document.getElementById('newProvinceSelect'),
  newWorkBtn: document.getElementById('newWorkBtn'),
  worksCount: document.getElementById('worksCount'),
  worksList: document.getElementById('worksList'),
  workEmpty: document.getElementById('workEmpty'),
  workForm: document.getElementById('workForm'),
  workHeading: document.getElementById('workHeading'),
  viewWorkLink: document.getElementById('viewWorkLink'),
  deleteWorkBtn: document.getElementById('deleteWorkBtn'),
  workTitleInput: document.getElementById('workTitleInput'),
  workTypeInput: document.getElementById('workTypeInput'),
  workYearInput: document.getElementById('workYearInput'),
  workLinkInput: document.getElementById('workLinkInput'),
  workDescInput: document.getElementById('workDescInput'),
  workCoverInput: document.getElementById('workCoverInput'),
  workCoverPreview: document.getElementById('workCoverPreview'),
  workCoverStatus: document.getElementById('workCoverStatus'),
  removeWorkCoverBtn: document.getElementById('removeWorkCoverBtn'),
  workEditorStatus: document.getElementById('workEditorStatus'),
  addProvinceBtn: document.getElementById('addProvinceBtn'),
  travelCount: document.getElementById('travelCount'),
  travelList: document.getElementById('travelList'),
  travelEmpty: document.getElementById('travelEmpty'),
  travelForm: document.getElementById('travelForm'),
  travelHeading: document.getElementById('travelHeading'),
  deleteProvinceBtn: document.getElementById('deleteProvinceBtn'),
  travelStatus: document.getElementById('travelStatus'),
  travelProvinceInput: document.getElementById('travelProvinceInput'),
  travelTitleInput: document.getElementById('travelTitleInput'),
  travelSubtitleInput: document.getElementById('travelSubtitleInput'),
  travelNoteInput: document.getElementById('travelNoteInput'),
  travelImageInput: document.getElementById('travelImageInput'),
  travelPhotos: document.getElementById('travelPhotos'),
  travelUploadStatus: document.getElementById('travelUploadStatus'),
  travelEditorStatus: document.getElementById('travelEditorStatus'),
  toast: document.getElementById('toast'),
};

let toastTimer = null;

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[char];
  });
}

function toast(message, kind = '') {
  window.clearTimeout(toastTimer);
  dom.toast.textContent = message;
  dom.toast.classList.toggle('error', kind === 'error');
  dom.toast.classList.add('show');
  toastTimer = window.setTimeout(() => dom.toast.classList.remove('show'), 4200);
}

function describeError(error) {
  if (error instanceof GitHubApiError) {
    if (error.status === 401) return 'Token 无效或已过期，请重新登录。';
    if (error.status === 403) return 'Token 没有写入权限，或触发了 GitHub API 限额。';
    if (error.status === 404) return '仓库或内容路径不存在，请检查仓库 / 路径 / Token 权限。';
    if (error.status === 409) return '仓库内容已被更新，请刷新页面后再保存，避免覆盖别人的修改。';
    if (error.status === 422) return 'GitHub 拒绝了这次提交，请检查文件路径和内容。';
    return error.message;
  }
  return error?.message || '发生未知错误。';
}

function cleanPath(value) {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '');
}

function normalizeConfig(input) {
  const raw = { ...DEFAULT_CONFIG, ...input };
  const repo = parseRepo(raw.repo);
  const branch = String(raw.branch || 'main').trim() || 'main';
  const siteRoot = cleanPath(raw.siteRoot);
  const contentPath = cleanPath(raw.contentPath);
  const mediaPath = cleanPath(raw.mediaPath);
  const travelMediaPath = cleanPath(raw.travelMediaPath);
  const worksMediaPath = cleanPath(raw.worksMediaPath);

  if (!contentPath.endsWith('.json')) throw new Error('内容文件路径必须以 .json 结尾。');
  if (!mediaPath) throw new Error('请填写文章图片目录。');
  if (!travelMediaPath) throw new Error('请填写旅行图片目录。');
  if (!worksMediaPath) throw new Error('请填写作品图片目录。');
  for (const path of [siteRoot, contentPath, mediaPath, travelMediaPath, worksMediaPath]) {
    if (path && path.split('/').includes('..')) throw new Error('路径里不能包含 ..');
  }

  return { repo, branch, siteRoot, contentPath, mediaPath, travelMediaPath, worksMediaPath };
}

function loadStoredConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    return normalizeConfig(JSON.parse(raw));
  } catch (error) {
    return { ...DEFAULT_CONFIG };
  }
}

function storeConfig(config) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    // localStorage 不可用时，配置只在当前页面有效。
  }
}

function readToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || '';
  } catch (error) {
    return '';
  }
}

function storeToken(token) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch (error) {}
}

function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch (error) {}
}

function webPathForRepo(path) {
  const root = (state.config?.siteRoot || '').replace(/^\/+|\/+$/g, '');
  let webPath = cleanPath(path);
  if (root && (webPath === root || webPath.startsWith(`${root}/`))) {
    webPath = webPath.slice(root.length).replace(/^\/+/, '');
  }
  return webPath;
}

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function makeSlug(date = currentMonth()) {
  const stamp = String(date).replace(/[^0-9]/g, '') || 'post';
  const random = Math.random().toString(36).slice(2, 7);
  return `post-${stamp}-${random}`;
}

function normalizeArticle(article, index) {
  const slug = String(article?.slug || `post-${index + 1}`).trim() || `post-${index + 1}`;
  const body = Array.isArray(article?.body)
    ? article.body.map((block) => String(block))
    : String(article?.body || '')
        .split(/\n\s*\n/)
        .map((block) => block.trim())
        .filter(Boolean);
  return {
    slug,
    title: String(article?.title || '无题'),
    date: String(article?.date || ''),
    tag: String(article?.tag || '随笔'),
    excerpt: String(article?.excerpt || ''),
    body,
  };
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
  if (!photo || typeof photo !== 'object') return { src: '', caption: `第 ${index + 1} 张` };
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
      photos: Array.isArray(place.photos) ? place.photos.map(normalizePhoto) : [],
    };
  });
  return {
    demo: Boolean(raw.demo),
    visited: Array.isArray(raw.visited) ? raw.visited.map(String) : [],
    wishlist: Array.isArray(raw.wishlist) ? raw.wishlist.map(String) : [],
    places,
  };
}

function normalizeContent(raw) {
  const content = raw && typeof raw === 'object' ? raw : {};
  const profile = {
    ...EMPTY_PROFILE,
    ...(content.profile && typeof content.profile === 'object' ? content.profile : {}),
  };
  const articles = Array.isArray(content.articles)
    ? content.articles.map(normalizeArticle)
    : [];
  return {
    version: 1,
    updatedAt: String(content.updatedAt || ''),
    profile,
    articles,
    travel: normalizeTravel(
      content.travel && typeof content.travel === 'object' ? content.travel : fallbackTravel,
    ),
    works: normalizeWorks(content.works) ?? normalizeWorks(fallbackWorks) ?? [],
  };
}

async function loadLocalContent() {
  const url = new URL('../content/site.json', import.meta.url);
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`本地内容文件读取失败（${response.status}）`);
  return response.json();
}

function fillLoginForm(config) {
  dom.tokenInput.value = '';
  dom.repoInput.value = config.repo || '';
  dom.branchInput.value = config.branch || 'main';
  dom.siteRootInput.value = config.siteRoot || '';
  dom.contentPathInput.value = config.contentPath || DEFAULT_CONFIG.contentPath;
  dom.mediaPathInput.value = config.mediaPath || DEFAULT_CONFIG.mediaPath;
  dom.travelMediaPathInput.value = config.travelMediaPath || DEFAULT_CONFIG.travelMediaPath;
  dom.worksMediaPathInput.value = config.worksMediaPath || DEFAULT_CONFIG.worksMediaPath;
}

function setLoginError(message) {
  dom.loginError.textContent = message || '';
}

function setLoginBusy(busy) {
  dom.loginButton.disabled = busy;
  dom.loginButton.textContent = busy ? '连接中…' : '登录并连接';
}

function showLogin(message = '') {
  dom.loginView.hidden = false;
  dom.appView.hidden = true;
  fillLoginForm(state.config || loadStoredConfig());
  setLoginError(message);
  setLoginBusy(false);
  window.setTimeout(() => dom.tokenInput.focus(), 60);
}

function setView(view) {
  state.view = view;
  const titles = { articles: '文章', works: '作品', profile: '个人资料', travel: '旅行', settings: '设置' };
  dom.viewTitle.textContent = titles[view] || '文章';
  dom.articlesPanel.hidden = view !== 'articles';
  dom.worksPanel.hidden = view !== 'works';
  dom.profilePanel.hidden = view !== 'profile';
  dom.travelPanel.hidden = view !== 'travel';
  dom.settingsPanel.hidden = view !== 'settings';
  document.querySelectorAll('.side-link').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
  });
  if (view === 'works') {
    renderWorksList();
    if (state.selectedWorkIndex !== null) fillWorkEditor(state.selectedWorkIndex);
  }
  if (view === 'profile') fillProfileForm();
  if (view === 'travel') {
    fillProvinceOptions();
    renderTravelList();
    fillTravelEditor(state.selectedProvince);
  }
  if (view === 'settings') fillSettingsForm();
}

function updateRepoChrome(user) {
  dom.repoLabel.textContent = state.config.repo;
  dom.branchLabel.textContent = `branch · ${state.config.branch}`;
  dom.repoLink.href = `https://github.com/${state.config.repo}`;
  dom.accountLabel.textContent = user?.login ? `@${user.login}` : '已连接';
  dom.tokenStatus.textContent = user?.login ? `当前标签页已连接 @${user.login}` : '当前标签页已连接';
}

function updateCommitLink() {
  if (state.commitUrl) {
    dom.commitLink.href = state.commitUrl;
    dom.commitLink.hidden = false;
  }
}

function updateStatus() {
  dom.saveStatus.classList.remove('is-dirty', 'is-error');
  if (state.saving) {
    dom.saveStatus.textContent = '正在提交…';
    return;
  }
  if (state.lastError) {
    dom.saveStatus.textContent = '提交失败';
    dom.saveStatus.classList.add('is-error');
    return;
  }
  if (state.dirty) {
    dom.saveStatus.textContent = '有未保存更改';
    dom.saveStatus.classList.add('is-dirty');
    return;
  }
  dom.saveStatus.textContent = state.source === 'local' ? '已连接 · 首次保存会创建文件' : '已连接';
}

function updateDirty() {
  if (!state.content) {
    state.dirty = false;
    updateStatus();
    return;
  }
  const contentDirty = state.savedSnapshot !== JSON.stringify(state.content);
  state.dirty = Boolean(contentDirty || state.isNew);
  updateStatus();
}

function markDirty() {
  state.lastError = '';
  updateDirty();
}

function renderArticleList() {
  const articles = state.content?.articles || [];
  dom.articleCount.textContent = String(articles.length);
  if (!articles.length) {
    dom.articleList.innerHTML = '<p class="article-list-empty">还没有文章。点右上角“新文章”开始。</p>';
    return;
  }
  dom.articleList.innerHTML = articles
    .map((article) => {
      const active = !state.isNew && article.slug === state.selectedSlug;
      return `
        <button class="article-row${active ? ' active' : ''}" type="button" data-article-slug="${esc(article.slug)}">
          <span class="row-meta">${esc(article.date)} · ${esc(article.tag)}</span>
          <strong>${esc(article.title)}</strong>
          <small>${esc(article.excerpt || '暂无摘要')}</small>
        </button>`;
    })
    .join('');
}

function currentArticle() {
  if (state.isNew) return state.newArticle;
  if (!state.content || !state.selectedSlug) return null;
  return state.content.articles.find((article) => article.slug === state.selectedSlug) || null;
}

function showEmptyEditor() {
  dom.articleForm.hidden = true;
  dom.editorEmpty.hidden = false;
}

function fillEditor(article) {
  if (!article) {
    showEmptyEditor();
    return;
  }
  dom.editorEmpty.hidden = true;
  dom.articleForm.hidden = false;
  dom.editorMode.textContent = state.isNew ? 'NEW ARTICLE' : 'EDIT ARTICLE';
  dom.editorHeading.textContent = article.title || (state.isNew ? '新文章' : '编辑文章');
  dom.articleTitleInput.value = article.title || '';
  dom.articleDateInput.value = article.date || '';
  dom.articleSlugInput.value = article.slug || '';
  dom.articleTagInput.value = article.tag || '';
  dom.articleExcerptInput.value = article.excerpt || '';
  dom.articleBodyInput.value = (article.body || []).join('\n\n');
  dom.viewArticleLink.hidden = state.isNew;
  if (!state.isNew) {
    dom.viewArticleLink.href = `article.html?id=${encodeURIComponent(article.slug)}`;
  }
  dom.deleteArticleBtn.textContent = state.isNew ? '丢弃草稿' : '删除';
  dom.editorStatus.textContent = state.isNew ? '新文章尚未保存。' : '';
  dom.uploadStatus.textContent = '支持 JPG / PNG / WebP / GIF / AVIF，单张不超过 5MB';
}

function syncArticleFromForm() {
  const article = currentArticle();
  if (!article) return;
  article.title = dom.articleTitleInput.value.trim();
  article.date = dom.articleDateInput.value || currentMonth();
  article.slug = dom.articleSlugInput.value.trim().toLowerCase();
  article.tag = dom.articleTagInput.value.trim() || '随笔';
  article.excerpt = dom.articleExcerptInput.value.trim();
  article.body = dom.articleBodyInput.value
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  dom.editorHeading.textContent = article.title || (state.isNew ? '新文章' : '编辑文章');
}

function validateArticle(article) {
  if (!article) return '没有正在编辑的文章。';
  if (!article.title) return '标题不能为空。';
  if (!article.slug) return 'Slug 不能为空。';
  if (!/^[a-z0-9-]+$/.test(article.slug)) return 'Slug 只能包含小写字母、数字和短横线。';
  if (!article.date) return '请选择日期。';
  if (!article.tag) return '标签不能为空。';
  const duplicate = state.content.articles.find(
    (item) => item !== article && item.slug === article.slug,
  );
  if (duplicate) return '这个 Slug 已经被其他文章使用。';
  return '';
}

function selectArticle(slug) {
  if (state.isNew && state.newArticle) {
    if (!window.confirm('新文章尚未保存，切换会丢弃这篇草稿。继续？')) return;
    state.isNew = false;
    state.newArticle = null;
    state.selectedSlug = null;
  }
  const article = state.content.articles.find((item) => item.slug === slug);
  if (!article) return;
  state.selectedSlug = slug;
  state.isNew = false;
  fillEditor(article);
  renderArticleList();
  updateDirty();
}

function newArticle() {
  if (state.isNew && !window.confirm('当前新文章尚未保存，新建会丢弃现有草稿。继续？')) {
    return;
  }
  if (state.isNew) {
    state.isNew = false;
    state.newArticle = null;
  }
  let slug = makeSlug();
  while (state.content.articles.some((article) => article.slug === slug)) slug = makeSlug();
  const article = {
    slug,
    title: '新文章',
    date: currentMonth(),
    tag: '随笔',
    excerpt: '',
    body: [],
  };
  state.newArticle = article;
  state.isNew = true;
  state.selectedSlug = null;
  fillEditor(article);
  renderArticleList();
  markDirty();
}

async function saveContent(message) {
  if (!state.client) {
    toast('还没有连接仓库。', 'error');
    return false;
  }
  if (state.saving) return false;
  state.saving = true;
  state.lastError = '';
  updateStatus();
  try {
    state.content.updatedAt = new Date().toISOString();
    const text = `${JSON.stringify(state.content, null, 2)}\n`;
    const result = await state.client.putTextFile(
      state.config.contentPath,
      text,
      message,
      state.sha,
    );
    if (result?.content?.sha) state.sha = result.content.sha;
    state.savedSnapshot = JSON.stringify(state.content);
    state.source = 'github';
    state.commitUrl = result?.commit?.html_url || '';
    updateCommitLink();
    updateStatus();
    toast('已提交到 GitHub。托管平台会自动构建并发布。');
    return true;
  } catch (error) {
    state.lastError = describeError(error);
    updateStatus();
    toast(state.lastError, 'error');
    return false;
  } finally {
    state.saving = false;
    updateStatus();
  }
}

async function handleSaveArticle(event) {
  event.preventDefault();
  const article = currentArticle();
  if (!article) {
    toast('请先选择一篇文章。', 'error');
    return;
  }
  syncArticleFromForm();
  const error = validateArticle(article);
  if (error) {
    dom.editorStatus.textContent = error;
    toast(error, 'error');
    return;
  }

  const wasNew = state.isNew;
  if (wasNew) state.content.articles.unshift(article);
  const ok = await saveContent(`content: save article "${article.title}"`);
  if (!ok) {
    if (wasNew) {
      state.content.articles = state.content.articles.filter((item) => item !== article);
      markDirty();
    }
    return;
  }

  if (wasNew) {
    state.isNew = false;
    state.newArticle = null;
  }
  state.selectedSlug = article.slug;
  state.savedSnapshot = JSON.stringify(state.content);
  state.lastError = '';
  dom.editorStatus.textContent = '已保存。';
  renderArticleList();
  fillEditor(article);
  updateDirty();
}

async function handleDeleteArticle() {
  if (state.isNew) {
    if (!window.confirm('丢弃这篇尚未保存的草稿？')) return;
    state.isNew = false;
    state.newArticle = null;
    state.selectedSlug = null;
    showEmptyEditor();
    updateDirty();
    return;
  }

  const article = currentArticle();
  if (!article) return;
  if (state.dirty) {
    toast('请先保存当前修改，再删除文章。', 'error');
    return;
  }
  if (!window.confirm(`确定删除《${article.title}》吗？这会立即提交到 GitHub。`)) return;

  const index = state.content.articles.indexOf(article);
  state.content.articles.splice(index, 1);
  const ok = await saveContent(`content: delete article "${article.title}"`);
  if (!ok) {
    state.content.articles.splice(index, 0, article);
    updateDirty();
    return;
  }

  const next = state.content.articles[index] || state.content.articles[index - 1] || null;
  state.selectedSlug = next?.slug || null;
  state.savedSnapshot = JSON.stringify(state.content);
  renderArticleList();
  if (next) fillEditor(next);
  else showEmptyEditor();
  updateDirty();
}

function fillProfileForm() {
  const profile = state.content?.profile || EMPTY_PROFILE;
  dom.profileNameInput.value = profile.name || '';
  dom.profileEmailInput.value = profile.email || '';
  dom.profileTaglineInput.value = profile.tagline || '';
  dom.profileIntroInput.value = profile.intro || '';
  dom.profileLocationInput.value = profile.location || '';
  dom.profileGithubInput.value = profile.github || '';
  dom.profileXhsInput.value = profile.xiaohongshu || '';
}

function handleProfileInput() {
  if (!state.content) return;
  state.content.profile = {
    ...state.content.profile,
    name: dom.profileNameInput.value.trim(),
    email: dom.profileEmailInput.value.trim(),
    tagline: dom.profileTaglineInput.value.trim(),
    intro: dom.profileIntroInput.value.trim(),
    location: dom.profileLocationInput.value.trim(),
    github: dom.profileGithubInput.value.trim(),
    xiaohongshu: dom.profileXhsInput.value.trim(),
  };
  markDirty();
}

async function handleSaveProfile(event) {
  event.preventDefault();
  if (state.isNew) {
    toast('请先保存或丢弃正在编辑的新文章。', 'error');
    return;
  }
  handleProfileInput();
  const ok = await saveContent('content: update profile');
  if (ok) {
    state.savedSnapshot = JSON.stringify(state.content);
    updateDirty();
  }
}

function fillSettingsForm() {
  if (!state.config) return;
  dom.settingsRepoInput.value = state.config.repo;
  dom.settingsBranchInput.value = state.config.branch;
  dom.settingsSiteRootInput.value = state.config.siteRoot;
  dom.settingsContentPathInput.value = state.config.contentPath;
  dom.settingsMediaPathInput.value = state.config.mediaPath;
  dom.settingsTravelMediaPathInput.value = state.config.travelMediaPath;
  dom.settingsWorksMediaPathInput.value = state.config.worksMediaPath;
}

function handleSaveSettings(event) {
  event.preventDefault();
  if (state.isNew) {
    toast('请先保存或丢弃正在编辑的新文章。', 'error');
    return;
  }
  let config;
  try {
    config = normalizeConfig({
      repo: dom.settingsRepoInput.value,
      branch: dom.settingsBranchInput.value,
      siteRoot: dom.settingsSiteRootInput.value,
      contentPath: dom.settingsContentPathInput.value,
      mediaPath: dom.settingsMediaPathInput.value,
      travelMediaPath: dom.settingsTravelMediaPathInput.value,
      worksMediaPath: dom.settingsWorksMediaPathInput.value,
    });
  } catch (error) {
    toast(error.message || '设置格式不正确。', 'error');
    return;
  }
  if (state.dirty && !window.confirm('重新连接会丢弃当前未保存的修改。继续？')) return;
  storeConfig(config);
  state.config = config;
  toast('设置已保存，正在重新连接…');
  window.setTimeout(() => window.location.reload(), 450);
}

function handleLogout() {
  if (state.dirty && !window.confirm('还有未保存的修改，退出会丢失这些修改。继续？')) return;
  clearToken();
  state.client = null;
  state.content = null;
  state.user = null;
  showLogin();
}

async function handleImageUpload(file) {
  if (!file) return;
  if (!state.client) {
    toast('还没有连接仓库。', 'error');
    return;
  }
  const article = currentArticle();
  if (!article) {
    toast('请先选择一篇文章。', 'error');
    return;
  }
  if (!file.type.startsWith('image/')) {
    toast('只能上传图片文件。', 'error');
    return;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    toast('图片不能超过 5MB。', 'error');
    return;
  }

  dom.uploadStatus.textContent = '正在上传图片…';
  try {
    const extension = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const base = file.name
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'image';
    const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const filename = `${stamp}-${base}.${extension}`;
    const repoPath = `${state.config.mediaPath}/${filename}`;
    const webPath = webPathForRepo(repoPath);
    await state.client.uploadBinary(
      repoPath,
      await file.arrayBuffer(),
      `content: upload ${filename}`,
    );
    const alt = file.name.replace(/\.[^.]+$/, '').replace(/[\[\]]/g, '');
    const snippet = `\n\n![${alt}](${webPath})\n\n`;
    const body = dom.articleBodyInput;
    const start = body.selectionStart ?? body.value.length;
    const end = body.selectionEnd ?? body.value.length;
    body.setRangeText(snippet, start, end, 'end');
    body.dispatchEvent(new Event('input', { bubbles: true }));
    dom.uploadStatus.textContent = `已上传：${webPath}`;
    toast('图片已提交；保存文章后会一起发布。');
  } catch (error) {
    dom.uploadStatus.textContent = '上传失败，请重试。';
    toast(describeError(error), 'error');
  } finally {
    dom.imageInput.value = '';
  }
}

function currentPlace() {
  if (!state.content || !state.selectedProvince) return null;
  return state.content.travel.places[state.selectedProvince] || null;
}

function travelStatusFor(name) {
  const travel = state.content?.travel;
  if (!travel) return 'neutral';
  if (travel.visited.includes(name)) return 'visited';
  if (travel.wishlist.includes(name)) return 'wishlist';
  return 'neutral';
}

function setTravelStatus(name, status) {
  const travel = state.content.travel;
  travel.visited = travel.visited.filter((item) => item !== name);
  travel.wishlist = travel.wishlist.filter((item) => item !== name);
  if (status === 'visited') travel.visited.push(name);
  if (status === 'wishlist') travel.wishlist.push(name);
  const place = travel.places[name];
  if (place) place.wish = status === 'wishlist';
}

function fillProvinceOptions() {
  if (!dom.newProvinceSelect || !state.content) return;
  const existing = new Set(Object.keys(state.content.travel.places));
  const available = PROVINCES.filter((name) => !existing.has(name));
  dom.newProvinceSelect.innerHTML = available.length
    ? '<option value="">选择省份…</option>' + available.map((name) => `<option value="${esc(name)}">${esc(name)}</option>`).join('')
    : '<option value="">所有省份都已添加</option>';
}

function renderTravelList() {
  if (!dom.travelList || !state.content) return;
  const places = state.content.travel.places;
  const names = Object.keys(places);
  dom.travelCount.textContent = String(names.length);
  if (!names.length) {
    dom.travelList.innerHTML = '<p class="article-list-empty">还没有旅行记录。选择省份开始添加。</p>';
    return;
  }
  dom.travelList.innerHTML = names
    .map((name) => {
      const place = places[name];
      const status = travelStatusFor(name);
      const label = status === 'visited' ? '去过' : status === 'wishlist' ? '最想去' : '未点亮';
      const active = name === state.selectedProvince;
      return `
        <button class="article-row${active ? ' active' : ''}" type="button" data-province="${esc(name)}">
          <span class="row-meta">${label} · ${place.photos?.length || 0} 张照片</span>
          <strong>${esc(name)}</strong>
          <small>${esc(place.title || place.note || '还没有旅行文案')}</small>
        </button>`;
    })
    .join('');
}

function travelPhotoPreview(photo) {
  const src = String(photo?.src || '');
  if (!src) return '';
  if (/^https?:\/\//i.test(src)) return src;
  const root = (state.config?.siteRoot || '').replace(/^\/+|\/+$/g, '');
  const repoPath = root ? `${root}/${src}` : src;
  const encodedPath = repoPath.split('/').map(encodeURIComponent).join('/');
  return `https://raw.githubusercontent.com/${state.config.repo}/${encodeURIComponent(state.config.branch)}/${encodedPath}`;
}

function renderTravelPhotos(place) {
  if (!dom.travelPhotos) return;
  const photos = place?.photos || [];
  if (!photos.length) {
    dom.travelPhotos.innerHTML = '<p class="article-list-empty">还没有照片。没有照片时会继续显示示例占位图。</p>';
    return;
  }
  dom.travelPhotos.innerHTML = photos
    .map((photo, index) => {
      const preview = travelPhotoPreview(photo);
      return `
        <div class="photo-item" data-photo-index="${index}">
          <div class="photo-thumb">${preview ? `<img src="${esc(preview)}" alt="${esc(photo.caption || '')}" loading="lazy">` : '示例占位'}</div>
          <input class="photo-caption" data-caption-index="${index}" type="text" value="${esc(photo.caption || '')}" placeholder="这张照片的说明">
          <div class="photo-item-foot">
            <span class="photo-src">${esc(photo.src || '占位图')}</span>
            <button class="photo-remove" data-remove-index="${index}" type="button">移除</button>
          </div>
        </div>`;
    })
    .join('');

  dom.travelPhotos.querySelectorAll('[data-caption-index]').forEach((input) => {
    input.addEventListener('input', () => {
      const photo = (currentPlace()?.photos || [])[Number(input.dataset.captionIndex)];
      if (!photo) return;
      photo.caption = input.value;
      markDirty();
    });
  });
  dom.travelPhotos.querySelectorAll('[data-remove-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const placeNow = currentPlace();
      if (!placeNow) return;
      placeNow.photos.splice(Number(button.dataset.removeIndex), 1);
      markDirty();
      renderTravelPhotos(placeNow);
    });
  });
}

function fillTravelEditor(name) {
  const place = name ? state.content.travel.places[name] : null;
  if (!place) {
    dom.travelForm.hidden = true;
    dom.travelEmpty.hidden = false;
    return;
  }
  dom.travelEmpty.hidden = true;
  dom.travelForm.hidden = false;
  dom.travelHeading.textContent = name;
  dom.travelProvinceInput.value = name;
  dom.travelStatus.value = travelStatusFor(name);
  dom.travelTitleInput.value = place.title || '';
  dom.travelSubtitleInput.value = place.subtitle || '';
  dom.travelNoteInput.value = place.note || '';
  dom.travelEditorStatus.textContent = '';
  dom.travelUploadStatus.textContent = '一次可以选多张，单张不超过 5MB。';
  renderTravelPhotos(place);
}

function selectProvince(name) {
  if (!state.content?.travel.places[name]) return;
  state.selectedProvince = name;
  renderTravelList();
  fillTravelEditor(name);
}

function addProvince() {
  if (!state.content) return;
  const name = dom.newProvinceSelect.value;
  if (!name) {
    toast('请选择一个省份。', 'error');
    return;
  }
  if (state.content.travel.places[name]) {
    selectProvince(name);
    return;
  }
  state.content.travel.places[name] = {
    title: '',
    subtitle: '',
    note: '',
    wish: false,
    photos: [],
  };
  state.selectedProvince = name;
  renderTravelList();
  fillProvinceOptions();
  fillTravelEditor(name);
  markDirty();
}

function syncTravelFromForm() {
  const place = currentPlace();
  if (!place || !state.selectedProvince) return;
  place.title = dom.travelTitleInput.value.trim();
  place.subtitle = dom.travelSubtitleInput.value.trim();
  place.note = dom.travelNoteInput.value.trim();
  setTravelStatus(state.selectedProvince, dom.travelStatus.value);
  dom.travelHeading.textContent = state.selectedProvince;
}

function handleTravelInput() {
  syncTravelFromForm();
  markDirty();
}

async function handleTravelImageUpload(files) {
  if (!files?.length) return;
  if (!state.client) {
    toast('还没有连接仓库。', 'error');
    return;
  }
  const place = currentPlace();
  if (!place) {
    toast('请先选择一个省份。', 'error');
    return;
  }

  if (Array.isArray(place.photos) && place.photos.every((photo) => !photo.src)) {
    place.photos = [];
  }
  dom.travelUploadStatus.textContent = '正在上传旅行照片…';
  let uploaded = 0;
  for (const file of Array.from(files)) {
    if (!file.type.startsWith('image/')) {
      toast(`${file.name} 不是图片，已跳过。`, 'error');
      continue;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast(`${file.name} 超过 5MB，已跳过。`, 'error');
      continue;
    }
    try {
      const extension = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const base = file.name
        .replace(/\.[^.]+$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'travel-photo';
      const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const filename = `${stamp}-${base}-${uploaded + 1}.${extension}`;
      const repoPath = `${state.config.travelMediaPath}/${filename}`;
      const webPath = webPathForRepo(repoPath);
      await state.client.uploadBinary(
        repoPath,
        await file.arrayBuffer(),
        `content: upload travel photo ${filename}`,
      );
      place.photos.push({
        src: webPath,
        caption: file.name.replace(/\.[^.]+$/, ''),
      });
      uploaded += 1;
      markDirty();
      renderTravelPhotos(place);
      dom.travelUploadStatus.textContent = `已上传 ${uploaded} 张；保存旅行后写入内容。`;
    } catch (error) {
      toast(describeError(error), 'error');
      dom.travelUploadStatus.textContent = '有照片上传失败，请重试。';
    }
  }
  dom.travelImageInput.value = '';
}

function handleDeleteProvince() {
  const name = state.selectedProvince;
  if (!name || !state.content.travel.places[name]) return;
  if (!window.confirm(`移除「${name}」的旅行记录和照片引用？照片文件不会删除。`)) return;
  delete state.content.travel.places[name];
  state.content.travel.visited = state.content.travel.visited.filter((item) => item !== name);
  state.content.travel.wishlist = state.content.travel.wishlist.filter((item) => item !== name);
  state.selectedProvince = null;
  renderTravelList();
  fillProvinceOptions();
  fillTravelEditor(null);
  markDirty();
  toast('已移除；点“保存旅行”提交到 GitHub。');
}

async function handleSaveTravel(event) {
  event.preventDefault();
  if (state.isNew) {
    toast('请先保存或丢弃正在编辑的新文章。', 'error');
    return;
  }
  const place = currentPlace();
  if (!place) {
    toast('请先选择一个省份。', 'error');
    return;
  }
  syncTravelFromForm();
  if (!place.title.trim()) {
    dom.travelEditorStatus.textContent = '旅行标题不能为空。';
    toast('请填写旅行标题。', 'error');
    return;
  }
  state.content.travel.demo = false;
  const ok = await saveContent(`content: update travel "${state.selectedProvince}"`);
  if (ok) {
    dom.travelEditorStatus.textContent = '已保存。';
    updateDirty();
  }
}

function currentWork() {
  if (!state.content || state.selectedWorkIndex === null) return null;
  return state.content.works[state.selectedWorkIndex] || null;
}

function getWorkCoverPreview(work) {
  const src = String(work?.cover || '');
  if (!src) return '';
  if (/^https?:\/\//i.test(src)) return src;
  const root = (state.config?.siteRoot || '').replace(/^\/+|\/+$/g, '');
  const repoPath = root ? `${root}/${src}` : src;
  const encodedPath = repoPath.split('/').map(encodeURIComponent).join('/');
  return `https://raw.githubusercontent.com/${state.config.repo}/${encodeURIComponent(state.config.branch)}/${encodedPath}`;
}

function renderWorksList() {
  if (!dom.worksList || !state.content) return;
  const works = state.content.works || [];
  dom.worksCount.textContent = String(works.length);
  if (!works.length) {
    dom.worksList.innerHTML = '<p class="article-list-empty">还没有作品。点右上角“新作品”开始。</p>';
    return;
  }
  dom.worksList.innerHTML = works
    .map((work, index) => {
      const active = index === state.selectedWorkIndex;
      return `
        <button class="article-row${active ? ' active' : ''}" type="button" data-work-index="${index}">
          <span class="row-meta">${esc(work.type)} · ${esc(work.year)}${work.cover ? ' · 有封面' : ''}</span>
          <strong>${esc(work.title)}</strong>
          <small>${esc(work.desc || '还没有项目说明')}</small>
        </button>`;
    })
    .join('');
}

function renderWorkCover(work) {
  if (!dom.workCoverPreview) return;
  const preview = getWorkCoverPreview(work);
  dom.workCoverPreview.innerHTML = preview
    ? `<img src="${esc(preview)}" alt="" loading="lazy">`
    : '植物图版封面';
  dom.removeWorkCoverBtn.hidden = !work?.cover;
  dom.workCoverStatus.textContent = work?.cover
    ? `封面：${work.cover}`
    : '没有封面图时，会按作品序号显示植物图版封面。';
}

function fillWorkEditor(index) {
  const work = state.content.works[index];
  if (!work) {
    dom.workForm.hidden = true;
    dom.workEmpty.hidden = false;
    return;
  }
  state.selectedWorkIndex = index;
  dom.workEmpty.hidden = true;
  dom.workForm.hidden = false;
  dom.workHeading.textContent = work.title || '作品';
  dom.workTitleInput.value = work.title || '';
  dom.workTypeInput.value = work.type || '';
  dom.workYearInput.value = work.year || '';
  dom.workLinkInput.value = work.link || '';
  dom.workDescInput.value = work.desc || '';
  dom.workEditorStatus.textContent = '';
  const hasLink = work.link && work.link !== '#';
  dom.viewWorkLink.hidden = !hasLink;
  if (hasLink) dom.viewWorkLink.href = work.link;
  renderWorkCover(work);
}

function selectWork(index) {
  const work = state.content.works[index];
  if (!work) return;
  state.selectedWorkIndex = index;
  renderWorksList();
  fillWorkEditor(index);
}

function addWork() {
  if (!state.content) return;
  const year = String(new Date().getFullYear());
  const accents = ['#566450', '#6a5d47', '#485849'];
  const work = {
    title: '新作品',
    type: '网页 / 排版',
    year,
    desc: '',
    link: '',
    cover: '',
    accent: accents[state.content.works.length % accents.length],
  };
  state.content.works.push(work);
  state.selectedWorkIndex = state.content.works.length - 1;
  renderWorksList();
  fillWorkEditor(state.selectedWorkIndex);
  markDirty();
}

function syncWorkFromForm() {
  const work = currentWork();
  if (!work) return;
  work.title = dom.workTitleInput.value.trim();
  work.type = dom.workTypeInput.value.trim();
  work.year = dom.workYearInput.value.trim();
  work.link = dom.workLinkInput.value.trim();
  work.desc = dom.workDescInput.value.trim();
  dom.workHeading.textContent = work.title || '作品';
}

function handleWorkInput() {
  syncWorkFromForm();
  markDirty();
}

async function handleWorkCoverUpload(file) {
  if (!file) return;
  if (!state.client) {
    toast('还没有连接仓库。', 'error');
    return;
  }
  const work = currentWork();
  if (!work) {
    toast('请先选择一个作品。', 'error');
    return;
  }
  if (!file.type.startsWith('image/')) {
    toast('只能上传图片文件。', 'error');
    return;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    toast('图片不能超过 5MB。', 'error');
    return;
  }
  dom.workEditorStatus.textContent = '正在上传封面…';
  try {
    const extension = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const base = file.name
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'work-cover';
    const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    const filename = `${stamp}-${base}.${extension}`;
    const repoPath = `${state.config.worksMediaPath}/${filename}`;
    const webPath = webPathForRepo(repoPath);
    await state.client.uploadBinary(repoPath, await file.arrayBuffer(), `content: upload work cover ${filename}`);
    work.cover = webPath;
    markDirty();
    renderWorkCover(work);
    dom.workEditorStatus.textContent = '封面上传成功；保存作品后写入内容。';
  } catch (error) {
    dom.workEditorStatus.textContent = '封面上传失败。';
    toast(describeError(error), 'error');
  } finally {
    dom.workCoverInput.value = '';
  }
}

function handleRemoveWorkCover() {
  const work = currentWork();
  if (!work) return;
  work.cover = '';
  markDirty();
  renderWorkCover(work);
}

async function handleDeleteWork() {
  const work = currentWork();
  if (!work) return;
  if (state.dirty) {
    toast('请先保存当前修改，再删除作品。', 'error');
    return;
  }
  if (!window.confirm(`确定删除《${work.title}》吗？`)) return;
  const index = state.selectedWorkIndex;
  state.content.works.splice(index, 1);
  const ok = await saveContent(`content: delete work "${work.title}"`);
  if (!ok) {
    state.content.works.splice(index, 0, work);
    updateDirty();
    return;
  }
  const next = state.content.works[index] || state.content.works[index - 1] || null;
  state.selectedWorkIndex = next ? state.content.works.indexOf(next) : null;
  state.savedSnapshot = JSON.stringify(state.content);
  renderWorksList();
  if (next) fillWorkEditor(state.selectedWorkIndex);
  else {
    dom.workForm.hidden = true;
    dom.workEmpty.hidden = false;
  }
  updateDirty();
}

async function handleSaveWork(event) {
  event.preventDefault();
  if (state.isNew) {
    toast('请先保存或丢弃正在编辑的新文章。', 'error');
    return;
  }
  const work = currentWork();
  if (!work) {
    toast('请先选择一个作品。', 'error');
    return;
  }
  syncWorkFromForm();
  if (!work.title) {
    dom.workEditorStatus.textContent = '作品标题不能为空。';
    toast('请填写作品标题。', 'error');
    return;
  }
  const ok = await saveContent(`content: update works "${work.title}"`);
  if (ok) {
    dom.workEditorStatus.textContent = '已保存。';
    state.savedSnapshot = JSON.stringify(state.content);
    renderWorksList();
    fillWorkEditor(state.selectedWorkIndex);
    updateDirty();
  }
}

function bindEvents() {
  dom.loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    setLoginError('');
    let config;
    try {
      config = normalizeConfig({
        repo: dom.repoInput.value,
        branch: dom.branchInput.value,
        siteRoot: dom.siteRootInput.value,
        contentPath: dom.contentPathInput.value,
        mediaPath: dom.mediaPathInput.value,
        travelMediaPath: dom.travelMediaPathInput.value,
        worksMediaPath: dom.worksMediaPathInput.value,
      });
    } catch (error) {
      setLoginError(error.message || '请检查仓库和路径。');
      return;
    }
    const token = dom.tokenInput.value.trim();
    if (!token) {
      setLoginError('请输入 GitHub Token。');
      return;
    }
    setLoginBusy(true);
    try {
      await connect(token, config);
    } catch (error) {
      setLoginError(describeError(error));
    } finally {
      setLoginBusy(false);
    }
  });

  document.querySelectorAll('.side-link').forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.view));
  });

  dom.newArticleBtn.addEventListener('click', newArticle);
  dom.articleForm.addEventListener('submit', handleSaveArticle);
  dom.deleteArticleBtn.addEventListener('click', handleDeleteArticle);
  dom.articleList.addEventListener('click', (event) => {
    const row = event.target.closest('[data-article-slug]');
    if (!row) return;
    selectArticle(row.dataset.articleSlug);
  });

  [dom.articleTitleInput, dom.articleDateInput, dom.articleSlugInput, dom.articleTagInput, dom.articleExcerptInput, dom.articleBodyInput].forEach((input) => {
    input.addEventListener('input', () => {
      syncArticleFromForm();
      markDirty();
    });
  });

  dom.newWorkBtn.addEventListener('click', addWork);
  dom.worksList.addEventListener('click', (event) => {
    const row = event.target.closest('[data-work-index]');
    if (row) selectWork(Number(row.dataset.workIndex));
  });
  dom.workForm.addEventListener('submit', handleSaveWork);
  [dom.workTitleInput, dom.workTypeInput, dom.workYearInput, dom.workLinkInput, dom.workDescInput].forEach((input) => {
    input.addEventListener('input', handleWorkInput);
  });
  dom.workCoverInput.addEventListener('change', () => handleWorkCoverUpload(dom.workCoverInput.files?.[0]));
  dom.removeWorkCoverBtn.addEventListener('click', handleRemoveWorkCover);
  dom.deleteWorkBtn.addEventListener('click', handleDeleteWork);

  dom.addProvinceBtn.addEventListener('click', addProvince);
  dom.travelList.addEventListener('click', (event) => {
    const row = event.target.closest('[data-province]');
    if (row) selectProvince(row.dataset.province);
  });
  dom.travelForm.addEventListener('submit', handleSaveTravel);
  [dom.travelTitleInput, dom.travelSubtitleInput, dom.travelNoteInput].forEach((input) => {
    input.addEventListener('input', handleTravelInput);
  });
  dom.travelStatus.addEventListener('change', handleTravelInput);
  dom.travelImageInput.addEventListener('change', () => handleTravelImageUpload(dom.travelImageInput.files));
  dom.deleteProvinceBtn.addEventListener('click', handleDeleteProvince);

  dom.imageInput.addEventListener('change', () => handleImageUpload(dom.imageInput.files?.[0]));
  dom.profileForm.addEventListener('submit', handleSaveProfile);
  [dom.profileNameInput, dom.profileEmailInput, dom.profileTaglineInput, dom.profileIntroInput, dom.profileLocationInput, dom.profileGithubInput, dom.profileXhsInput].forEach((input) => {
    input.addEventListener('input', handleProfileInput);
  });

  dom.settingsForm.addEventListener('submit', handleSaveSettings);
  dom.logoutButton.addEventListener('click', handleLogout);
  dom.changeTokenBtn.addEventListener('click', () => {
    if (state.dirty && !window.confirm('还有未保存的修改，更换 Token 会丢失这些修改。继续？')) return;
    clearToken();
    state.client = null;
    state.content = null;
    state.user = null;
    showLogin('请输入新的 Token。');
  });

  window.addEventListener('beforeunload', (event) => {
    if (!state.dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });
}

async function connect(token, config) {
  const client = new GitHubClient({ token, repo: config.repo, branch: config.branch });
  const [user, repo] = await Promise.all([client.me(), client.getRepo()]);
  if (repo.permissions && repo.permissions.push === false) {
    throw new GitHubApiError('Token 对该仓库没有写入权限。', 403, '');
  }

  let content;
  let sha = null;
  let source = 'github';
  try {
    const file = await client.getJsonFile(config.contentPath);
    content = normalizeContent(file.json);
    sha = file.sha;
  } catch (error) {
    if (!(error instanceof GitHubApiError) || error.status !== 404) throw error;
    try {
      content = normalizeContent(await loadLocalContent());
      source = 'local';
    } catch (fallbackError) {
      throw new Error('仓库里没有内容文件，本地示例也读取失败。');
    }
  }

  state.client = client;
  state.config = config;
  state.content = content;
  state.sha = sha;
  state.source = source;
  state.user = user;
  state.selectedSlug = content.articles[0]?.slug || null;
  state.selectedProvince = Object.keys(content.travel.places)[0] || null;
  state.selectedWorkIndex = content.works.length ? 0 : null;
  state.isNew = false;
  state.newArticle = null;
  state.savedSnapshot = JSON.stringify(content);
  state.dirty = false;
  state.lastError = '';
  state.commitUrl = '';

  storeConfig(config);
  storeToken(token);
  setLoginError('');
  dom.loginView.hidden = true;
  dom.appView.hidden = false;
  updateRepoChrome(user);
  dom.commitLink.hidden = true;
  setView('articles');
  renderArticleList();
  if (state.selectedSlug) {
    fillEditor(content.articles[0]);
  } else {
    showEmptyEditor();
  }
  renderWorksList();
  if (state.selectedWorkIndex !== null) fillWorkEditor(state.selectedWorkIndex);
  fillProfileForm();
  fillProvinceOptions();
  renderTravelList();
  fillTravelEditor(state.selectedProvince);
  fillSettingsForm();
  updateDirty();
  updateStatus();
  if (source === 'local') {
    toast('仓库里还没有内容文件，已载入本地示例；首次保存会创建它。');
  }
}

function init() {
  state.config = loadStoredConfig();
  bindEvents();
  showLogin();
  const token = readToken();
  if (token && state.config.repo) {
    setLoginBusy(true);
    connect(token, state.config)
      .catch((error) => {
        if (error instanceof GitHubApiError && error.status === 401) clearToken();
        showLogin(describeError(error));
      })
      .finally(() => setLoginBusy(false));
  }
}

init();
