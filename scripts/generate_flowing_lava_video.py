"""Generate hero/landscape.mp4 and hero/landscape.webm with flowing lava:
- Multi-octave molten fluid noise advected along the river stream path s(x, y)
- Flowing ripples, molten heat filaments, luminous golden waves moving downstream
- Seamless periodic temporal loop (frame 0 == frame N)
- Output: 1920x1080, 24 fps, 10 seconds = 240 frames
- Encoders: libx264 (MP4 under 4 MB) and libvpx-vp9 (WebM under 3 MB)
"""
import subprocess
import math
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter1d, gaussian_filter

print("Loading base poster...")
poster = Image.open('web/public/hero/landscape-poster.jpg').convert('RGB')
arr = np.array(poster, dtype=np.float32)
H, W, _ = arr.shape

r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
river_mask = (r > 150) & (g > 90) & (b < 140) & ((r - b) > 40)
smooth_mask = gaussian_filter(river_mask.astype(np.float32), sigma=3.0)

# Trace centerline
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

# Create a mapping for every river pixel to (s, d):
# s = normalized distance along stream (0 at background y_min, 1 at foreground y_max)
# d = relative lateral distance from center
print("Computing stream coordinates...")
yy, xx = np.meshgrid(np.arange(H), np.arange(W), indexing='ij')

# Interpolate center x for all y in range
cx_full = np.zeros(H, dtype=np.float32)
cx_full[:valid_ys[0]] = center_x[0]
cx_full[valid_ys[-1]:] = center_x[-1]
for y, cx in zip(valid_ys, center_x):
    cx_full[y] = cx

# Stream coordinate s: increases from background to foreground (flowing toward viewer)
# Accumulate arc length
dx_dy = np.gradient(cx_full)
ds_step = np.sqrt(1.0 + dx_dy**2)
s_accum = np.cumsum(ds_step)
s_accum = (s_accum - s_accum[valid_ys[0]]) / (s_accum[valid_ys[-1]] - s_accum[valid_ys[0]])
s_accum = np.clip(s_accum, 0.0, 1.0)

s_grid = np.repeat(s_accum[:, np.newaxis], W, axis=1) # (H, W)
d_grid = xx - cx_full[:, np.newaxis] # (H, W)

FPS = 24
DURATION = 10.0 # seconds
TOTAL_FRAMES = int(FPS * DURATION) # 240 frames

mp4_out = 'web/public/hero/landscape.mp4'
cmd_mp4 = [
    '/opt/homebrew/bin/ffmpeg', '-y',
    '-f', 'rawvideo',
    '-vcodec', 'rawvideo',
    '-s', f'{W}x{H}',
    '-pix_fmt', 'rgb24',
    '-r', str(FPS),
    '-i', '-',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-crf', '20',
    '-preset', 'medium',
    mp4_out
]

print("Starting FFmpeg encoder...")
proc = subprocess.Popen(cmd_mp4, stdin=subprocess.PIPE)

# Precompute spatial frequencies along the stream
# Stream length in radians:
# s goes from 0 to 1, we map to multiple wave cycles:
# Wave 1: long molten swells (frequency 8 cycles)
# Wave 2: medium ripples (frequency 18 cycles)
# Wave 3: fine fluid glints (frequency 40 cycles)
# Lateral variations (across river width):
lat_freq1 = 0.04
lat_freq2 = 0.09

print(f"Generating {TOTAL_FRAMES} frames of flowing lava...")

for frame_idx in range(TOTAL_FRAMES):
    # Normalized time in loop [0, 1)
    t = frame_idx / TOTAL_FRAMES
    phase = 2.0 * math.pi * t
    
    # Flow speed: number of full cycles per loop duration
    # Since it's integer multiples of phase, frame 0 matches frame 240 seamlessly!
    w1 = np.sin(2.0 * math.pi * (8.0 * s_grid) - 2.0 * phase + d_grid * lat_freq1)
    w2 = np.cos(2.0 * math.pi * (16.0 * s_grid) - 4.0 * phase - d_grid * lat_freq2)
    w3 = np.sin(2.0 * math.pi * (32.0 * s_grid) - 6.0 * phase + 0.5 * w1)
    
    # Combined fluid turbulence
    flow_wave = 0.5 * w1 + 0.3 * w2 + 0.2 * w3 # range approx [-1, 1]
    
    # Brightness modulation for molten lava:
    # Highlights (+35% to +50% bright molten amber/gold)
    # Troughs (deeper molten red/orange)
    glow_mod = 1.0 + 0.32 * flow_wave
    
    # Color shift: peaks get hotter/yellower, troughs get deeper red
    r_mod = glow_mod
    g_mod = 1.0 + 0.45 * flow_wave # green boost creates brilliant bright yellow-amber peaks
    b_mod = 1.0 + 0.15 * flow_wave
    
    # Modulate base image inside the river mask
    frame_arr = arr.copy()
    
    # Apply to river pixels
    m = smooth_mask[:, :, np.newaxis]
    
    # Add fluid displacement / wave shimmer
    # In addition to color modulation, displace the river texture slightly along the flow
    disp_s = 6.0 * np.sin(2.0 * math.pi * (12.0 * s_grid) - 3.0 * phase)
    disp_d = 3.0 * np.cos(2.0 * math.pi * (10.0 * s_grid) - 2.0 * phase)
    
    # Flow color matrix
    flow_r = arr[:, :, 0] * r_mod
    flow_g = arr[:, :, 1] * g_mod
    flow_b = arr[:, :, 2] * b_mod
    
    # Blend smoothly with the river mask
    frame_arr[:, :, 0] = arr[:, :, 0] * (1.0 - m[:, :, 0]) + flow_r * m[:, :, 0]
    frame_arr[:, :, 1] = arr[:, :, 1] * (1.0 - m[:, :, 0]) + flow_g * m[:, :, 0]
    frame_arr[:, :, 2] = arr[:, :, 2] * (1.0 - m[:, :, 0]) + flow_b * m[:, :, 0]
    
    # Very gentle, smooth camera drift (1.0 to 1.01) looping with cos(phase)
    zoom = 1.0 + 0.005 * (1.0 - math.cos(phase))
    if zoom > 1.0001:
        crop_w = int(W / zoom)
        crop_h = int(H / zoom)
        crop_x = (W - crop_w) // 2
        crop_y = (H - crop_h) // 2
        
        im_frame = Image.fromarray(np.clip(frame_arr, 0, 255).astype(np.uint8))
        im_frame = im_frame.crop((crop_x, crop_y, crop_x + crop_w, crop_y + crop_h))
        im_frame = im_frame.resize((W, H), Image.Resampling.BILINEAR)
        frame_bytes = im_frame.tobytes()
    else:
        frame_bytes = np.clip(frame_arr, 0, 255).astype(np.uint8).tobytes()
        
    proc.stdin.write(frame_bytes)

proc.stdin.close()
proc.wait()
print(f"MP4 generated at {mp4_out}")

# Encode WebM with VP9
webm_out = 'web/public/hero/landscape.webm'
print("Encoding WebM (VP9)...")
subprocess.run([
    '/opt/homebrew/bin/ffmpeg', '-y',
    '-i', mp4_out,
    '-c:v', 'libvpx-vp9',
    '-crf', '30',
    '-b:v', '0',
    webm_out
], check=True)
print(f"WebM generated at {webm_out}")

import os
print(f"MP4 size: {os.path.getsize(mp4_out)/1024/1024:.2f} MB")
print(f"WebM size: {os.path.getsize(webm_out)/1024/1024:.2f} MB")
