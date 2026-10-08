"""Test generating seamless looping video for hero landscape:
- Length: 9.6 seconds at 25 fps = 240 frames
- Mathematically periodic (sinusoidal loop: frame 0 == frame 240)
- Water flow shimmer along the river channel
- Gentle subtle drift (1.0 to 1.015)
- Pipe raw frames directly to ffmpeg to encode MP4 and WEBM
"""
import subprocess
import math
from PIL import Image, ImageEnhance

poster_path = 'web/public/hero/landscape-poster.jpg'
base = Image.open(poster_path).convert('RGB')
w, h = base.size # 1920, 1080

# Pre-extract an amber channel mask
# Pixels where R > 160 and G > 100 and B < 120 and R > B + 50
print("Extracting river channel mask...")
pixels = base.load()
mask = Image.new('L', (w, h), 0)
mask_pixels = mask.load()

for y in range(h):
    for x in range(w):
        r, g, b = pixels[x, y]
        # Amber / warm river detection
        if r > 160 and g > 100 and b < 120 and (r - b) > 50:
            # Strength based on warm saturation
            intensity = min(255, int((r - b) * 1.5))
            mask_pixels[x, y] = intensity

# Blur mask slightly for smooth blending
from PIL import ImageFilter
mask = mask.filter(ImageFilter.GaussianBlur(radius=6))
print("Mask extracted.")

FPS = 24
DURATION = 10 # seconds
TOTAL_FRAMES = FPS * DURATION # 240 frames

# Command to encode MP4 (H.264)
mp4_out = 'web/public/hero/landscape.mp4'
cmd_mp4 = [
    '/opt/homebrew/bin/ffmpeg', '-y',
    '-f', 'rawvideo',
    '-vcodec', 'rawvideo',
    '-s', f'{w}x{h}',
    '-pix_fmt', 'rgb24',
    '-r', str(FPS),
    '-i', '-',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-crf', '22',
    '-preset', 'fast',
    mp4_out
]

# Command to encode WEBM (VP9)
webm_out = 'web/public/hero/landscape.webm'
cmd_webm = [
    '/opt/homebrew/bin/ffmpeg', '-y',
    '-f', 'rawvideo',
    '-vcodec', 'rawvideo',
    '-s', f'{w}x{h}',
    '-pix_fmt', 'rgb24',
    '-r', str(FPS),
    '-i', '-',
    '-c:v', 'libvpx-vp9',
    '-pix_fmt', 'yuv420p',
    '-crf', '32',
    '-b:v', '0',
    webm_out
]

print("Rendering frames into ffmpeg...")
proc = subprocess.Popen(cmd_mp4, stdin=subprocess.PIPE)

# Let's create an intensified river highlight layer
highlight_layer = ImageEnhance.Brightness(base).enhance(1.22)
contrast_layer = ImageEnhance.Contrast(highlight_layer).enhance(1.15)

for f_idx in range(TOTAL_FRAMES):
    t_norm = f_idx / TOTAL_FRAMES # 0.0 to 1.0
    phase = 2 * math.pi * t_norm
    
    # Pulsing shimmer wave: sin(phase)
    # Modulation factor: 0.85 to 1.15
    flow_factor = 0.5 + 0.5 * math.sin(phase)
    
    # Composite frame
    # We modulate the mask opacity with the phase
    mod_mask = mask.point(lambda p: int(p * (0.35 + 0.65 * flow_factor)))
    frame = Image.composite(contrast_layer, base, mod_mask)
    
    # Subtle zoom (1.0 to 1.012) looping smoothly: 1.0 + 0.006 * (1 - cos(phase))
    zoom = 1.0 + 0.006 * (1 - math.cos(phase))
    crop_w = int(w / zoom)
    crop_h = int(h / zoom)
    crop_x = (w - crop_w) // 2
    crop_y = (h - crop_h) // 2
    
    zoomed_frame = frame.crop((crop_x, crop_y, crop_x + crop_w, crop_y + crop_h))
    final_frame = zoomed_frame.resize((w, h), Image.Resampling.BILINEAR)
    
    proc.stdin.write(final_frame.tobytes())

proc.stdin.close()
proc.wait()
print(f"MP4 generated at {mp4_out}")

# Now encode WEBM from the MP4 directly using ffmpeg (very fast and high quality)
subprocess.run([
    '/opt/homebrew/bin/ffmpeg', '-y',
    '-i', mp4_out,
    '-c:v', 'libvpx-vp9',
    '-crf', '30',
    '-b:v', '0',
    webm_out
], check=True)
print(f"WEBM generated at {webm_out}")

import os
print(f"MP4 size: {os.path.getsize(mp4_out)/1024/1024:.2f} MB")
print(f"WEBM size: {os.path.getsize(webm_out)/1024/1024:.2f} MB")
