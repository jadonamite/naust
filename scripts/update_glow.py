import os
from PIL import Image, ImageFilter, ImageEnhance

# Save current heavy blur variant
os.system("cp web/public/hero/glow.jpg web/public/hero/glow-heavy-blur.jpg")

# Generate new less blurred variant
poster_path = 'web/public/hero/landscape-poster.jpg'
glow_path = 'web/public/hero/glow.jpg'

img = Image.open(poster_path)
w, h = img.size
target_ratio = 1600 / 1000
current_ratio = w / h

if current_ratio > target_ratio:
    new_w = int(h * target_ratio)
    left = (w - new_w) // 2
    img = img.crop((left, 0, left + new_w, h))
else:
    new_h = int(w / target_ratio)
    top = (h - new_h) // 2
    img = img.crop((0, top, w, top + new_h))

img = img.resize((1600, 1000), Image.Resampling.LANCZOS)

# Moderate blur (radius 18px): dunes, valley contours and glowing river channel stay clearly recognizable
blurred = img.filter(ImageFilter.GaussianBlur(radius=18))

# Darken to dark landscape scene (~32% brightness) with boosted warmth/contrast
enhancer = ImageEnhance.Brightness(blurred)
darkened = enhancer.enhance(0.32)
darkened = ImageEnhance.Contrast(darkened).enhance(1.18)

darkened.save(glow_path, 'JPEG', quality=84, optimize=True)
print(f"glow.jpg regenerated: {os.path.getsize(glow_path)/1024:.1f} KB")
