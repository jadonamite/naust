import os
from PIL import Image, ImageFilter, ImageEnhance

# 1. Process hero/cells.jpg
cells_path = 'web/public/hero/cells.jpg'
if os.path.exists(cells_path):
    img = Image.open(cells_path)
    img = img.resize((1200, 1200), Image.Resampling.LANCZOS)
    img.save(cells_path, 'JPEG', quality=84, optimize=True)
    print(f"cells.jpg: {os.path.getsize(cells_path)/1024:.1f} KB")

# 2. Process hero/landscape-poster.jpg
poster_path = 'web/public/hero/landscape-poster.jpg'
if os.path.exists(poster_path):
    img = Image.open(poster_path)
    img = img.resize((1920, 1080), Image.Resampling.LANCZOS)
    img.save(poster_path, 'JPEG', quality=82, optimize=True)
    print(f"landscape-poster.jpg: {os.path.getsize(poster_path)/1024:.1f} KB")

# 3. Process textures/paper.jpg
paper_path = 'web/public/textures/paper.jpg'
if os.path.exists(paper_path):
    img = Image.open(paper_path)
    img = img.resize((2400, 1200), Image.Resampling.LANCZOS)
    img.save(paper_path, 'JPEG', quality=82, optimize=True)
    print(f"paper.jpg: {os.path.getsize(paper_path)/1024:.1f} KB")

# 4. Generate hero/glow.jpg from landscape-poster.jpg
glow_path = 'web/public/hero/glow.jpg'
img = Image.open(poster_path)
# Crop to 16:10 (1600x1000)
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
# Heavy Gaussian blur (80px)
blurred = img.filter(ImageFilter.GaussianBlur(radius=80))
# Darken to ~25% brightness
enhancer = ImageEnhance.Brightness(blurred)
darkened = enhancer.enhance(0.28)
darkened.save(glow_path, 'JPEG', quality=80, optimize=True)
print(f"glow.jpg: {os.path.getsize(glow_path)/1024:.1f} KB")
