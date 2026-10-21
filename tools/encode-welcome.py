"""Kodar om välkomstbilden från PNG till WebP.

Originalet är 2048x1147 och väger 4,78 MB som PNG, vilket blir 6,38 MB när det
ligger base64-kodat i enfilsversionen. Som WebP i kvalitet 80 blir samma bild
omkring 320 KB utan synlig skillnad — den enskilt billigaste storleksvinsten i
hela projektet.

Resultatet checkas in, eftersom baseline ligger utanför git och bilden annars
inte skulle gå att återskapa vid ett rent bygge.

Körs med:  python3 tools/encode-welcome.py
"""
from PIL import Image
import os

SRC = "public/assets/welcome.png"
DST = "public/assets/welcome.webp"
QUALITY = 80

im = Image.open(SRC)
im.save(DST, "WEBP", quality=QUALITY, method=6)

before = os.path.getsize(SRC)
after = os.path.getsize(DST)
print(f"{SRC}  {before/1048576:.2f} MB  {im.width}x{im.height}")
print(f"{DST}  {after/1024:.0f} KB  (kvalitet {QUALITY})")
print(f"sparar {(before-after)/1048576:.2f} MB som fil, "
      f"{(before*4/3-after*4/3)/1048576:.2f} MB inbäddat som base64")
