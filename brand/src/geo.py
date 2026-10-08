"""Naust round 2: abstract bevelled bars at the roof pitch (Attio-style construction)."""
import math, os
from gen import rounded, f, wordmark, svg, RED, TAR, FOG, STEM, XTOP

A = math.radians(55); R = 2.4; INSET = 2.4; LINE = 0.85

def inset(pts, d):
    """Inset a convex polygon (clockwise in SVG coords) by distance d."""
    n = len(pts); lines = []
    sx = sum((pts[i][0]*pts[(i+1)%n][1] - pts[(i+1)%n][0]*pts[i][1]) for i in range(n))
    s = 1 if sx > 0 else -1
    for i in range(n):
        (x1, y1), (x2, y2) = pts[i], pts[(i+1) % n]
        dx, dy = x2-x1, y2-y1; L = math.hypot(dx, dy)
        nx, ny = -dy/L*s, dx/L*s
        lines.append(((x1+nx*d, y1+ny*d), (dx, dy)))
    out = []
    for i in range(n):
        (p, r), (q, t) = lines[i-1], lines[i]
        den = r[0]*t[1] - r[1]*t[0]
        u = ((q[0]-p[0])*t[1] - (q[1]-p[1])*t[0]) / den
        out.append((p[0]+r[0]*u, p[1]+r[1]*u))
    return out

def tile(pts, r=R, bevel=True):
    d = rounded(pts, r)
    if bevel:
        a = inset(pts, INSET); b = inset(pts, INSET + LINE)
        d += rounded(a, max(r-INSET*0.6, 0.6)) + rounded(b, max(r-INSET*0.8, 0.5))
    return f'<path fill-rule="evenodd" d="{d}"/>'

def bar(x_bottom, w, y_top, y_bot, lean):
    """Parallelogram with flat top/bottom, sides at pitch A. lean=+1 rises to the right."""
    run = (y_bot - y_top)/math.tan(A) * lean
    return [(x_bottom, y_bot), (x_bottom+run, y_top), (x_bottom+run+w, y_top), (x_bottom+w, y_bot)]

def g1():   # two bars meeting as a roof, flat-topped apex with a gap
    w, gap = 13.0, 1.6
    run = 30/math.tan(A)
    left = bar(0, w, 0, 30, +1)
    rx = run + w + gap + run          # right bar's bottom-left x, mirrored
    right = bar(rx, w, 0, 30, -1)
    W = rx + w
    return W, tile(left) + tile(right)

def g2():   # Attio's 2:1, mirrored into a gable: long bar rising, short bar falling at its foot
    w = 13.0; run = 30/math.tan(A)
    long = bar(0, w, 0, 30, +1)
    sx = run + w + 1.4                # short bar starts beside the long bar's top-right... at half height
    short = bar(run + w + 1.6, w, 15, 30, -1)
    W = run + w + 1.6 + w
    return W, tile(long) + tile(short)

def g3():   # long rising bar plus a short hull tile at its foot (keel flat, ends at the pitch)
    w = 13.0; run = 30/math.tan(A)
    long = bar(0, w, 0, 30, +1)
    h = 15.0; hrun = h/math.tan(A)
    x0 = run/2 + w + 2.0
    hull = [(x0, 30 - h), (x0 + 12 + 2*hrun, 30 - h), (x0 + 12 + hrun, 30), (x0 + hrun, 30)]
    W = max(run + w, x0 + 12 + 2*hrun)
    return W, tile(long) + tile(hull)

if __name__ == '__main__':
    out = os.path.join(os.path.dirname(__file__), '..', 'round2'); os.makedirs(out, exist_ok=True)
    for name, fn in (('g1', g1), ('g2', g2), ('g3', g3)):
        w, m = fn()
        open(f'{out}/mark-{name}.svg', 'w').write(svg(m, w, fill=RED, pad=1))
        ww, wm = wordmark(w + 7)
        body = f'<g fill="{RED}">{m}</g><g>{wm}</g>'
        open(f'{out}/lockup-{name}-light.svg', 'w').write(svg(body, ww, fill=TAR, pad=1))
        open(f'{out}/lockup-{name}-dark.svg', 'w').write(svg(body, ww, fill=FOG, pad=1))
    print(sorted(os.listdir(out)))
