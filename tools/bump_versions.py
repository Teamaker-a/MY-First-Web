from pathlib import Path

base = Path(__file__).resolve().parent.parent / "site"
for name in ["index.html", "works.html", "writing.html", "article.html"]:
    path = base / name
    text = path.read_text(encoding="utf-8")
    text = text.replace("?v=20261022c", "?v=20261022d")
    path.write_text(text, encoding="utf-8")
    print(name, "updated")
