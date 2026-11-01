#!/usr/bin/env python3
"""本地排版编辑器：静态文件 + 共享排版工程 + 素材上传。

启动：
    python layout-editor/server.py
浏览器打开 http://127.0.0.1:8765/
"""

import json
import os
import random
import string
import sys
import threading
import time
import webbrowser
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "shared-data"
ASSETS_DIR = ROOT / "assets"
PROJECT_FILE = DATA_DIR / "current.json"
BASE_PORT = int(os.environ.get("LAYOUT_EDITOR_PORT", "8765"))
MAX_UPLOAD = 80 * 1024 * 1024
ALLOWED_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif"}

SAMPLE_SVG = """<svg xmlns="http://www.w3.org/2000/svg" width="420" height="420" viewBox="0 0 420 420">
  <defs>
    <radialGradient id="plate" cx="50%" cy="42%" r="60%">
      <stop offset="0%" stop-color="#fffdf7"/>
      <stop offset="70%" stop-color="#fdf4df"/>
      <stop offset="100%" stop-color="#f2e3c4"/>
    </radialGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#4a3a22" flood-opacity="0.16"/>
    </filter>
  </defs>
  <ellipse cx="210" cy="372" rx="150" ry="22" fill="#4a3a22" opacity="0.10"/>
  <circle cx="210" cy="210" r="180" fill="url(#plate)" stroke="#d8b878" stroke-width="5" filter="url(#soft)"/>
  <circle cx="210" cy="210" r="152" fill="none" stroke="#e6cfa0" stroke-width="2" stroke-dasharray="3 9"/>
  <circle cx="210" cy="210" r="118" fill="none" stroke="#efe0c2" stroke-width="1.5"/>
</svg>
"""

DEFAULT_PROJECT = {
    "version": 1,
    "rev": 0,
    "activePageId": "page-1",
    "pages": [
        {
            "id": "page-1",
            "name": "首页",
            "width": 1600,
            "height": 900,
            "background": "#f7f1e3",
            "elements": [],
        }
    ],
    "assets": [
        {
            "id": "seed-plate",
            "name": "示例餐盘.svg",
            "src": "/assets/sample-plate.svg",
            "w": 420,
            "h": 420,
        }
    ],
}


def ensure_dirs():
    DATA_DIR.mkdir(exist_ok=True)
    ASSETS_DIR.mkdir(exist_ok=True)
    sample = ASSETS_DIR / "sample-plate.svg"
    if not sample.exists():
        sample.write_text(SAMPLE_SVG, encoding="utf-8")


def ensure_project():
    ensure_dirs()
    if not PROJECT_FILE.exists():
        PROJECT_FILE.write_text(
            json.dumps(DEFAULT_PROJECT, ensure_ascii=False, indent=2), encoding="utf-8"
        )


def load_project():
    ensure_project()
    return json.loads(PROJECT_FILE.read_text(encoding="utf-8"))


def save_project(data):
    data = dict(data)
    current = load_project() if PROJECT_FILE.exists() else {"rev": 0}
    data["rev"] = int(current.get("rev", 0)) + 1
    data["savedAt"] = datetime.now(timezone.utc).isoformat()
    tmp = PROJECT_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, PROJECT_FILE)
    return data["rev"], data["savedAt"]


class EditorHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        print("[editor] " + fmt % args)

    def _json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    @staticmethod
    def _blocked(path):
        clean = unquote(path).lstrip("/")
        return clean.startswith("shared-data") or clean == "server.py"

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/project":
            self._json(load_project())
            return
        if self._blocked(parsed.path):
            self.send_error(404)
            return
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/project":
            self._handle_save_project()
            return
        if parsed.path == "/api/assets":
            self._handle_upload()
            return
        self.send_error(404)

    def _handle_save_project(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > 5 * 1024 * 1024:
            self._json({"error": "empty or too large"}, 400)
            return
        try:
            data = json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception as exc:  # noqa: BLE001
            self._json({"error": f"invalid json: {exc}"}, 400)
            return
        if not isinstance(data, dict) or not isinstance(data.get("pages"), list):
            self._json({"error": "invalid project"}, 400)
            return
        rev, saved_at = save_project(data)
        self._json({"rev": rev, "savedAt": saved_at})

    def _handle_upload(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0 or length > MAX_UPLOAD:
            self._json({"error": "file is empty or too large"}, 400)
            return
        query = parse_qs(urlparse(self.path).query)
        original = unquote(query.get("name", ["image"])[0]) or "image"
        ext = Path(original).suffix.lower()
        if ext not in ALLOWED_EXT:
            self._json({"error": f"unsupported type: {ext or '(none)'}"}, 400)
            return
        body = self.rfile.read(length)
        suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=5))
        stored = f"asset-{int(time.time() * 1000)}-{suffix}{ext}"
        (ASSETS_DIR / stored).write_bytes(body)
        self._json(
            {
                "id": stored,
                "name": original,
                "src": f"/assets/{stored}",
                "size": len(body),
            }
        )

    def end_headers(self):
        if not self.path.startswith("/assets/"):
            self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main():
    ensure_project()
    server = None
    port = BASE_PORT
    for candidate in range(BASE_PORT, BASE_PORT + 10):
        try:
            server = ThreadingHTTPServer(("127.0.0.1", candidate), EditorHandler)
            port = candidate
            break
        except OSError:
            continue
    if server is None:
        print(f"端口 {BASE_PORT}–{BASE_PORT + 9} 都被占用，无法启动。")
        sys.exit(1)

    url = f"http://127.0.0.1:{port}/"
    print(f"排版编辑器已启动：{url}")
    print("按 Ctrl+C 停止。")
    if "--no-browser" not in sys.argv:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止。")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
