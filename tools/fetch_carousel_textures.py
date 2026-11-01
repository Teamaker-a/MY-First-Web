import base64
import json
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "assets" / "carousel"
OUT.mkdir(parents=True, exist_ok=True)

API = "https://api.github.com/repos/Daria1216/carousel-lamp"


def get_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


for name, target, max_width, quality in [
    ("carousel-base.png", "base.jpg", 1200, 88),
    ("carousel-column.png", "column.jpg", 720, 88),
    ("carousel-panels.png", "panels.jpg", 1200, 88),
]:
    meta = get_json(f"{API}/contents/public/{name}")
    blob = get_json(meta["git_url"])
    data = base64.b64decode(blob["content"])
    source = OUT / name
    source.write_bytes(data)
    image = Image.open(source).convert("RGB")
    ratio = min(1.0, max_width / image.width)
    resized = image.resize(
        (max(1, round(image.width * ratio)), max(1, round(image.height * ratio))),
        Image.LANCZOS,
    )
    resized.save(OUT / target, quality=quality, optimize=True)
    print(name, image.size, "->", resized.size, target, (OUT / target).stat().st_size)
    source.unlink()

for leftover in OUT.glob("*-api.json"):
    leftover.unlink()
