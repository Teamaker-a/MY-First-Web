from pathlib import Path
from PIL import Image

OUT = Path(r"C:\Users\沈旭斐\.zcode\workspace\default\personal-website\site\assets\images\writing")
names = ["blooming.jpg", "nature-in-contrast.jpg", "letter-butterfly.jpg", "letter-blossom.jpg", "letter-extra.jpg"]

for name in names:
    image = Image.open(OUT / name).convert("RGB")
    gray = image.convert("L")
    mask = gray.point(lambda value: 255 if value > 18 else 0)
    bbox = mask.getbbox()
    print(name, image.size, "bbox", bbox)
    if bbox:
        cropped = image.crop(bbox)
        cropped.save(OUT / name, quality=90, optimize=True)
        print("  cropped ->", cropped.size)

# contact sheet of thumbnails
files = [OUT / name for name in names]
thumb_w, thumb_h = 260, 360
sheet = Image.new("RGB", (thumb_w * 5 + 8 * 4, thumb_h), (30, 20, 24))
for index, path in enumerate(files):
    image = Image.open(path).convert("RGB")
    ratio = min(thumb_w / image.width, thumb_h / image.height)
    resized = image.resize((round(image.width * ratio), round(image.height * ratio)), Image.LANCZOS)
    x = index * (thumb_w + 8) + (thumb_w - resized.width) // 2
    y = (thumb_h - resized.height) // 2
    sheet.paste(resized, (x, y))
sheet.save(OUT / "contact-sheet.jpg", quality=90)
print("sheet saved")
