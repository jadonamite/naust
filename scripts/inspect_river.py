"""Inspect river coordinates and test fluid flow vector field on landscape-poster.jpg"""
import numpy as np
from PIL import Image

poster = Image.open('web/public/hero/landscape-poster.jpg').convert('RGB')
arr = np.array(poster, dtype=np.float32) # (1080, 1920, 3)

# River mask detection
r = arr[:, :, 0]
g = arr[:, :, 1]
b = arr[:, :, 2]

# Molten amber river has high R and G, lower B, high saturation
river_mask = (r > 150) & (g > 90) & (b < 140) & ((r - b) > 40)
print(f"Total river pixels: {np.sum(river_mask)}")

# Let's find y-range and x-centers of river for each row
y_indices, x_indices = np.where(river_mask)
print(f"Y min: {y_indices.min()}, Y max: {y_indices.max()}")
print(f"X min: {x_indices.min()}, X max: {x_indices.max()}")

# Save mask as image to inspect
mask_img = Image.fromarray((river_mask * 255).astype(np.uint8))
mask_img.save('web/public/hero/river_mask_debug.png')
print("Saved river_mask_debug.png")
