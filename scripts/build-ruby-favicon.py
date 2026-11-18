"""Build favicon assets from Ruby Hair's existing white wordmark.

Only the original R glyph is reused; no external imagery or typefaces.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "public/media/RubyHair-WebHeader-Logo-Hell-818376d91.png"
OUT = ROOT / "public"
wordmark = Image.open(SOURCE).convert("RGBA")
# The original first letter R occupies x=0..44 in the main 0..69 px wordmark.
glyph = wordmark.crop((0, 0, 47, 71))
alpha = glyph.getchannel("A")
bbox = alpha.getbbox()
if not bbox:
    raise RuntimeError("Ruby Hair wordmark R glyph not found")
glyph = glyph.crop(bbox)
# Enforce original white glyph alpha, independent of transparent RGB pixel data.
mask = glyph.getchannel("A")
letter = Image.new("RGBA", glyph.size, (255, 255, 255, 0))
letter.putalpha(mask)

size = 512
canvas = Image.new("RGB", (size, size), (48, 37, 44))
w = 242
h = round(w * letter.height / letter.width)
letter = letter.resize((w, h), Image.Resampling.LANCZOS)
canvas.paste(letter, ((size - w) // 2, 68), letter)
draw = ImageDraw.Draw(canvas)
draw.rounded_rectangle((137, 446, 375, 454), radius=4, fill=(231, 179, 192))

canvas.save(OUT / "ruby-hair-favicon-512.png", optimize=True)
for dim, filename in [(192, "ruby-hair-favicon-192.png"), (180, "ruby-hair-apple-touch-icon.png"), (48, "ruby-hair-favicon-48.png"), (32, "ruby-hair-favicon-32.png")]:
    canvas.resize((dim, dim), Image.Resampling.LANCZOS).save(OUT / filename, optimize=True)
canvas.save(OUT / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
print("Ruby Hair favicon generated from original brand logo")
for path in [OUT / "favicon.ico", *[OUT / n for n in ["ruby-hair-favicon-512.png", "ruby-hair-favicon-192.png", "ruby-hair-apple-touch-icon.png", "ruby-hair-favicon-48.png", "ruby-hair-favicon-32.png"]]]:
    print(path.relative_to(ROOT), path.stat().st_size, "bytes")
