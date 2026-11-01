from pathlib import Path
from PIL import Image

OUT = Path(r"C:\Users\沈旭斐\.zcode\workspace\default\personal-website\site\assets\images\writing")

# BLOOMING is a phone screenshot; the artwork occupies the same band as Nature in Contrast.
blooming = Image.open(OUT / "blooming.jpg").convert("RGB")
blooming.crop((0, 904, 1206, 1719)).save(OUT / "blooming.jpg", quality=90, optimize=True)

# The butterfly letter is currently named letter-blossom; the cherry blossom letter is letter-extra.
butterfly = OUT / "letter-blossom.jpg"
cherry = OUT / "letter-extra.jpg"
butterfly.replace(OUT / "letter-butterfly.jpg")
cherry.replace(OUT / "letter-blossom.jpg")

for name in ["blooming.jpg", "nature-in-contrast.jpg", "letter-butterfly.jpg", "letter-blossom.jpg"]:
    image = Image.open(OUT / name)
    print(name, image.size)
