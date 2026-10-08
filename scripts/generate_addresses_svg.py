"""Generate addresses.svg according to the updated spec:
- Isometric network grid of cubes
- One red cube lifted half a block above the grid (the logo's motif)
- Transparent background (no grey background square)
- Large in the frame, bleeding off edges like dashx
- Flat light-grey planes (#D6D6D2, #E2E2DF, #C4C4C2), thin mid-grey strokes (#A9A9A4)
- Falu red (#A63A24) for the lifted cube
- Thin address tags / routes extending from nodes
"""
import math

W, H = 1200, 800
C, S = math.cos(math.radians(30)), math.sin(math.radians(30))

def iso(x, y, z):
    # Isometric projection: x right-down, y left-down, z up
    ox, oy = 560, 480
    scale = 68
    px = ox + (x - y) * C * scale
    py = oy + (x + y) * S * scale - z * scale
    return px, py

def cube_faces(x, y, z, s=0.88, h=0.88):
    # Returns 3 visible faces: top, left (+y), right (+x)
    # top:
    p_top = [iso(x, y, z+h), iso(x+s, y, z+h), iso(x+s, y+s, z+h), iso(x, y+s, z+h)]
    # left face (facing viewer left, along y):
    p_left = [iso(x, y, z), iso(x, y+s, z), iso(x, y+s, z+h), iso(x, y, z+h)]
    # right face (facing viewer right, along x):
    p_right = [iso(x+s, y, z), iso(x+s, y+s, z), iso(x+s, y+s, z+h), iso(x+s, y, z+h)]
    return p_top, p_left, p_right

def poly_path(pts):
    return "M " + " L ".join(f"{x:.1f},{y:.1f}" for x, y in pts) + " Z"

cubes = []
# Grid of cubes extending across the frame
# We place cubes in (x, y) coordinates
grid = [
    (0, 0), (1, 0), (2, 0), (3, 0), (4, 0), (5, 0),
    (0, 1), (1, 1), (2, 1), (3, 1), (4, 1), (5, 1), (6, 1),
    (0, 2), (1, 2), (2, 2), (3, 2), (4, 2), (5, 2), (6, 2), (7, 2),
    (0, 3), (1, 3), (2, 3), (3, 3), (4, 3), (5, 3), (6, 3), (7, 3),
    (1, 4), (2, 4), (3, 4), (4, 4), (5, 4), (6, 4), (7, 4),
    (2, 5), (3, 5), (4, 5), (5, 5), (6, 5), (7, 5),
    (3, 6), (4, 6), (5, 6), (6, 6)
]

lifted_coord = (3, 3)

svg_parts = [
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" fill="none">',
    '  <defs>',
    '    <filter id="soft-shadow" x="-20%" y="-20%" width="150%" height="150%">',
    '      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.08" />',
    '    </filter>',
    '    <filter id="red-glow" x="-30%" y="-30%" width="160%" height="160%">',
    '      <feDropShadow dx="0" dy="8" stdDeviation="14" flood-color="#A63A24" flood-opacity="0.25" />',
    '    </filter>',
    '  </defs>'
]

# Grid connection lines underneath / linking blocks
svg_parts.append('  <!-- Connection grid lines -->')
svg_parts.append('  <g stroke="#E0E0DC" stroke-width="1.2" stroke-dasharray="3 3">')
for x, y in grid:
    if (x+1, y) in grid:
        p1 = iso(x+0.44, y+0.44, 0)
        p2 = iso(x+1.44, y+0.44, 0)
        svg_parts.append(f'    <line x1="{p1[0]:.1f}" y1="{p1[1]:.1f}" x2="{p2[0]:.1f}" y2="{p2[1]:.1f}" />')
    if (x, y+1) in grid:
        p1 = iso(x+0.44, y+0.44, 0)
        p2 = iso(x+0.44, y+1.44, 0)
        svg_parts.append(f'    <line x1="{p1[0]:.1f}" y1="{p1[1]:.1f}" x2="{p2[0]:.1f}" y2="{p2[1]:.1f}" />')
svg_parts.append('  </g>')

# Painter's order: sort cubes from furthest (x+y smallest) to closest (x+y largest)
# But lifted cube should be drawn at its z
sorted_coords = sorted(grid, key=lambda c: (c[0] + c[1], 1 if c == lifted_coord else 0))

# Ground shadow for the lifted cube
lx, ly = lifted_coord
p_shadow_top, _, _ = cube_faces(lx, ly, 0, s=0.88, h=0.01)
svg_parts.append('  <!-- Shadow under lifted cube -->')
svg_parts.append(f'  <path d="{poly_path(p_shadow_top)}" fill="#D5D5D0" opacity="0.6" filter="url(#soft-shadow)" />')

