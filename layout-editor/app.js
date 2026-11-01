(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const num = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ESC_MAP[ch]);

  const FONT_STACKS = {
    serif: '"Noto Serif SC","Songti SC","SimSun",Georgia,serif',
    sans: '"Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif',
    kai: '"Kaiti SC","KaiTi","STKaiti",serif',
    georgia: 'Georgia,"Times New Roman",serif',
    mono: '"Courier New",monospace',
  };
  const FONT_LABELS = {
    serif: '宋体 / 衬线',
    sans: '黑体 / 无衬线',
    kai: '楷体',
    georgia: 'Georgia / 西文衬线',
    mono: '等宽',
  };

  const dom = {
    pageTabs: $('#pageTabs'),
    assetGrid: $('#assetGrid'),
    assetCount: $('#assetCount'),
    fileInput: $('#fileInput'),
    importInput: $('#importInput'),
    stageScroll: $('#stageScroll'),
    stageSizer: $('#stageSizer'),
    stage: $('#stage'),
    page: $('#page'),
    layerList: $('#layerList'),
    props: $('#props'),
    saveStatus: $('#saveStatus'),
    zoomLabel: $('#zoomLabel'),
    previewBar: $('#previewBar'),
    previewPageName: $('#previewPageName'),
    toast: $('#toast'),
  };

  const state = {
    project: null,
    selectedId: null,
    scale: 1,
    dirty: false,
    saveTimer: null,
    saveToken: 0,
    lastRev: 0,
    previewing: false,
    drag: null,
    history: [],
    historyIndex: 0,
    nudgeActive: false,
    layerDragId: null,
  };

  let toastTimer = null;
  let propCommitTimer = null;

  function schedulePropCommit() {
    clearTimeout(propCommitTimer);
    propCommitTimer = setTimeout(() => {
      propCommitTimer = null;
      commitHistory();
    }, 500);
  }

  function flushPropCommit() {
    clearTimeout(propCommitTimer);
    propCommitTimer = null;
    commitHistory();
  }

  function defaultPage() {
    return {
      id: uid('page'),
      name: '首页',
      width: 1600,
      height: 900,
      background: '#f7f1e3',
      elements: [],
    };
  }

  function normalizeElement(raw) {
    const item = raw || {};
    const type = item.type === 'text' ? 'text' : 'image';
    return {
      id: item.id || uid('el'),
      type,
      name: item.name || '',
      assetId: item.assetId || null,
      src: item.src || '',
      text: item.text ?? '',
      x: num(item.x, 0),
      y: num(item.y, 0),
      w: Math.max(10, num(item.w, 300)),
      h: Math.max(10, num(item.h, 300)),
      rotation: num(item.rotation, 0),
      opacity: clamp(num(item.opacity, 1), 0, 1),
      locked: Boolean(item.locked),
      hidden: Boolean(item.hidden),
      fontSize: Math.max(1, num(item.fontSize, 48)),
      fontFamily: FONT_STACKS[item.fontFamily] ? item.fontFamily : 'serif',
      fontWeight: num(item.fontWeight, 500),
      color: /^#[0-9a-f]{3,8}$/i.test(item.color || '') ? item.color : '#2b261f',
      textAlign: ['left', 'center', 'right'].includes(item.textAlign) ? item.textAlign : 'left',
      lineHeight: num(item.lineHeight, 1.15),
      letterSpacing: num(item.letterSpacing, 0),
    };
  }

  function normalizeProject(raw) {
    const data = raw && typeof raw === 'object' ? raw : {};
    const pages = Array.isArray(data.pages) && data.pages.length ? data.pages : [defaultPage()];
    const project = {
      version: 1,
      rev: num(data.rev, 0),
      activePageId: data.activePageId,
      pages: pages.map((page) => ({
        id: page.id || uid('page'),
        name: page.name || '未命名页面',
        width: Math.max(320, num(page.width, 1600)),
        height: Math.max(320, num(page.height, 900)),
        background: page.background || '#f7f1e3',
        elements: Array.isArray(page.elements) ? page.elements.map(normalizeElement) : [],
      })),
      assets: Array.isArray(data.assets)
        ? data.assets.map((asset) => ({
            id: asset.id || uid('asset'),
            name: asset.name || '素材',
            src: asset.src || '',
            w: Math.max(1, num(asset.w, 300)),
            h: Math.max(1, num(asset.h, 300)),
          }))
        : [],
    };
    if (!project.pages.find((page) => page.id === project.activePageId)) {
      project.activePageId = project.pages[0].id;
    }
    return project;
  }

  function activePage() {
    return state.project.pages.find((page) => page.id === state.project.activePageId) || state.project.pages[0];
  }

  function selectedElement() {
    return activePage().elements.find((item) => item.id === state.selectedId) || null;
  }

  function setStatus(text, tone = '') {
    dom.saveStatus.textContent = text;
    dom.saveStatus.className = `save-status ${tone}`.trim();
  }

  function toast(message) {
    dom.toast.textContent = message;
    dom.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => dom.toast.classList.remove('show'), 1800);
  }

  function activePageIndex() {
    return state.project.pages.findIndex((page) => page.id === state.project.activePageId);
  }

  // ---------------------------------------------------------------- history

  function resetHistory() {
    state.history = [clone(state.project)];
    state.historyIndex = 0;
  }

  function commitHistory() {
    if (!state.project) return;
    const snapshot = clone(state.project);
    const last = state.history[state.historyIndex];
    if (last && JSON.stringify(last) === JSON.stringify(snapshot)) return;
    state.history = state.history.slice(0, state.historyIndex + 1);
    state.history.push(snapshot);
    if (state.history.length > 60) state.history.shift();
    state.historyIndex = state.history.length - 1;
  }

  function restoreHistory() {
    state.project = normalizeProject(clone(state.history[state.historyIndex]));
    state.selectedId = null;
    renderAll();
    fitScale();
    markDirty();
  }

  function undo() {
    if (state.historyIndex <= 0) {
      toast('没有可撤销的操作');
      return;
    }
    state.historyIndex -= 1;
    restoreHistory();
  }

  function redo() {
    if (state.historyIndex >= state.history.length - 1) {
      toast('没有可重做的操作');
      return;
    }
    state.historyIndex += 1;
    restoreHistory();
  }

  // ------------------------------------------------------------------ saving

  function markDirty() {
    state.dirty = true;
    state.saveToken += 1;
    setStatus('未保存', 'saving');
    clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(saveProject, 600);
  }

  async function saveProject() {
    if (!state.project) return;
    clearTimeout(state.saveTimer);
    const token = ++state.saveToken;
    const payload = clone(state.project);
    delete payload.savedAt;
    setStatus('保存中…', 'saving');
    try {
      const response = await fetch('/api/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('save failed');
      const info = await response.json();
      state.lastRev = info.rev;
      state.project.rev = info.rev;
      if (token === state.saveToken) {
        state.dirty = false;
        setStatus(`已保存 ${new Date().toTimeString().slice(0, 5)}`);
      }
    } catch (error) {
      if (token === state.saveToken) {
        setStatus('保存失败', 'error');
      }
    }
  }

  async function pollRemote() {
    if (!state.project || state.dirty || state.drag || state.previewing) return;
    try {
      const response = await fetch('/api/project', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      if (num(data.rev, 0) > state.lastRev) {
        state.project = normalizeProject(data);
        state.lastRev = state.project.rev;
        state.selectedId = null;
        renderAll();
        fitScale();
        toast('已同步其他窗口的修改');
      }
    } catch (error) {
      /* 离线时静默 */
    }
  }

  // ------------------------------------------------------------------ render

  function renderAll() {
    renderTabs();
    renderAssets();
    renderCanvas();
    renderLayers();
    renderProps();
    renderPreviewPages();
  }

  function renderTabs() {
    dom.pageTabs.innerHTML = state.project.pages
      .map(
        (page) =>
          `<button class="page-tab ${page.id === state.project.activePageId ? 'active' : ''}" data-page-id="${page.id}" title="双击重命名">${esc(page.name)}</button>`,
      )
      .join('');
  }

  function renderAssets() {
    dom.assetCount.textContent = String(state.project.assets.length);
    if (!state.project.assets.length) {
      dom.assetGrid.innerHTML = '<div class="layer-empty">还没有素材。<br>上传透明图片后会出现在这里。</div>';
      return;
    }
    dom.assetGrid.innerHTML = state.project.assets
      .map(
        (asset) => `
          <div class="asset-card" data-asset-id="${asset.id}" title="点击加入画布">
            <div class="asset-thumb"><img src="${esc(asset.src)}" alt="${esc(asset.name)}" loading="lazy"></div>
            <div class="asset-name">${esc(asset.name)}</div>
          </div>`,
      )
      .join('');
  }

  function renderCanvas() {
    const page = activePage();
    dom.stage.style.width = `${page.width}px`;
    dom.stage.style.height = `${page.height}px`;
    dom.page.style.background = page.background;
    dom.page.innerHTML = '';
    for (const item of page.elements) {
      dom.page.appendChild(elementNode(item));
    }
    fitScale();
  }

  function elementNode(item) {
    const node = document.createElement('div');
    node.className = `el${item.id === state.selectedId ? ' selected' : ''}${item.locked ? ' locked' : ''}`;
    node.dataset.id = item.id;
    node.style.left = `${item.x}px`;
    node.style.top = `${item.y}px`;
    node.style.width = `${item.w}px`;
    node.style.height = `${item.h}px`;
    node.style.transform = `rotate(${item.rotation}deg)`;
    node.style.opacity = String(item.opacity);
    if (item.hidden) node.style.display = 'none';

    if (item.type === 'image') {
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = item.name || '图片素材';
      img.draggable = false;
      node.appendChild(img);
    } else {
      const text = document.createElement('div');
      text.className = 'text-box';
      applyTextStyle(text, item);
      text.textContent = item.text;
      node.appendChild(text);
      node.addEventListener('dblclick', (event) => {
        event.stopPropagation();
        if (state.previewing || item.locked) return;
        state.selectedId = item.id;
        renderCanvas();
        renderLayers();
        renderProps();
        const fresh = dom.page.querySelector(`.el[data-id="${item.id}"]`);
        if (fresh) startInlineEdit(item, fresh);
      });
    }

    if (item.id === state.selectedId && !item.locked && !state.previewing) {
      for (const [handle, sx, sy] of [
        ['nw', -1, -1],
        ['ne', 1, -1],
        ['sw', -1, 1],
        ['se', 1, 1],
      ]) {
        const dot = document.createElement('div');
        dot.className = `handle ${handle}`;
        dot.dataset.handle = handle;
        dot.dataset.sx = String(sx);
        dot.dataset.sy = String(sy);
        node.appendChild(dot);
      }
      const rot = document.createElement('div');
      rot.className = 'handle rot';
      rot.dataset.handle = 'rot';
      node.appendChild(rot);
    }

    return node;
  }

  function applyTextStyle(textNode, item) {
    textNode.style.fontSize = `${item.fontSize}px`;
    textNode.style.fontFamily = FONT_STACKS[item.fontFamily] || FONT_STACKS.serif;
    textNode.style.fontWeight = String(item.fontWeight);
    textNode.style.color = item.color;
    textNode.style.textAlign = item.textAlign;
    textNode.style.lineHeight = String(item.lineHeight);
    textNode.style.letterSpacing = `${item.letterSpacing}px`;
  }

  function updateElementNode(item) {
    const node = dom.page.querySelector(`.el[data-id="${item.id}"]`);
    if (!node) return;
    node.style.left = `${item.x}px`;
    node.style.top = `${item.y}px`;
    node.style.width = `${item.w}px`;
    node.style.height = `${item.h}px`;
    node.style.transform = `rotate(${item.rotation}deg)`;
    node.style.opacity = String(item.opacity);
    node.style.display = item.hidden ? 'none' : '';
    node.classList.toggle('locked', item.locked);
    if (item.type === 'image') {
      const img = node.querySelector('img');
      if (img && img.getAttribute('src') !== item.src) img.src = item.src;
    } else {
      const text = node.querySelector('.text-box');
      if (text && document.activeElement !== text) {
        text.textContent = item.text;
        applyTextStyle(text, item);
      }
    }
  }

  function renderLayers() {
    const page = activePage();
    if (!page.elements.length) {
      dom.layerList.innerHTML =
        '<div class="layer-empty">还没有元素。<br>从左侧素材库点击素材，或点「＋ 文字」。</div>';
      return;
    }
    dom.layerList.innerHTML = [...page.elements]
      .reverse()
      .map((item) => {
        const label =
          item.type === 'text' ? (item.text || '文字').slice(0, 16) : item.name || '图片';
        return `
          <div class="layer-row ${item.id === state.selectedId ? 'active' : ''}" draggable="true" data-id="${item.id}">
            <span class="layer-type">${item.type === 'text' ? 'T' : '▣'}</span>
            <span class="layer-name ${item.hidden ? 'hidden' : ''}">${esc(label)}</span>
            <span class="layer-actions">
              <button class="layer-action" data-action="toggle-hidden" data-id="${item.id}" title="${item.hidden ? '显示' : '隐藏'}">${item.hidden ? '○' : '◉'}</button>
              <button class="layer-action" data-action="toggle-locked" data-id="${item.id}" title="${item.locked ? '解锁' : '锁定'}">${item.locked ? '▣' : '□'}</button>
              <button class="layer-action" data-action="delete-element" data-id="${item.id}" title="删除">×</button>
            </span>
          </div>`;
      })
      .join('');
  }

  function renderProps() {
    const page = activePage();
    const item = selectedElement();

    if (!item) {
      dom.props.innerHTML = `
        <div class="props-section">
          <h3>页面设置</h3>
          <div class="field"><label>页面名称</label><input type="text" data-page-prop="name" value="${esc(page.name)}"></div>
          <div class="field-row">
            <div class="field"><label>宽 (px)</label><input type="number" data-page-prop="width" value="${page.width}" min="320" step="10"></div>
            <div class="field"><label>高 (px)</label><input type="number" data-page-prop="height" value="${page.height}" min="320" step="10"></div>
          </div>
          <div class="field"><label>背景色</label><input type="color" data-page-prop="background" value="${page.background}"></div>
          <div class="props-actions">
            <button class="btn small danger" data-action="delete-page" ${state.project.pages.length <= 1 ? 'disabled' : ''}>删除此页</button>
          </div>
        </div>
        <div class="props-empty">选中画布里的元素，可以在这里改文字、字号、颜色和透明度。</div>
      `;
      return;
    }

    const numberField = (label, prop, value, options = {}) => {
      const min = options.min ?? 0;
      const step = options.step ?? 1;
      return `<div class="field"><label>${label}</label><input type="number" data-prop="${prop}" value="${value}" min="${min}" step="${step}"></div>`;
    };

    const geometry = `
      <div class="props-section">
        <h3>位置与外观</h3>
        <div class="field-row">${numberField('宽', 'w', item.w, { min: 1 })}${numberField('高', 'h', item.h, { min: 1 })}</div>
        <div class="field-row">${numberField('X', 'x', item.x)}${numberField('Y', 'y', item.y)}</div>
        ${numberField('旋转 (°)', 'rotation', item.rotation, { min: -360, step: 1 })}
        <div class="field"><label>透明度 <span id="opacityValue">${Math.round(item.opacity * 100)}%</span></label><input type="range" data-prop="opacity" min="0" max="1" step="0.01" value="${item.opacity}"></div>
        <label class="check-row"><input type="checkbox" data-prop="locked" ${item.locked ? 'checked' : ''}> 锁定</label>
        <label class="check-row"><input type="checkbox" data-prop="hidden" ${item.hidden ? 'checked' : ''}> 隐藏</label>
      </div>
      <div class="props-actions"><button class="btn small danger" data-action="delete-element">删除元素</button></div>
    `;

    if (item.type === 'text') {
      const fontOptions = Object.entries(FONT_LABELS)
        .map(([key, label]) => `<option value="${key}"${item.fontFamily === key ? ' selected' : ''}>${label}</option>`)
        .join('');
      const weightOptions = [300, 400, 500, 600, 700]
        .map((weight) => `<option value="${weight}"${item.fontWeight === weight ? ' selected' : ''}>${weight}</option>`)
        .join('');
      const alignOptions = [
        ['left', '左对齐'],
        ['center', '居中'],
        ['right', '右对齐'],
      ]
        .map(([key, label]) => `<option value="${key}"${item.textAlign === key ? ' selected' : ''}>${label}</option>`)
        .join('');

      dom.props.innerHTML = `
        <div class="props-section">
          <h3>文字</h3>
          <div class="field"><label>内容（也可双击画布文字直接改）</label><textarea data-prop="text">${esc(item.text)}</textarea></div>
          <div class="field"><label>字体</label><select data-prop="fontFamily">${fontOptions}</select></div>
          <div class="field-row">
            ${numberField('字号', 'fontSize', item.fontSize, { min: 8 })}
            <div class="field"><label>字重</label><select data-prop="fontWeight">${weightOptions}</select></div>
          </div>
          <div class="field"><label>颜色</label><input type="color" data-prop="color" value="${item.color}"></div>
          <div class="field-row">
            <div class="field"><label>对齐</label><select data-prop="textAlign">${alignOptions}</select></div>
            ${numberField('行高', 'lineHeight', item.lineHeight, { min: 0.8, step: 0.05 })}
          </div>
          ${numberField('字距 (px)', 'letterSpacing', item.letterSpacing, { min: -20, step: 0.5 })}
        </div>
        ${geometry}
      `;
    } else {
      dom.props.innerHTML = `
        <div class="props-section">
          <h3>图片</h3>
          <div class="field"><label>名称</label><input type="text" data-prop="name" value="${esc(item.name)}"></div>
          <div class="meta">素材：${esc(item.name || '未命名')}<br>删除画布元素不会删除素材库里的原图。</div>
        </div>
        ${geometry}
      `;
    }
  }

  function renderPreviewPages() {
    const page = activePage();
    dom.previewPageName.textContent = page.name;
    const many = state.project.pages.length > 1;
    $('#btnPrevPage').disabled = !many;
    $('#btnNextPage').disabled = !many;
  }

  function fitScale() {
    if (!state.project) return;
    const page = activePage();
    const padX = state.previewing ? 40 : 80;
    const padY = state.previewing ? 40 : 50;
    const availableWidth = Math.max(200, dom.stageScroll.clientWidth - padX);
    const availableHeight = Math.max(200, dom.stageScroll.clientHeight - padY);
    const scale = Math.min(availableWidth / page.width, availableHeight / page.height, 1.5);
    state.scale = Math.max(0.05, scale);
    dom.stage.style.width = `${page.width}px`;
    dom.stage.style.height = `${page.height}px`;
    dom.stage.style.transform = `scale(${state.scale})`;
    dom.stage.style.setProperty('--hs', `${10 / state.scale}px`);
    dom.stage.style.setProperty('--bw', `${1.5 / state.scale}px`);
    dom.stageSizer.style.width = `${page.width * state.scale}px`;
    dom.stageSizer.style.height = `${page.height * state.scale}px`;
    dom.zoomLabel.textContent = `${Math.round(state.scale * 100)}%`;
  }

  // ----------------------------------------------------------------- selection

  function select(id) {
    if (state.selectedId === id) return;
    state.selectedId = id;
    renderCanvas();
    renderLayers();
    renderProps();
  }

  // ------------------------------------------------------------------- pages

  function addPage(name) {
    const suggested = `页面 ${state.project.pages.length + 1}`;
    if (name === undefined) {
      name = window.prompt('新页面名称', suggested);
      if (name === null) return;
    }
    const trimmed = String(name).trim() || suggested;
    const current = activePage();
    const page = {
      id: uid('page'),
      name: trimmed,
      width: current.width,
      height: current.height,
      background: current.background,
      elements: [],
    };
    state.project.pages.push(page);
    state.project.activePageId = page.id;
    state.selectedId = null;
    commitHistory();
    renderAll();
    fitScale();
    markDirty();
    toast(`已新建「${trimmed}」`);
  }

  function renamePage(id) {
    const page = state.project.pages.find((entry) => entry.id === id);
    if (!page) return;
    const name = window.prompt('页面名称', page.name);
    if (name === null || !name.trim()) return;
    page.name = name.trim();
    commitHistory();
    renderTabs();
    renderPreviewPages();
    markDirty();
  }

  function deletePage() {
    if (state.project.pages.length <= 1) return;
    const page = activePage();
    if (!window.confirm(`删除页面「${page.name}」？页面里的元素会一起删除，素材库不受影响。`)) return;
    const index = activePageIndex();
    state.project.pages.splice(index, 1);
    state.project.activePageId = state.project.pages[Math.max(0, index - 1)].id;
    state.selectedId = null;
    commitHistory();
    renderAll();
    fitScale();
    markDirty();
    toast('页面已删除');
  }

  function setActivePage(id) {
    if (state.project.activePageId === id) return;
    state.project.activePageId = id;
    state.selectedId = null;
    renderAll();
    fitScale();
    markDirty();
  }

  function cyclePage(direction) {
    const pages = state.project.pages;
    if (pages.length <= 1) return;
    const index = activePageIndex();
    const next = pages[(index + direction + pages.length) % pages.length];
    state.project.activePageId = next.id;
    state.selectedId = null;
    renderAll();
    fitScale();
    renderPreviewPages();
    markDirty();
  }

  // ----------------------------------------------------------------- elements

  function addText() {
    const page = activePage();
    const item = normalizeElement({
      id: uid('el'),
      type: 'text',
      text: '双击编辑文字',
      x: Math.round(page.width / 2 - 300),
      y: Math.round(page.height / 2 - 60),
      w: 600,
      h: 120,
      fontSize: 64,
      fontFamily: 'serif',
      fontWeight: 500,
      textAlign: 'center',
      color: '#2b261f',
    });
    page.elements.push(item);
    state.selectedId = item.id;
    commitHistory();
    renderAll();
    markDirty();
    setTimeout(() => {
      const textarea = dom.props.querySelector('textarea[data-prop="text"]');
      if (textarea) {
        textarea.focus();
        textarea.select();
      }
    }, 30);
  }

  async function addAssetToCanvas(assetId) {
    const asset = state.project.assets.find((entry) => entry.id === assetId);
    if (!asset) return;
    if (!asset.w || !asset.h) {
      const size = await imageSize(asset.src);
      asset.w = size.w;
      asset.h = size.h;
    }
    const page = activePage();
    const factor = Math.min(1, (page.width * 0.42) / asset.w, (page.height * 0.5) / asset.h);
    const width = Math.round(asset.w * factor);
    const height = Math.round(asset.h * factor);
    const item = normalizeElement({
      id: uid('el'),
      type: 'image',
      name: asset.name,
      assetId: asset.id,
      src: asset.src,
      x: Math.round((page.width - width) / 2),
      y: Math.round((page.height - height) / 2),
      w: width,
      h: height,
    });
    page.elements.push(item);
    state.selectedId = item.id;
    commitHistory();
    renderAll();
    markDirty();
    toast('已加入画布');
  }

  function deleteSelected() {
    const item = selectedElement();
    if (!item) return;
    const page = activePage();
    page.elements = page.elements.filter((entry) => entry.id !== item.id);
    state.selectedId = null;
    commitHistory();
    renderAll();
    markDirty();
    toast('已删除元素，素材仍在资产库');
  }

  function startInlineEdit(item, node) {
    const text = node.querySelector('.text-box');
    if (!text || text.isContentEditable) return;
    text.contentEditable = 'true';
    text.focus();
    const range = document.createRange();
    range.selectNodeContents(text);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    const finish = () => {
      text.contentEditable = 'false';
      item.text = text.textContent || '';
      text.textContent = item.text;
      commitHistory();
      renderLayers();
      renderProps();
      markDirty();
    };
    text.addEventListener('blur', finish, { once: true });
    text.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        text.blur();
      }
    });
  }

  // ------------------------------------------------------------------ pointer

  function pageToClient(px, py) {
    const rect = dom.page.getBoundingClientRect();
    return { x: rect.left + px * state.scale, y: rect.top + py * state.scale };
  }

  function onPointerDown(event) {
    if (state.previewing || event.button !== 0) return;
    if (event.target.closest('[contenteditable="true"]')) return;

    const handle = event.target.closest('.handle');
    const node = event.target.closest('.el');
    if (!node) {
      if (state.selectedId) select(null);
      return;
    }
    const item = activePage().elements.find((entry) => entry.id === node.dataset.id);
    if (!item) return;

    if (handle) {
      if (item.locked) return;
      event.preventDefault();
      if (handle.dataset.handle === 'rot') startRotate(item, event);
      else startResize(item, event, handle);
      return;
    }

    if (state.selectedId !== item.id) {
      state.selectedId = item.id;
      renderCanvas();
      renderLayers();
      renderProps();
    }
    if (item.locked) return;
    event.preventDefault();
    startMove(item, event);
  }

  function startMove(item, event) {
    state.drag = {
      type: 'move',
      id: item.id,
      startX: event.clientX,
      startY: event.clientY,
      x0: item.x,
      y0: item.y,
      pushed: false,
    };
    addDragListeners();
  }

  function startResize(item, event, handle) {
    state.drag = {
      type: 'resize',
      id: item.id,
      startX: event.clientX,
      startY: event.clientY,
      x0: item.x,
      y0: item.y,
      w0: item.w,
      h0: item.h,
      rot: item.rotation || 0,
      sx: Number(handle.dataset.sx),
      sy: Number(handle.dataset.sy),
      pushed: false,
    };
    addDragListeners();
  }

  function startRotate(item, event) {
    const center = pageToClient(item.x + item.w / 2, item.y + item.h / 2);
    state.drag = {
      type: 'rotate',
      id: item.id,
      cx: center.x,
      cy: center.y,
      startAngle: Math.atan2(event.clientY - center.y, event.clientX - center.x),
      rot0: item.rotation || 0,
      pushed: false,
    };
    addDragListeners();
  }

  function addDragListeners() {
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp, { once: true });
    window.addEventListener('pointercancel', onPointerUp, { once: true });
  }

  function onPointerMove(event) {
    const drag = state.drag;
    if (!drag) return;
    const item = activePage().elements.find((entry) => entry.id === drag.id);
    if (!item) return;

    const dx = (event.clientX - drag.startX) / state.scale;
    const dy = (event.clientY - drag.startY) / state.scale;
    if (!drag.pushed) {
      if (Math.hypot(dx, dy) < 2) return;
      drag.pushed = true;
    }
    event.preventDefault();

    if (drag.type === 'move') {
      item.x = Math.round(drag.x0 + dx);
      item.y = Math.round(drag.y0 + dy);
    } else if (drag.type === 'resize') {
      const rad = (-drag.rot * Math.PI) / 180;
      const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
      const localY = dx * Math.sin(rad) + dy * Math.cos(rad);
      let width = Math.max(20, drag.w0 + drag.sx * localX);
      let height = Math.max(20, drag.h0 + drag.sy * localY);

      if (event.shiftKey) {
        const ratio = drag.w0 / drag.h0;
        if (Math.abs(drag.sx * localX) >= Math.abs(drag.sy * localY)) {
          height = width / ratio;
        } else {
          width = height * ratio;
        }
        width = Math.max(20, width);
        height = Math.max(20, height);
      }

      const rad2 = (drag.rot * Math.PI) / 180;
      const cos = Math.cos(rad2);
      const sin = Math.sin(rad2);
      const anchorLocalX = (-drag.sx * drag.w0) / 2;
      const anchorLocalY = (-drag.sy * drag.h0) / 2;
      const anchorX = drag.x0 + drag.w0 / 2 + anchorLocalX * cos - anchorLocalY * sin;
      const anchorY = drag.y0 + drag.h0 / 2 + anchorLocalX * sin + anchorLocalY * cos;
      const boxX = (drag.sx * width) / 2;
      const boxY = (drag.sy * height) / 2;
      const centerX = anchorX + boxX * cos - boxY * sin;
      const centerY = anchorY + boxX * sin + boxY * cos;

      item.w = Math.round(width);
      item.h = Math.round(height);
      item.x = Math.round(centerX - width / 2);
      item.y = Math.round(centerY - height / 2);
    } else if (drag.type === 'rotate') {
      const angle = Math.atan2(event.clientY - drag.cy, event.clientX - drag.cx);
      let rotation = drag.rot0 + ((angle - drag.startAngle) * 180) / Math.PI;
      if (event.shiftKey) rotation = Math.round(rotation / 15) * 15;
      item.rotation = Math.round(rotation * 10) / 10;
    }

    updateElementNode(item);
  }

  function onPointerUp() {
    const drag = state.drag;
    state.drag = null;
    window.removeEventListener('pointermove', onPointerMove);
    if (!drag) return;
    if (drag.pushed) {
      commitHistory();
      renderProps();
      renderLayers();
      markDirty();
    }
  }

  // ------------------------------------------------------------------ preview

  function setPreview(on) {
    state.previewing = Boolean(on);
    state.selectedId = null;
    document.body.classList.toggle('previewing', state.previewing);
    dom.previewBar.classList.toggle('hidden', !state.previewing);
    renderCanvas();
    renderLayers();
    renderProps();
    renderPreviewPages();
    requestAnimationFrame(fitScale);
  }

  // ------------------------------------------------------------------ assets

  function imageSize(src) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve({ w: image.naturalWidth || 300, h: image.naturalHeight || 300 });
      image.onerror = () => resolve({ w: 300, h: 300 });
      image.src = src;
    });
  }

  async function uploadFiles(files) {
    for (const file of files) {
      if (!file.type.startsWith('image/') && !/\.(png|jpe?g|webp|gif|svg|avif)$/i.test(file.name)) {
        toast(`跳过非图片文件：${file.name}`);
        continue;
      }
      try {
        const response = await fetch(`/api/assets?name=${encodeURIComponent(file.name)}`, {
          method: 'POST',
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          body: file,
        });
        if (!response.ok) {
          let message = '上传失败';
          try {
            const error = await response.json();
            message = error.error || message;
          } catch (ignored) {
            /* ignore */
          }
          throw new Error(message);
        }
        const asset = await response.json();
        const size = await imageSize(asset.src);
        asset.w = size.w;
        asset.h = size.h;
        state.project.assets.push(asset);
        commitHistory();
        renderAssets();
        markDirty();
        toast(`已加入素材库：${asset.name}`);
      } catch (error) {
        toast(error.message || '上传失败');
      }
    }
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  }

  function timestamp() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  }

  async function exportProject() {
    try {
      const copy = clone(state.project);
      copy.assets = await Promise.all(
        copy.assets.map(async (asset) => {
          try {
            const response = await fetch(asset.src);
            const blob = await response.blob();
            return { ...asset, dataUrl: await blobToDataUrl(blob) };
          } catch (error) {
            return asset;
          }
        }),
      );
      const blob = new Blob([JSON.stringify(copy, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `portfolio-layout-${timestamp()}.json`);
      toast('已导出项目 JSON');
    } catch (error) {
      toast('导出失败');
    }
  }

  async function importProject(file) {
    try {
      const data = JSON.parse(await file.text());
      if (!data || !Array.isArray(data.pages)) throw new Error('不是有效的项目文件');

      const srcMap = {};
      for (const asset of data.assets || []) {
        if (!asset.dataUrl) continue;
        const blob = await (await fetch(asset.dataUrl)).blob();
        const response = await fetch(`/api/assets?name=${encodeURIComponent(asset.name || 'asset.png')}`, {
          method: 'POST',
          headers: { 'Content-Type': blob.type || 'application/octet-stream' },
          body: blob,
        });
        if (response.ok) {
          const uploaded = await response.json();
          srcMap[asset.id] = uploaded.src;
          asset.src = uploaded.src;
          asset.id = uploaded.id;
        }
        delete asset.dataUrl;
      }

      for (const page of data.pages) {
        for (const item of page.elements || []) {
          if (item.type === 'image' && item.assetId && srcMap[item.assetId]) {
            item.src = srcMap[item.assetId];
          }
        }
      }

      state.project = normalizeProject(data);
      state.project.rev = 0;
      state.selectedId = null;
      resetHistory();
      renderAll();
      fitScale();
      await saveProject();
      toast('项目已导入');
    } catch (error) {
      toast(error.message || '导入失败');
    }
  }

  // --------------------------------------------------------------------- UI

  function bindUI() {
    $('#btnAddPage').addEventListener('click', () => addPage());
    $('#btnImport').addEventListener('click', () => dom.importInput.click());
    $('#btnExport').addEventListener('click', exportProject);
    $('#btnPreview').addEventListener('click', () => setPreview(true));
    $('#btnExitPreview').addEventListener('click', () => setPreview(false));
    $('#btnPrevPage').addEventListener('click', () => cyclePage(-1));
    $('#btnNextPage').addEventListener('click', () => cyclePage(1));
    $('#btnUndo').addEventListener('click', undo);
    $('#btnRedo').addEventListener('click', redo);
    $('#btnAddText').addEventListener('click', addText);

    dom.fileInput.addEventListener('change', (event) => {
      const files = Array.from(event.target.files || []);
      event.target.value = '';
      if (files.length) uploadFiles(files);
    });

    dom.importInput.addEventListener('change', (event) => {
      const file = event.target.files && event.target.files[0];
      event.target.value = '';
      if (file) importProject(file);
    });

    dom.pageTabs.addEventListener('click', (event) => {
      const button = event.target.closest('[data-page-id]');
      if (button) setActivePage(button.dataset.pageId);
    });

    dom.pageTabs.addEventListener('dblclick', (event) => {
      const button = event.target.closest('[data-page-id]');
      if (button) renamePage(button.dataset.pageId);
    });

    dom.assetGrid.addEventListener('click', (event) => {
      const card = event.target.closest('[data-asset-id]');
      if (card) addAssetToCanvas(card.dataset.assetId);
    });

    dom.layerList.addEventListener('click', (event) => {
      const action = event.target.closest('[data-action]');
      if (action) {
        event.stopPropagation();
        const item = activePage().elements.find((entry) => entry.id === action.dataset.id);
        if (!item) return;
        const name = action.dataset.action;
        if (name === 'delete-element') {
          if (state.selectedId !== item.id) {
            state.selectedId = item.id;
            renderCanvas();
            renderLayers();
            renderProps();
          }
          deleteSelected();
        } else if (name === 'toggle-hidden') {
          item.hidden = !item.hidden;
          commitHistory();
          renderCanvas();
          renderLayers();
          renderProps();
          markDirty();
        } else if (name === 'toggle-locked') {
          item.locked = !item.locked;
          commitHistory();
          renderCanvas();
          renderLayers();
          renderProps();
          markDirty();
        }
        return;
      }
      const row = event.target.closest('.layer-row');
      if (row) select(row.dataset.id);
    });

    dom.layerList.addEventListener('dragstart', (event) => {
      const row = event.target.closest('.layer-row');
      if (!row) return;
      state.layerDragId = row.dataset.id;
      row.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', row.dataset.id);
    });

    dom.layerList.addEventListener('dragend', () => {
      state.layerDragId = null;
      $$('.layer-row', dom.layerList).forEach((row) => row.classList.remove('dragging', 'drop-target'));
    });

    dom.layerList.addEventListener('dragover', (event) => {
      const row = event.target.closest('.layer-row');
      if (!row) return;
      event.preventDefault();
      $$('.layer-row', dom.layerList).forEach((entry) => entry.classList.toggle('drop-target', entry === row));
    });

    dom.layerList.addEventListener('drop', (event) => {
      event.preventDefault();
      const row = event.target.closest('.layer-row');
      const dragId = state.layerDragId;
      if (!row || !dragId) return;
      const page = activePage();
      const from = page.elements.findIndex((entry) => entry.id === dragId);
      const to = page.elements.findIndex((entry) => entry.id === row.dataset.id);
      if (from < 0 || to < 0 || from === to) return;
      const [moved] = page.elements.splice(from, 1);
      page.elements.splice(to, 0, moved);
      state.layerDragId = null;
      commitHistory();
      renderCanvas();
      renderLayers();
      markDirty();
    });

    dom.page.addEventListener('pointerdown', onPointerDown);

    dom.props.addEventListener('input', (event) => {
      const target = event.target;
      const pageProp = target.dataset.pageProp;
      const prop = target.dataset.prop;

      if (pageProp) {
        const page = activePage();
        let value = target.type === 'color' || target.type === 'text' ? target.value : Number(target.value);
        if (pageProp === 'width' || pageProp === 'height') value = Math.max(320, value || 320);
        if (!(pageProp === 'name' ? value.trim() : value)) return;
        page[pageProp] = value;
        if (pageProp === 'background') dom.page.style.background = value;
        if (pageProp === 'width' || pageProp === 'height') {
          renderCanvas();
          fitScale();
        }
        if (pageProp === 'name') {
          renderTabs();
          renderPreviewPages();
        }
        markDirty();
        schedulePropCommit();
        return;
      }

      if (!prop) return;
      const item = selectedElement();
      if (!item) return;

      let value;
      if (target.type === 'checkbox') value = target.checked;
      else if (target.type === 'number' || target.type === 'range') value = Number(target.value);
      else value = target.value;

      if (prop === 'w' || prop === 'h' || prop === 'fontSize') value = Math.max(1, value || 1);
      if (prop === 'opacity') value = clamp(value || 0, 0, 1);
      if (prop === 'fontWeight') value = Number(value);

      item[prop] = value;
      if (prop === 'opacity') {
        const label = dom.props.querySelector('#opacityValue');
        if (label) label.textContent = `${Math.round(value * 100)}%`;
      }
      if (prop === 'text' || prop === 'name') renderLayers();
      updateElementNode(item);
      if (prop === 'locked' || prop === 'hidden') {
        renderCanvas();
        renderLayers();
      }
      markDirty();
      schedulePropCommit();
    });

    dom.props.addEventListener('change', (event) => {
      if (event.target.matches('[data-prop], [data-page-prop]')) {
        flushPropCommit();
        markDirty();
      }
    });

    dom.props.addEventListener('focusout', (event) => {
      if (event.target.matches('[data-prop], [data-page-prop]')) {
        flushPropCommit();
      }
    });

    dom.props.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      if (button.dataset.action === 'delete-element') deleteSelected();
      if (button.dataset.action === 'delete-page') deletePage();
    });

    let nudgeTimer = null;
    window.addEventListener('keydown', (event) => {
      const target = event.target;
      const typing =
        target.matches('input, textarea, select') || target.isContentEditable || Boolean(target.closest('[contenteditable="true"]'));

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveProject();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        if (typing) return;
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        if (typing) return;
        event.preventDefault();
        redo();
        return;
      }
      if (typing) return;

      if (event.key === 'Escape') {
        if (state.previewing) setPreview(false);
        else select(null);
        return;
      }

      const item = selectedElement();
      if (!item) return;

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteSelected();
        return;
      }

      const step = event.shiftKey ? 10 : 1;
      let moved = false;
      if (event.key === 'ArrowLeft') {
        item.x -= step;
        moved = true;
      } else if (event.key === 'ArrowRight') {
        item.x += step;
        moved = true;
      } else if (event.key === 'ArrowUp') {
        item.y -= step;
        moved = true;
      } else if (event.key === 'ArrowDown') {
        item.y += step;
        moved = true;
      }
      if (!moved || item.locked) return;
      event.preventDefault();
      state.nudgeActive = true;
      clearTimeout(nudgeTimer);
      nudgeTimer = setTimeout(() => {
        state.nudgeActive = false;
        commitHistory();
      }, 400);
      updateElementNode(item);
      renderProps();
      markDirty();
    });

    window.addEventListener('resize', fitScale);
    window.addEventListener('beforeunload', () => {
      if (state.dirty) saveProject();
    });

    if ('ResizeObserver' in window) {
      new ResizeObserver(() => fitScale()).observe(dom.stageScroll);
    }
    setInterval(pollRemote, 3000);
  }

  // --------------------------------------------------------------------- init

  async function init() {
    bindUI();
    try {
      const response = await fetch('/api/project', { cache: 'no-store' });
      if (!response.ok) throw new Error('load failed');
      state.project = normalizeProject(await response.json());
    } catch (error) {
      state.project = normalizeProject({ pages: [defaultPage()], assets: [] });
      setStatus('离线模式', 'error');
      toast('无法连接本地服务器，当前改动不会保存');
    }
    state.lastRev = state.project.rev;
    resetHistory();
    renderAll();
    requestAnimationFrame(fitScale);
    if (!state.project.assets.length) {
      setTimeout(() => toast('从左侧上传素材，或点「＋ 文字」开始排版'), 400);
    }
  }

  window.__layoutEditor = {
    state,
    saveProject,
    renderAll,
    fitScale,
    addPage,
    addText,
    setPreview,
    addAssetToCanvas,
    undo,
    redo,
  };

  init();
})();
