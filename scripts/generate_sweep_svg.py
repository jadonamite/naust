"""Generate sweep.svg according to the updated spec:
- Isometric tributary channels feeding into a central basin / treasury reservoir
- Red accents marking the money arriving
- Transparent background (no baked-in background square)
- Large in the frame, bleeding off the edges
- Flat light-grey planes, thin mid-grey strokes (#A9A9A4)
- Falu red (#A63A24) accents on arriving flow/tokens
"""
import math

W, H = 1200, 800

svg_parts = [
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" fill="none">',
    '  <defs>',
    '    <filter id="basin-shadow" x="-30%" y="-30%" width="160%" height="160%">',
    '      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.08" />',
    '    </filter>',
    '    <filter id="red-accent-glow" x="-40%" y="-40%" width="180%" height="180%">',
    '      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#A63A24" flood-opacity="0.3" />',
    '    </filter>',
    '    <linearGradient id="stream-fade-1" x1="0%" y1="0%" x2="100%" y2="100%">',
    '      <stop offset="0%" stop-color="#C0C0BA" stop-opacity="0.3" />',
    '      <stop offset="100%" stop-color="#A63A24" stop-opacity="0.9" />',
    '    </linearGradient>',
    '    <linearGradient id="stream-fade-2" x1="100%" y1="0%" x2="0%" y2="100%">',
    '      <stop offset="0%" stop-color="#C0C0BA" stop-opacity="0.3" />',
    '      <stop offset="100%" stop-color="#A63A24" stop-opacity="0.9" />',
    '    </linearGradient>',
    '  </defs>',
]

# Source nodes at the top edges (representing customer deposit parties)
# Left branch, center-left, center-right, right branch
# Isometric perspective:
# Basin center at (600, 560), width rx=220, ry=90

# Let's draw the tributary channel paths running from beyond top edges down to basin
# Channel 1 (from far left top): (100, 120) -> (320, 260) -> (480, 420) -> (550, 530)
# Channel 2 (from top center-left): (380, -20) -> (460, 180) -> (520, 340) -> (580, 520)
# Channel 3 (from top center-right): (780, -30) -> (720, 180) -> (660, 350) -> (615, 520)
# Channel 4 (from far right top): (1120, 110) -> (920, 260) -> (760, 410) -> (650, 535)

channels = [
    # (path_d, width, is_active)
    ("M 60,60 C 240,160 400,320 540,530", 22, False),
    ("M 380,-30 C 420,180 500,340 575,520", 20, True),
    ("M 820,-30 C 760,180 680,340 625,520", 20, False),
    ("M 1140,70 C 960,200 780,350 660,530", 22, True),
]

# Channel aqueducts / troughs (drawn as isometric elevated or recessed troughs)
svg_parts.append('  <!-- Converging tributary channels -->')
for path_d, w, active in channels:
    # Outer trench/bed
    svg_parts.append(f'  <path d="{path_d}" stroke="#E6E6E3" stroke-width="{w+8}" stroke-linecap="round" fill="none" />')
    svg_parts.append(f'  <path d="{path_d}" stroke="#C6C6C1" stroke-width="{w+4}" stroke-linecap="round" fill="none" />')
    svg_parts.append(f'  <path d="{path_d}" stroke="#EEEEEC" stroke-width="{w}" stroke-linecap="round" fill="none" />')
    # Guide rails
    svg_parts.append(f'  <path d="{path_d}" stroke="#A9A9A4" stroke-width="1.2" stroke-linecap="round" fill="none" />')

# Source boxes/deposit origin blocks at the tops of channels
# Node 1 (left)
svg_parts.append('  <!-- Origin nodes / deposit parties -->')
for nx, ny in [(140, 100), (410, 50), (790, 45), (1060, 110)]:
    # small isometric cube
    # top face
    svg_parts.append(f'  <g stroke="#A9A9A4" stroke-width="1.2" stroke-linejoin="round">')
    svg_parts.append(f'    <polygon points="{nx},{ny} {nx+26},{ny+15} {nx},{ny+30} {nx-26},{ny+15}" fill="#F4F4F2" />')
    svg_parts.append(f'    <polygon points="{nx-26},{ny+15} {nx},{ny+30} {nx},{ny+60} {nx-26},{ny+45}" fill="#D8D8D4" />')
    svg_parts.append(f'    <polygon points="{nx},{ny+30} {nx+26},{ny+15} {nx+26},{ny+45} {nx},{ny+60}" fill="#C8C8C4" />')
    svg_parts.append(f'  </g>')

# Flow lines inside channels
svg_parts.append('  <!-- Liquid flow lines and token discs -->')
svg_parts.append('  <path d="M 140,130 C 280,210 420,340 545,530" stroke="#B0B0AA" stroke-width="2" stroke-dasharray="8 8" fill="none" />')
svg_parts.append('  <path d="M 410,80 C 440,200 500,340 575,520" stroke="url(#stream-fade-1)" stroke-width="3" stroke-dasharray="12 6" fill="none" />')
svg_parts.append('  <path d="M 790,75 C 750,200 680,340 625,520" stroke="#B0B0AA" stroke-width="2" stroke-dasharray="8 8" fill="none" />')
svg_parts.append('  <path d="M 1060,140 C 920,240 760,370 655,530" stroke="url(#stream-fade-2)" stroke-width="3.5" stroke-dasharray="14 6" fill="none" />')

