"""Generate full-bleed, high-contrast, perfectly-framed illustrations for:
1. web/public/illustrations/addresses.svg & .png
2. web/public/illustrations/sweep.svg & .png

Framing:
- viewBox="0 0 1000 700" (matches the ~4:3 aspect ratio of .art container)
- Artwork starts right near y=20 at top and fills down to y=680, running off edges.
- High-contrast crisp lines: stroke #555550 and #888882 (clearly visible on card surface).
- Solid isometric planes: #ECECE9 (top), #D6D6D2 (left), #C2C2BD (right).
- Lifted block: Falu red #A63A24 sides, white top with red stroke, red address tag.
"""
import math
import os
import subprocess

C, S = math.cos(math.radians(30)), math.sin(math.radians(30))

# ----------------------------------------------------
# 1. ADDRESSES ILLUSTRATION
# ----------------------------------------------------
def build_addresses():
    W, H = 1000, 700
    ox, oy = 500, 180 # Center near upper-middle so grid cascades down and fills frame
    scale = 65

    def iso(x, y, z):
        px = ox + (x - y) * C * scale
        py = oy + (x + y) * S * scale - z * scale
        return px, py

    def cube(x, y, z, s=0.88, h=0.88):
        top = [iso(x, y, z+h), iso(x+s, y, z+h), iso(x+s, y+s, z+h), iso(x, y+s, z+h)]
        left = [iso(x, y, z), iso(x, y+s, z), iso(x, y+s, z+h), iso(x, y, z+h)]
        right = [iso(x+s, y, z), iso(x+s, y+s, z), iso(x+s, y+s, z+h), iso(x+s, y, z+h)]
        return top, left, right

    def poly(pts):
        return "M " + " L ".join(f"{p[0]:.1f},{p[1]:.1f}" for p in pts) + " Z"

    grid = [
        (-1, 0), (0, 0), (1, 0), (2, 0), (3, 0), (4, 0),
        (-1, 1), (0, 1), (1, 1), (2, 1), (3, 1), (4, 1), (5, 1),
        (-2, 2), (-1, 2), (0, 2), (1, 2), (2, 2), (3, 2), (4, 2), (5, 2),
        (-2, 3), (-1, 3), (0, 3), (1, 3), (2, 3), (3, 3), (4, 3), (5, 3), (6, 3),
        (-1, 4), (0, 4), (1, 4), (2, 4), (3, 4), (4, 4), (5, 4),
        (0, 5), (1, 5), (2, 5), (3, 5), (4, 5),
        (1, 6), (2, 6), (3, 6)
    ]
    
    lifted = (1, 2) # Front/center focal block

    lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" fill="none">',
        '  <defs>',
        '    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">',
        '      <feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#000000" flood-opacity="0.12" />',
        '    </filter>',
        '    <filter id="lift-shadow" x="-40%" y="-40%" width="180%" height="180%">',
        '      <feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="#A63A24" flood-opacity="0.3" />',
        '    </filter>',
        '  </defs>',
    ]

    # Grid guide lines connecting blocks
    lines.append('  <!-- Floor guide network -->')
    lines.append('  <g stroke="#D4D4D0" stroke-width="1.5" stroke-dasharray="4 4">')
    for x, y in grid:
        if (x+1, y) in grid:
            p1 = iso(x+0.44, y+0.44, 0)
            p2 = iso(x+1.44, y+0.44, 0)
            lines.append(f'    <line x1="{p1[0]:.1f}" y1="{p1[1]:.1f}" x2="{p2[0]:.1f}" y2="{p2[1]:.1f}" />')
        if (x, y+1) in grid:
            p1 = iso(x+0.44, y+0.44, 0)
            p2 = iso(x+0.44, y+1.44, 0)
            lines.append(f'    <line x1="{p1[0]:.1f}" y1="{p1[1]:.1f}" x2="{p2[0]:.1f}" y2="{p2[1]:.1f}" />')
    lines.append('  </g>')

    # Ground shadow for lifted cube
    lx, ly = lifted
    s_top, _, _ = cube(lx, ly, 0, s=0.88, h=0.01)
    lines.append(f'  <path d="{poly(s_top)}" fill="#C4C4BE" opacity="0.8" filter="url(#shadow)" />')

    # Draw standard cubes in painter's order
    sorted_grid = sorted(grid, key=lambda c: (c[0] + c[1], 1 if c == lifted else 0))
    for cx, cy in sorted_grid:
        if (cx, cy) == lifted:
            continue
        top, left, right = cube(cx, cy, 0)
        lines.append(f'  <g class="block" stroke="#888880" stroke-width="1.4" stroke-linejoin="round">')
        lines.append(f'    <path d="{poly(top)}" fill="#F2F2EE" />')
        lines.append(f'    <path d="{poly(left)}" fill="#DCDCD8" />')
        lines.append(f'    <path d="{poly(right)}" fill="#C8C8C2" />')
        lines.append('  </g>')

    # Lifted cube (half block above grid: z=0.55)
    top, left, right = cube(lx, ly, 0.58)
    lines.append('  <!-- Picked out deposit address cube (Naust lifted cell) -->')
    lines.append('  <g class="lifted-cube" filter="url(#lift-shadow)">')
    lines.append(f'    <path d="{poly(left)}" fill="#A63A24" stroke="#8A2C18" stroke-width="1.6" stroke-linejoin="round" />')
    lines.append(f'    <path d="{poly(right)}" fill="#BD422A" stroke="#8A2C18" stroke-width="1.6" stroke-linejoin="round" />')
    lines.append(f'    <path d="{poly(top)}" fill="#FFFFFF" stroke="#A63A24" stroke-width="2.0" stroke-linejoin="round" />')
    lines.append('  </g>')

    # Prominent callout address tag for the lifted block
    tc = iso(lx+0.44, ly+0.44, 1.46)
    tag_x, tag_y = tc[0] - 220, tc[1] - 80
    lines.append('  <!-- Attributed address tag -->')
    lines.append('  <g class="callout" filter="url(#shadow)">')
    lines.append(f'    <path d="M {tc[0]:.1f},{tc[1]:.1f} L {tc[0]-70:.1f},{tc[1]-50:.1f} L {tag_x+160:.1f},{tag_y+18:.1f}" stroke="#A63A24" stroke-width="2" stroke-dasharray="3 3" />')
    lines.append(f'    <circle cx="{tc[0]:.1f}" cy="{tc[1]:.1f}" r="4.5" fill="#A63A24" />')
    lines.append(f'    <rect x="{tag_x:.1f}" y="{tag_y:.1f}" width="160" height="38" rx="8" fill="#FFFFFF" stroke="#A63A24" stroke-width="1.8" />')
    lines.append(f'    <rect x="{tag_x+16:.1f}" y="{tag_y+12:.1f}" width="75" height="5" rx="2.5" fill="#A63A24" />')
    lines.append(f'    <rect x="{tag_x+16:.1f}" y="{tag_y+21:.1f}" width="110" height="5" rx="2.5" fill="#D0D0CC" />')
    lines.append(f'    <circle cx="{tag_x+142:.1f}" cy="{tag_y+15:.1f}" r="3" fill="#A63A24" />')
    lines.append('  </g>')

    # Secondary tags on distant nodes to show the address network
    for ox2, oy2, dx, dy in [(-1, 1, -110, -50), (4, 1, 70, -60), (3, 4, 75, 40)]:
        pt = iso(ox2+0.44, oy2+0.44, 0.88)
        tx, ty = pt[0] + dx, pt[1] + dy
        lines.append('  <g opacity="0.75">')
        lines.append(f'    <path d="M {pt[0]:.1f},{pt[1]:.1f} L {tx+40:.1f},{ty+14:.1f}" stroke="#888880" stroke-width="1.2" stroke-dasharray="2 3" />')
        lines.append(f'    <circle cx="{pt[0]:.1f}" cy="{pt[1]:.1f}" r="3" fill="#888880" />')
        lines.append(f'    <rect x="{tx:.1f}" y="{ty:.1f}" width="85" height="26" rx="5" fill="#F8F8F6" stroke="#999990" stroke-width="1" />')
        lines.append(f'    <rect x="{tx+10:.1f}" y="{ty+8:.1f}" width="40" height="4" rx="2" fill="#999990" />')
        lines.append(f'    <rect x="{tx+10:.1f}" y="{ty+15:.1f}" width="55" height="3" rx="1.5" fill="#D4D4D0" />')
        lines.append('  </g>')

    lines.append('</svg>')
    return '\n'.join(lines)

