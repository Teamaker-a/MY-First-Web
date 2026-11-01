from pathlib import Path
from PIL import Image

BASE = Path(r"C:\Users\沈旭斐\Documents\xwechat_files\wxid_k4x7unzutv3r22_753f\temp\RWTemp\2026-10\28f089c88c8c26148dad43321a472308")
OUT = Path(r"C:\Users\沈旭斐\.zcode\workspace\default\personal-website\site\assets\images\writing")
OUT.mkdir(parents=True, exist_ok=True)

files = {
    "23ea82d0c7a6a79f2c3befb9f1093240.jpg": "blooming.jpg",
    "417bf6824ff504315048af926c030bbb.jpg": "nature-in-contrast.jpg",
    "db2f0bb73085fc22836c972a5ae3d85b.jpg": "letter-butterfly.jpg",
    "5406a2d15d4794be1507acf454c1569d.jpg": "letter-blossom.jpg",
    "94e501dda02154cdfafdfa83a09b1b39.jpg": "letter-extra.jpg",
}

for source_name, target_name in files.items():
    source = BASE / source_name
    if not source.exists():
        print("missing", source)
        continue
    image = Image.open(source).convert("RGB")
    max_width = 1400 if target_name in ("blooming.jpg", "nature-in-contrast.jpg") else 900
    ratio = min(1.0, max_width / image.width)
    resized = image.resize(
        (max(1, round(image.width * ratio)), max(1, round(image.height * ratio))),
        Image.LANCZOS,
    )
    target = OUT / target_name
    resized.save(target, quality=90, optimize=True)
    print(target_name, image.size, "->", resized.size, target.stat().st_size)