# Discrete token coins sweeping along the channels
# Left-center channel (active sweep with red tokens)
for t, cx, cy, is_red in [
    (1, 450, 190, False),
    (2, 495, 300, True),
    (3, 540, 420, True),
    (4, 960, 205, False),
    (5, 840, 310, False),
    (6, 730, 425, True),
    (7, 680, 485, True)
]:
    stroke_col = "#A63A24" if is_red else "#A9A9A4"
    fill_col = "#A63A24" if is_red else "#EAEAEA"
    fill_top = "#F9F9F8" if is_red else "#FFFFFF"
    filter_attr = 'filter="url(#red-accent-glow)"' if is_red else ''
    svg_parts.append(f'  <g class="coin" {filter_attr}>')
    # 3D token cylinder (disc)
    svg_parts.append(f'    <path d="M {cx-14},{cy} A 14 7 0 0 0 {cx+14},{cy} L {cx+14},{cy+6} A 14 7 0 0 1 {cx-14},{cy+6} Z" fill="{fill_col}" stroke="{stroke_col}" stroke-width="1" />')
    svg_parts.append(f'    <ellipse cx="{cx}" cy="{cy}" rx="14" ry="7" fill="{fill_top}" stroke="{stroke_col}" stroke-width="1.2" />')
    if is_red:
        svg_parts.append(f'    <ellipse cx="{cx}" cy="{cy}" rx="8" ry="4" fill="#A63A24" opacity="0.85" />')
    svg_parts.append(f'  </g>')

# The Central Basin / Treasury Pool
# Multi-layered concentric isometric ellipses
bx, by = 600, 590
svg_parts.append('  <!-- Central treasury basin -->')
# Outer ground cutout
svg_parts.append(f'  <ellipse cx="{bx}" cy="{by}" rx="260" ry="105" fill="#E8E8E4" stroke="#C8C8C4" stroke-width="1.5" />')
# Basin outer wall rim (downward extrusion)
svg_parts.append(f'  <path d="M {bx-240},{by} A 240 96 0 0 0 {bx+240},{by} L {bx+240},{by+28} A 240 96 0 0 1 {bx-240},{by+28} Z" fill="#D6D6D2" stroke="#A9A9A4" stroke-width="1.2" filter="url(#basin-shadow)" />')
# Basin rim top surface
svg_parts.append(f'  <ellipse cx="{bx}" cy="{by}" rx="240" ry="96" fill="#F4F4F2" stroke="#A9A9A4" stroke-width="1.6" />')
# Basin inner rim wall (interior step)
svg_parts.append(f'  <path d="M {bx-210},{by} A 210 84 0 0 0 {bx+210},{by} L {bx+210},{by+18} A 210 84 0 0 1 {bx-210},{by+18} Z" fill="#C2C2BD" stroke="#A9A9A4" stroke-width="1.2" />')
# Basin liquid pool surface
svg_parts.append(f'  <ellipse cx="{bx}" cy="{by+18}" rx="208" ry="83" fill="#EFEFEA" stroke="#B0B0AA" stroke-width="1.2" />')

# Concentric ripples converging in the center
svg_parts.append(f'  <ellipse cx="{bx}" cy="{by+18}" rx="150" ry="60" fill="none" stroke="#D4D4CE" stroke-width="1.2" stroke-dasharray="4 4" />')
svg_parts.append(f'  <ellipse cx="{bx}" cy="{by+18}" rx="95" ry="38" fill="none" stroke="#C4C4BE" stroke-width="1.2" />')

# Convergence splash / Treasury core (Red glow focal point where money arrives)
svg_parts.append(f'  <!-- Convergence point (Falu red arrival) -->')
svg_parts.append(f'  <ellipse cx="{bx}" cy="{by+18}" rx="55" ry="22" fill="#F7E6E2" stroke="#A63A24" stroke-width="1.6" filter="url(#red-accent-glow)" />')
svg_parts.append(f'  <ellipse cx="{bx}" cy="{by+18}" rx="32" ry="13" fill="#A63A24" opacity="0.85" />')
svg_parts.append(f'  <circle cx="{bx}" cy="{by+15}" r="4" fill="#FFFFFF" />')

# Floating concentric measurement / ring ticks
for angle_deg in range(0, 360, 30):
    rad = math.radians(angle_deg)
    rx1, ry1 = bx + 225 * math.cos(rad), by + 90 * math.sin(rad)
    rx2, ry2 = bx + 235 * math.cos(rad), by + 94 * math.sin(rad)
    svg_parts.append(f'  <line x1="{rx1:.1f}" y1="{ry1:.1f}" x2="{rx2:.1f}" y2="{ry2:.1f}" stroke="#A9A9A4" stroke-width="1" />')

svg_parts.append('</svg>')

target = '/Users/mac/Projects/jadonamite/naust/web/public/illustrations/sweep.svg'
with open(target, 'w') as f:
    f.write('\n'.join(svg_parts))
print(f"Written {target}, length {len(svg_parts)} lines")
