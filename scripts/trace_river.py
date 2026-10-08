"""Trace river centerline and build flow vector field"""
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter1d, map_coordinates, gaussian_filter

poster = Image.open('web/public/hero/landscape-poster.jpg').convert('RGB')
arr = np.array(poster, dtype=np.float32)

r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
river_mask = (r > 150) & (g > 90) & (b < 140) & ((r - b) > 40)
# Smooth the mask
smooth_mask = gaussian_filter(river_mask.astype(np.float32), sigma=4.0)

y_min, y_max = 408, 947
center_x = []
valid_ys = []
for y in range(y_min, y_max + 1):
    xs = np.where(river_mask[y, :])[0]
    if len(xs) > 0:
        center_x.append(np.mean(xs))
        valid_ys.append(y)

center_x = gaussian_filter1d(np.array(center_x), sigma=8.0)
valid_ys = np.array(valid_ys)

print("Centerline traced. First 5:", list(zip(valid_ys[:5], center_x[:5])))
print("Middle 5:", list(zip(valid_ys[250:255], center_x[250:255])))
print("Last 5:", list(zip(valid_ys[-5:], center_x[-5:])))
