import base64
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FONT_DIR = ROOT / "site" / "assets" / "fonts"
CSS_OUT = ROOT / "site" / "css" / "fonts.css"
LICENSE_OUT = ROOT / "licenses" / "lxgw-wenkai-OFL.txt"
API = "https://api.github.com/repos/Daria1216/carousel-lamp"

FONT_DIR.mkdir(parents=True, exist_ok=True)


def get_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def blob_bytes(sha):
    data = get_json(f"{API}/git/blobs/{sha}")
    return base64.b64decode(data["content"])


css_meta = get_json(f"{API}/contents/app/font.css")
css = blob_bytes(css_meta["sha"]).decode("utf-8")
font_names = sorted(set(re.findall(r"url\('([^']+\.woff2)'\)", css)))
print("font files:", len(font_names))

tree = get_json(f"{API}/git/trees/main?recursive=1")
entries = {item["path"]: item for item in tree.get("tree", [])}

for url_path in font_names:
    name = url_path.rsplit("/", 1)[-1]
    path = f"public/fonts/{name}"
    entry = entries.get(path)
    if not entry:
        print("missing", path)
        continue
    target = FONT_DIR / name
    if not target.exists():
        target.write_bytes(blob_bytes(entry["sha"]))
    print("saved", name, target.stat().st_size)

ofl = entries.get("public/fonts/OFL.txt")
if ofl:
    LICENSE_OUT.parent.mkdir(exist_ok=True)
    LICENSE_OUT.write_bytes(blob_bytes(ofl["sha"]))

css = css.replace("url('/fonts/", "url('../assets/fonts/")
CSS_OUT.write_text(css, encoding="utf-8")
print("wrote", CSS_OUT, len(css), "bytes")
