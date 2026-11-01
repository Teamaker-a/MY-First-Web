import { GitHubApiError, GitHubClient, parseRepo } from './github-client.js?v=20261101a';

const CONFIG_KEY = 'sx-content-admin-config-v1';
const TOKEN_KEY = 'sx-content-admin-token-v1';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const DEFAULT_CONFIG = {
  repo: '',
  branch: 'main',
  siteRoot: 'site',
  contentPath: 'site/content/site.json',
  mediaPath: 'site/assets/images/uploads',
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

const state = {
  client: null,
  config: null,
  content: null,
  sha: null,
  savedSnapshot: '',
  selectedSlug: null,
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
  tokenStatus: document.getElementById('tokenStatus'),
  changeTokenBtn: document.getElementById('changeTokenBtn'),
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

  if (!contentPath.endsWith('.json')) throw new Error('内容文件路径必须以 .json 结尾。');
  if (!mediaPath) throw new Error('请填写图片目录。');
  for (const path of [siteRoot, contentPath, mediaPath]) {
    if (path && path.split('/').includes('..')) throw new Error('路径里不能包含 ..');
  }

  return { repo, branch, siteRoot, contentPath, mediaPath };
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
  const titles = { articles: '文章', profile: '个人资料', settings: '设置' };
  dom.viewTitle.textContent = titles[view] || '文章';
  dom.articlesPanel.hidden = view !== 'articles';
  dom.profilePanel.hidden = view !== 'profile';
  dom.settingsPanel.hidden = view !== 'settings';
  document.querySelectorAll('.side-link').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
  });
  if (view === 'profile') fillProfileForm();
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
  fillProfileForm();
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
