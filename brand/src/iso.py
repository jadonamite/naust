"""True-isometric block marks. Solid faces, uniform cut lines, painter's order with knockouts."""
import math, os
C, S = math.cos(math.radians(30)), math.sin(math.radians(30))
INK, RED, FOG, TAR = '#1B1A17', '#A63A24', '#E9ECEA', '#1B1A17'

def P(x, y, z): return ((x - y) * C, (x + y) * S - z)

def box(x0, y0, z0, w, d, h):
    x1, y1, z1 = x0+w, y0+d, z0+h
    return [[(x0,y0,z1),(x1,y0,z1),(x1,y1,z1),(x0,y1,z1)],   # top
            [(x1,y0,z0),(x1,y1,z0),(x1,y1,z1),(x1,y0,z1)],   # right (+x)
            [(x0,y1,z0),(x1,y1,z0),(x1,y1,z1),(x0,y1,z1)]]   # left  (+y)

def extrude_xz(profile, y0, y1):
    """Profile in (x,z), counter-clockwise seen from +y. Visible faces: cap at y1, sides facing +x or +z."""
    faces = [[(x, y1, z) for x, z in profile]]
    n = len(profile)
    for i in range(n):
        (xa, za), (xb, zb) = profile[i], profile[(i+1) % n]
        nx, nz = (zb - za), -(xb - xa)            # outward normal for CCW in (x,z) with z up
        if nx > 1e-9 or nz > 1e-9:
            faces.append([(xa,y0,za),(xb,y0,zb),(xb,y1,zb),(xa,y1,za)])
    return faces

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
            from gen import rounded
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

def concepts(ink, red):
    L6 = [(0,0),(2,0),(2,1),(1,1),(1,2),(0,2)]
    c1 = [([[(x,y,2) for x,y in L6], [(2,y,z) for y,z in L6], [(x,2,z) for x,z in L6]], ink),
          (box(1,1,1.5,1,1,1), red)]                                   # docking node
    c2 = [(box(0,0,0,1,1,1), ink), (box(1.08,0,0,1,1,1), ink), (box(0,1.08,0,1,1,1), ink),
          (box(1.08,1.08,0.55,1,1,1), red)]                            # lifted cell
    c3 = [(box(0,0,0,1,3,1), ink), (box(1.12,2,0,1.6,1,1), red)]          # routed pair
    nprof = [(0,0),(1,0),(1,2),(2,2),(2,0),(3,0),(3,3),(0,3)]
    c4 = [(extrude_xz(nprof, 0, 1.2), ink), (box(3.25,0.1,0,1,1,1), red)]  # block n
    c5 = [(box(0,0,0,3,3,0.55), ink), (box(1.9,1.9,0.62,1,1,1), red)]     # node on slab
    return {'1-docking': c1, '2-lifted-cell': c2, '3-routed-pair': c3, '4-block-n': c4, '5-node-on-slab': c5}

if __name__ == '__main__':
    out = os.path.join(os.path.dirname(__file__), '..', 'five')
    for theme, ink in (('light', INK), ('dark', FOG)):
        for name, objs in concepts(ink, RED).items():
            w, s = render(objs)
            open(f'{out}/{name}-{theme}.svg', 'w').write(s)
    print(sorted(os.listdir(out)))
