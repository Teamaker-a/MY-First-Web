const API_ROOT = 'https://api.github.com';
const API_VERSION = '2022-11-28';

export class GitHubApiError extends Error {
  constructor(message, status, path) {
    super(message);
    this.name = 'GitHubApiError';
    this.status = status;
    this.path = path;
  }
}

export function parseRepo(value) {
  const repo = String(value || '').trim();
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    throw new GitHubApiError('仓库格式应为 owner/repository', 0, '');
  }
  return repo;
}

function encodePath(path) {
  return String(path || '')
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
}

function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value) {
  const clean = String(value || '').replace(/\s/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new TextDecoder('utf-8').decode(bytes);
}

export class GitHubClient {
  constructor({ token, repo, branch = 'main' }) {
    if (!token) throw new GitHubApiError('缺少 GitHub Token', 0, '');
    this.token = token;
    this.repo = parseRepo(repo);
    this.branch = String(branch || 'main').trim() || 'main';
  }

  async request(path, options = {}) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    let response;
    try {
      response = await fetch(`${API_ROOT}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${this.token}`,
          'X-GitHub-Api-Version': API_VERSION,
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(options.headers || {}),
        },
      });
    } catch (error) {
      if (error.name === 'AbortError') throw new GitHubApiError('GitHub 请求超时', 0, path);
      throw new GitHubApiError('无法连接 GitHub，请检查网络', 0, path);
    } finally {
      window.clearTimeout(timeout);
    }

    const text = await response.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (error) {
        data = null;
      }
    }

    if (!response.ok) {
      const message = data?.message || `GitHub 请求失败（${response.status}）`;
      throw new GitHubApiError(message, response.status, path);
    }
    return data;
  }

  async me() {
    return this.request('/user');
  }

  async getRepo() {
    return this.request(`/repos/${encodePath(this.repo)}`);
  }

  async getFile(path) {
    const safePath = encodePath(path);
    return this.request(`/repos/${encodePath(this.repo)}/contents/${safePath}?ref=${encodeURIComponent(this.branch)}`);
  }

  async getJsonFile(path) {
    const file = await this.getFile(path);
    if (!file || !file.content || file.encoding !== 'base64') {
      throw new GitHubApiError('内容文件过大或格式不支持', 0, path);
    }
    let json;
    try {
      json = JSON.parse(fromBase64(file.content));
    } catch (error) {
      throw new GitHubApiError('内容文件不是有效的 JSON', 0, path);
    }
    return { json, sha: file.sha, path: file.path };
  }

  async putTextFile(path, text, message, sha) {
    return this.putBase64File(path, toBase64(text), message, sha);
  }

  async putBase64File(path, base64, message, sha) {
    const body = {
      message,
      content: base64,
      branch: this.branch,
      ...(sha ? { sha } : {}),
    };
    const safePath = encodePath(path);
    return this.request(`/repos/${encodePath(this.repo)}/contents/${safePath}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async uploadBinary(path, arrayBuffer, message) {
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return this.putBase64File(path, btoa(binary), message);
  }
}
