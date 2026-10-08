"""Naust round 3: extruded geometric blocks, monochrome, Attio-style face lines."""
import math, os
import gen
from gen import rounded, f, svg, TAR, FOG, STEM, XTOP
from geo import inset

PITCH = math.radians(55)
GAP = 0.9            # white edge line between faces
R = 1.1              # corner rounding after the gap

def prism(x, s=1.0, w=11.0, dx=10.0, dy=6.0, base=30.0):
    """Gable prism in oblique view. Returns list of faces (polygons)."""
    w, dx, dy = w*s, dx*s, dy*s
    yA = base - 30*s + dy           # front apex (back apex sits at the top line)
    yE = yA + (w/2)*math.tan(PITCH)
    front = [(x, base), (x, yE), (x+w/2, yA), (x+w, yE), (x+w, base)]
    roof = [(x+w/2, yA), (x+w/2+dx, yA-dy), (x+w+dx, yE-dy), (x+w, yE)]
    side = [(x+w, yE), (x+w+dx, yE-dy), (x+w+dx, base-dy), (x+w, base)]
    return [front, roof, side], w+dx

def faces_path(faces):
    return ''.join(rounded(inset(p, GAP/2), R) for p in faces)

def hull_pts(faces):
    pts = sorted(set(p for fc in faces for p in fc))
    def cross(o, a, b): return (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0])
    lo, up = [], []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0: up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]

def mark(variant):
    big, bw = prism(0)
    if variant == 'long':
        big, bw = prism(0, w=12.0, dx=15.0, dy=8.0)
        return bw, f'<path d="{faces_path(big)}"/>'
    if variant == 'solo':
        return bw, f'<path d="{faces_path(big)}"/>'
    if variant == 'pair':           # small naust in front of the big one's side wall
        sx = 11.0 + 1.4
        small, sw = prism(sx, 0.5)
    else:                            # 'pair-out': small naust standing clear to the right
        sx = 21.0 + 0.8 - 5.0
        small, sw = prism(sx, 0.5)
    halo = inset(hull_pts(small), -GAP)
    m = (f'<mask id="k"><rect x="-5" y="-5" width="80" height="45" fill="#fff"/>'
         f'<path d="{rounded(halo, R)}" fill="#000"/></mask>')
    W = max(bw, sx + sw)
    return W, f'{m}<path mask="url(#k)" d="{faces_path(big)}"/><path d="{faces_path(small)}"/>'

# t with a slanted top at the depth angle (rises to the right, 6/10)
def g_t(x):
    sx = 3.5; top_l = 6.0; top_r = top_l - STEM*0.6
    stem = f'M{f(x+sx)} 30V{f(top_l)}L{f(x+sx+STEM)} {f(top_r)}V30Z'
    bar = f'M{f(x)} {XTOP}H{f(x+13.0)}V{XTOP+4.6}H{f(x)}Z'
    return 13.0, stem + bar
gen.g_t = g_t

def wordmark(x0, track=2.8):
    out, x = [], x0
    for g in (gen.g_n, gen.g_a, gen.g_u, gen.g_s, gen.g_t):
        w, d = g(x)
        out.append(d if d.startswith('<') else f'<path d="{d}"/>')
        x += w + track
    return x - track, ''.join(out)

if __name__ == '__main__':
    out = os.path.join(os.path.dirname(__file__), '..', 'round3'); os.makedirs(out, exist_ok=True)
    for name in ('solo', 'long', 'pair', 'pair-out'):
        w, m = mark(name)
        ww, wm = wordmark(w + 6.5)
        for theme, col in (('light', TAR), ('dark', FOG)):
            open(f'{out}/mark-{name}-{theme}.svg', 'w').write(svg(m, w, fill=col, pad=1))
            open(f'{out}/lockup-{name}-{theme}.svg', 'w').write(svg(m + wm, ww, fill=col, pad=1))
    print(sorted(os.listdir(out)))
