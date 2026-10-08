"""True-isometric block geometry for the Naust mark. Solid faces, uniform cut lines, painter's order with knockouts."""
import math
C, S = math.cos(math.radians(30)), math.sin(math.radians(30))

def f(v): return f'{v:.3f}'.rstrip('0').rstrip('.')

def rounded(pts, r):
    """Closed polygon path with every corner filleted at radius r."""
    n = len(pts); out = []
    for i in range(n):
        p0, p1, p2 = pts[i-1], pts[i], pts[(i+1) % n]
        v1 = (p0[0]-p1[0], p0[1]-p1[1]); v2 = (p2[0]-p1[0], p2[1]-p1[1])
        l1, l2 = math.hypot(*v1), math.hypot(*v2)
        u1 = (v1[0]/l1, v1[1]/l1); u2 = (v2[0]/l2, v2[1]/l2)
        ang = math.acos(max(-1, min(1, u1[0]*u2[0] + u1[1]*u2[1])))
        d = min(r / math.tan(ang/2), l1/2, l2/2); rr = d * math.tan(ang/2)
        a = (p1[0]+u1[0]*d, p1[1]+u1[1]*d); b = (p1[0]+u2[0]*d, p1[1]+u2[1]*d)
        sweep = 1 if (u1[0]*u2[1] - u1[1]*u2[0]) < 0 else 0
        out.append((a, b, rr, sweep))
    s = f'M{f(out[0][0][0])} {f(out[0][0][1])}'
    for i, (a, b, rr, sw) in enumerate(out):
        if i: s += f'L{f(a[0])} {f(a[1])}'
        s += f'A{f(rr)} {f(rr)} 0 0 {sw} {f(b[0])} {f(b[1])}'
    return s + 'Z'

def P(x, y, z): return ((x - y) * C, (x + y) * S - z)

def box(x0, y0, z0, w, d, h):
    x1, y1, z1 = x0+w, y0+d, z0+h
    return [[(x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)],   # top
            [(x1,y0,z0),(x1,y1,z0),(x1,y1,z1),(x1,y0,z1)],   # right (+x)
            [(x0,y1,z0),(x1,y1,z0),(x1,y1,z1),(x0,y1,z1)]]   # left  (+y)

def depth(face): return sum(p[0]+p[1]+p[2] for p in face)/len(face)

def render(objects, gap=0.6, H=30.0, pad=1.5, radius=0.0):
    """Every face is cut by its own outline and by every nearer face, so all lines share one width."""
    pts = [P(*p) for faces, _ in objects for fc in faces for p in fc]
    minx, maxx = min(p[0] for p in pts), max(p[0] for p in pts)
    miny, maxy = min(p[1] for p in pts), max(p[1] for p in pts)
    k = H / (maxy - miny)
    T = lambda p: ((P(*p)[0]-minx)*k, (P(*p)[1]-miny)*k)
    def poly(fc):
        pts2 = list(map(T, fc))
        if radius > 0:
            return rounded(pts2, radius)
        return 'M' + 'L'.join(f'{x:.3f} {y:.3f}' for x, y in pts2) + 'Z'
    W = (maxx - minx) * k
    flat = sorted(((fc, col) for faces, col in objects for fc in faces), key=lambda t: depth(t[0]))
    defs, body = [], []
    box_ = f'x="-10" y="-10" width="{W+20:.1f}" height="{H+20:.1f}"'
    for i, (fc, col) in enumerate(flat):
        nearer = ''.join(f'<path d="{poly(g)}"/>' for g, _ in flat[i+1:])
        defs.append(f'<mask id="f{i}" maskUnits="userSpaceOnUse" {box_}><rect {box_} fill="#fff"/>'
                    f'<path d="{poly(fc)}" fill="none" stroke="#000" stroke-width="{gap}" stroke-linejoin="round"/>'
                    f'<g fill="#000" stroke="#000" stroke-width="{gap}" stroke-linejoin="round">{nearer}</g></mask>')
        body.append(f'<path mask="url(#f{i})" fill="{col}" d="{poly(fc)}"/>')
    vb = f'{-pad:.2f} {-pad:.2f} {W+2*pad:.2f} {H+2*pad:.2f}'
    return W, (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{(W+2*pad)*10:.0f}" height="{(H+2*pad)*10:.0f}">'
               f'<defs>{"".join(defs)}</defs>{"".join(body)}</svg>')