# ----------------------------------------------------
# 2. SWEEP ILLUSTRATION
# ----------------------------------------------------
def build_sweep():
    W, H = 1000, 700
    bx, by = 500, 480 # Treasury basin placed in lower-center
    
    lines = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" fill="none">',
        '  <defs>',
        '    <filter id="basin-shadow" x="-30%" y="-30%" width="160%" height="160%">',
        '      <feDropShadow dx="0" dy="16" stdDeviation="16" flood-color="#000000" flood-opacity="0.14" />',
        '    </filter>',
        '    <filter id="red-glow" x="-40%" y="-40%" width="180%" height="180%">',
        '      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#A63A24" flood-opacity="0.4" />',
        '    </filter>',
        '    <linearGradient id="grad-red-left" x1="0%" y1="0%" x2="100%" y2="100%">',
        '      <stop offset="0%" stop-color="#C0C0BA" stop-opacity="0.4" />',
        '      <stop offset="100%" stop-color="#A63A24" stop-opacity="0.95" />',
        '    </linearGradient>',
        '    <linearGradient id="grad-red-right" x1="100%" y1="0%" x2="0%" y2="100%">',
        '      <stop offset="0%" stop-color="#C0C0BA" stop-opacity="0.4" />',
        '      <stop offset="100%" stop-color="#A63A24" stop-opacity="0.95" />',
        '    </linearGradient>',
        '  </defs>',
    ]

    # Converging tributary channels from top edges down into the central basin
    channels = [
        ("M 20,-20 C 180,120 340,260 445,430", 30),
        ("M 320,-40 C 370,140 430,280 480,420", 26),
        ("M 680,-40 C 630,140 570,280 520,420", 26),
        ("M 980,-20 C 820,120 660,260 555,430", 30),
    ]

    lines.append('  <!-- Elevated tributary channels -->')
    for d, w in channels:
        # Channel bed and borders
        lines.append(f'  <path d="{d}" stroke="#E6E6E2" stroke-width="{w+10}" stroke-linecap="round" fill="none" />')
        lines.append(f'  <path d="{d}" stroke="#C6C6C0" stroke-width="{w+4}" stroke-linecap="round" fill="none" />')
        lines.append(f'  <path d="{d}" stroke="#F4F4F1" stroke-width="{w}" stroke-linecap="round" fill="none" />')
        lines.append(f'  <path d="{d}" stroke="#777770" stroke-width="1.4" stroke-linecap="round" fill="none" />')

    # Source deposit nodes (Canton party blocks) at upper channel ends
    lines.append('  <!-- Customer deposit party nodes -->')
    for nx, ny in [(100, 50), (350, 20), (650, 20), (900, 50)]:
        lines.append('  <g stroke="#777770" stroke-width="1.4" stroke-linejoin="round">')
        lines.append(f'    <polygon points="{nx},{ny} {nx+30},{ny+17} {nx},{ny+34} {nx-30},{ny+17}" fill="#FFFFFF" />')
        lines.append(f'    <polygon points="{nx-30},{ny+17} {nx},{ny+34} {nx},{ny+68} {nx-30},{ny+51}" fill="#D8D8D4" />')
        lines.append(f'    <polygon points="{nx},{ny+34} {nx+30},{ny+17} {nx+30},{ny+51} {nx},{ny+68}" fill="#C2C2BD" />')
        lines.append('  </g>')

    # Dynamic flow streams inside the channels
    lines.append('  <!-- Capital flow vectors -->')
    lines.append('  <path d="M 100,84 C 220,180 340,280 445,430" stroke="#999990" stroke-width="2.5" stroke-dasharray="8 8" fill="none" />')
    lines.append('  <path d="M 350,54 C 380,160 430,280 480,420" stroke="url(#grad-red-left)" stroke-width="3.8" stroke-dasharray="14 6" fill="none" />')
    lines.append('  <path d="M 650,54 C 620,160 570,280 520,420" stroke="#999990" stroke-width="2.5" stroke-dasharray="8 8" fill="none" />')
    lines.append('  <path d="M 900,84 C 780,180 660,280 555,430" stroke="url(#grad-red-right)" stroke-width="3.8" stroke-dasharray="14 6" fill="none" />')

    # Moving token discs with Falu red highlights arriving
    tokens = [
        (380, 150, False),
        (420, 260, True),
        (455, 360, True),
        (820, 150, False),
        (720, 260, False),
        (625, 360, True),
        (570, 420, True)
    ]

    for cx, cy, is_red in tokens:
        stk = "#A63A24" if is_red else "#777770"
        fill_b = "#A63A24" if is_red else "#D0D0CC"
        fill_t = "#FFFFFF"
        flt = 'filter="url(#red-glow)"' if is_red else ''
        lines.append(f'  <g class="token" {flt}>')
        lines.append(f'    <path d="M {cx-16},{cy} A 16 8 0 0 0 {cx+16},{cy} L {cx+16},{cy+7} A 16 8 0 0 1 {cx-16},{cy+7} Z" fill="{fill_b}" stroke="{stk}" stroke-width="1.2" />')
        lines.append(f'    <ellipse cx="{cx}" cy="{cy}" rx="16" ry="8" fill="{fill_t}" stroke="{stk}" stroke-width="1.5" />')
        if is_red:
            lines.append(f'    <ellipse cx="{cx}" cy="{cy}" rx="9" ry="4.5" fill="#A63A24" opacity="0.9" />')
        lines.append('  </g>')

    # Central Treasury Basin
    lines.append('  <!-- Central consolidated treasury basin -->')
    lines.append(f'  <ellipse cx="{bx}" cy="{by}" rx="280" ry="110" fill="#E8E8E4" stroke="#C4C4C0" stroke-width="1.8" />')
    lines.append(f'  <path d="M {bx-260},{by} A 260 102 0 0 0 {bx+260},{by} L {bx+260},{by+32} A 260 102 0 0 1 {bx-260},{by+32} Z" fill="#D0D0CC" stroke="#777770" stroke-width="1.4" filter="url(#basin-shadow)" />')
    lines.append(f'  <ellipse cx="{bx}" cy="{by}" rx="260" ry="102" fill="#F8F8F5" stroke="#777770" stroke-width="2.0" />')
    
    # Inner basin step and liquid pool
    lines.append(f'  <path d="M {bx-225},{by} A 225 88 0 0 0 {bx+225},{by} L {bx+225},{by+22} A 225 88 0 0 1 {bx-225},{by+22} Z" fill="#BEBEBA" stroke="#777770" stroke-width="1.4" />')
    lines.append(f'  <ellipse cx="{bx}" cy="{by+22}" rx="220" ry="86" fill="#F0F0EB" stroke="#888880" stroke-width="1.4" />')
    
    # Concentric ripples
    lines.append(f'  <ellipse cx="{bx}" cy="{by+22}" rx="160" ry="62" fill="none" stroke="#C8C8C2" stroke-width="1.4" stroke-dasharray="5 5" />')
    lines.append(f'  <ellipse cx="{bx}" cy="{by+22}" rx="100" ry="39" fill="none" stroke="#B4B4AE" stroke-width="1.4" />')

    # Convergence point: Falu red treasury nexus
    lines.append('  <!-- Arrival focal point -->')
    lines.append(f'  <ellipse cx="{bx}" cy="{by+22}" rx="60" ry="24" fill="#F9E8E4" stroke="#A63A24" stroke-width="2.0" filter="url(#red-glow)" />')
    lines.append(f'  <ellipse cx="{bx}" cy="{by+22}" rx="35" ry="14" fill="#A63A24" opacity="0.9" />')
    lines.append(f'  <circle cx="{bx}" cy="{by+20}" r="5" fill="#FFFFFF" />')

    lines.append('</svg>')
    return '\n'.join(lines)

# Write SVGs
svg_addr = build_addresses()
with open('web/public/illustrations/addresses.svg', 'w') as f:
    f.write(svg_addr)
print("Written web/public/illustrations/addresses.svg")

svg_swp = build_sweep()
with open('web/public/illustrations/sweep.svg', 'w') as f:
    f.write(svg_swp)
print("Written web/public/illustrations/sweep.svg")