svg_parts.append('  <!-- Standard blocks -->')
for cx, cy in sorted_coords:
    if (cx, cy) == lifted_coord:
        continue
    top, left, right = cube_faces(cx, cy, 0)
    svg_parts.append(f'  <g class="block" stroke="#A9A9A4" stroke-width="1.2" stroke-linejoin="round">')
    # Top face
    svg_parts.append(f'    <path d="{poly_path(top)}" fill="#EEEEEC" />')
    # Left face
    svg_parts.append(f'    <path d="{poly_path(left)}" fill="#D8D8D4" />')
    # Right face
    svg_parts.append(f'    <path d="{poly_path(right)}" fill="#C8C8C4" />')
    svg_parts.append('  </g>')

# Now the lifted cube (half block up: z=0.55)
top, left, right = cube_faces(lx, ly, 0.55)
svg_parts.append('  <!-- Lifted customer deposit block -->')
svg_parts.append('  <g class="lifted-block" filter="url(#red-glow)">')
# Sides in Falu red
svg_parts.append(f'    <path d="{poly_path(left)}" fill="#A63A24" stroke="#8A2C18" stroke-width="1.4" stroke-linejoin="round" />')
svg_parts.append(f'    <path d="{poly_path(right)}" fill="#BD422A" stroke="#8A2C18" stroke-width="1.4" stroke-linejoin="round" />')
# Top face in crisp paper with red stroke
svg_parts.append(f'    <path d="{poly_path(top)}" fill="#F9F9F8" stroke="#A63A24" stroke-width="1.6" stroke-linejoin="round" />')
svg_parts.append('  </g>')

# Address tag callout for the lifted block
# A thin elegant pointer line extending to an address tag pill
top_center = iso(lx+0.44, ly+0.44, 1.43)
tag_x, tag_y = top_center[0] - 180, top_center[1] - 100
svg_parts.append('  <!-- Customer address tag -->')
svg_parts.append(f'  <g class="address-tag">')
svg_parts.append(f'    <path d="M {top_center[0]:.1f},{top_center[1]:.1f} L {top_center[0]-60:.1f},{top_center[1]-60:.1f} L {tag_x+130:.1f},{tag_y+16:.1f}" stroke="#A63A24" stroke-width="1.2" stroke-dasharray="2 3" />')
svg_parts.append(f'    <circle cx="{top_center[0]:.1f}" cy="{top_center[1]:.1f}" r="3.5" fill="#A63A24" />')
svg_parts.append(f'    <rect x="{tag_x:.1f}" y="{tag_y:.1f}" width="130" height="32" rx="6" fill="#FFFFFF" stroke="#A63A24" stroke-width="1.2" filter="url(#soft-shadow)" />')
svg_parts.append(f'    <rect x="{tag_x+12:.1f}" y="{tag_y+10:.1f}" width="60" height="4" rx="2" fill="#A63A24" opacity="0.8" />')
svg_parts.append(f'    <rect x="{tag_x+12:.1f}" y="{tag_y+18:.1f}" width="95" height="4" rx="2" fill="#D0D0CC" />')
svg_parts.append(f'    <circle cx="{tag_x+116:.1f}" cy="{tag_y+12:.1f}" r="2.5" fill="#A63A24" />')
svg_parts.append('  </g>')

# Other ambient subtle tags on a couple other blocks to show network
for ox, oy, dx, dy in [(1, 1, -120, -60), (5, 2, 80, -70), (2, 5, -100, 40)]:
    tc = iso(ox+0.44, oy+0.44, 0.88)
    tx, ty = tc[0] + dx, tc[1] + dy
    svg_parts.append(f'  <g opacity="0.6">')
    svg_parts.append(f'    <path d="M {tc[0]:.1f},{tc[1]:.1f} L {tx+35:.1f},{ty+12:.1f}" stroke="#A9A9A4" stroke-width="1" stroke-dasharray="2 2" />')
    svg_parts.append(f'    <circle cx="{tc[0]:.1f}" cy="{tc[1]:.1f}" r="2.5" fill="#A9A9A4" />')
    svg_parts.append(f'    <rect x="{tx:.1f}" y="{ty:.1f}" width="70" height="22" rx="4" fill="#F4F4F2" stroke="#C4C4C0" stroke-width="0.8" />')
    svg_parts.append(f'    <rect x="{tx+8:.1f}" y="{ty+7:.1f}" width="36" height="3" rx="1.5" fill="#B4B4B0" />')
    svg_parts.append(f'    <rect x="{tx+8:.1f}" y="{ty+13:.1f}" width="48" height="3" rx="1.5" fill="#D8D8D4" />')
    svg_parts.append('  </g>')

svg_parts.append('</svg>')

import os
target = '/Users/mac/Projects/jadonamite/naust/web/public/illustrations/addresses.svg'
with open(target, 'w') as f:
    f.write('\n'.join(svg_parts))
print(f"Written {target}, length {len(svg_parts)} lines")
