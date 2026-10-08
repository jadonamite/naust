"""Naust logo geometry. 30-unit grid, baseline y=30, one roof pitch, one stem weight."""
import math, os
PITCH = math.radians(55)
STEM = 5.0
XTOP = 10.5            # x-height top (x-height 19.5)
RED, TAR, FOG = '#A63A24', '#1B1A17', '#E9ECEA'

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

def gable(x0, x1, eave, bottom=30.0):
    """Pentagon: walls x0..x1, roof at PITCH meeting at the apex."""
    half = (x1 - x0) / 2
    return [(x0, bottom), (x0, eave), (x0 + half, eave - half*math.tan(PITCH)), (x1, eave), (x1, bottom)]

# ---- Mark A: boathouse frame with the boat's bow arriving -------------------
def mark_a():
    W = 26.0; half = W/2
    eave = half*math.tan(PITCH)                        # apex at y=0
    outer = gable(0, W, eave)
    t = 4.6                                             # frame thickness, same all round
    door = gable(t, W - t, eave - t*math.tan(PITCH) + t/math.cos(PITCH), 30.5)
    # boat bow, seen head-on: inverted gable at the same pitch, keel touching the waterline
    g = 1.5
    bx0, bx1 = t + g, W - t - g
    bh = (bx1 - bx0)/2 * math.tan(PITCH)
    top = 30 - bh
    boat = [(bx0, top), (bx1, top), ((bx0+bx1)/2, 30)]
    house = rounded(outer, 2.2) + rounded(door, 1.2)
    return W, f'<path fill-rule="evenodd" d="{house}"/><path d="{rounded(boat, 1.2)}"/>'

# ---- Mark B: three nausts on one shore, one with its boat home ---------------
def mark_b():
    w, gap = 9.0, 1.6; parts = []
    for i in range(3):
        x0 = i*(w+gap); eave = 30 - 13
        parts.append(rounded(gable(x0, x0+w, eave), 1.4))
    W = 3*w + 2*gap
    return W, f'<path d="{"".join(parts)}"/>'


def frame(W=26.0, t=4.6, r=2.2):
    """Gable frame open at the bottom: one outline, no even-odd seam."""
    half = W/2; eave = half*math.tan(PITCH)
    ie = eave - t*math.tan(PITCH) + t/math.cos(PITCH)
    ia = ie - (half - t)*math.tan(PITCH)
    pts = [(0,30),(0,eave),(half,0),(W,eave),(W,30),(W-t,30),(W-t,ie),(half,ia),(t,ie),(t,30)]
    return W, rounded(pts, r), (t, W-t, ia, ie)

def hull(x0, x1, base=30.0, depth=4.4, rise=3.6):
    """Nordic boat side view: sagging keel, gunwale, stems curling up at both ends."""
    cx = (x0+x1)/2; top = base - depth
    tipy = top - rise
    return (f'M{f(x0)} {f(tipy)}Q{f(x0+1.2)} {f(base)} {f(cx)} {f(base)}Q{f(x1-1.2)} {f(base)} {f(x1)} {f(tipy)}'
            f'Q{f(x1-1.6)} {f(top+0.6)} {f(cx)} {f(top+0.9)}Q{f(x0+1.6)} {f(top+0.6)} {f(x0)} {f(tipy)}Z')

def mark_a1():   # frame + boat sitting in the doorway
    W, d, (l, r, ia, ie) = frame()
    return W, f'<path d="{d}"/><path d="{hull(l+1.0, r-1.0, depth=5.0, rise=2.6)}"/>'

def mark_a2():   # frame + boat wider than the door, its hull crossing the walls at the waterline
    W, d, _ = frame()
    return W, f'<path d="{d}"/><path d="{hull(-2.0, W+2.0, depth=5.2, rise=4.2)}"/>'

def mark_a3():   # solid naust (roof planks as an inset line), small boat tucked at its foot, 2:1
    W = 22.0; half = W/2; eave = half*math.tan(PITCH)
    outer = rounded(gable(0, W, eave), 2.2)
    g = 1.0; t = 3.2
    ie = eave - t*math.tan(PITCH) + t/math.cos(PITCH)
    inner_a = gable(t, W-t, ie, 30 - t)
    ie2 = ie + g/math.cos(PITCH) - g*math.tan(PITCH)
    inner_b = gable(t+g, W-t-g, ie2, 30 - t - g)
    body = outer + rounded(inner_a, 1.4) + rounded(inner_b, 0.8)
    boat = hull(W - 7.0, W + 9.0, depth=4.6, rise=3.4)
    return W + 9.0, f'<path fill-rule="evenodd" d="{body}"/><path d="{boat}"/>'


def mark_b1():   # open frame, small solid naust home inside the door (2:1)
    W, d, (l, r, ia, ie) = frame(26.0, 4.6, 2.2)
    g = 1.8; x0, x1 = l + g, r - g
    half = (x1 - x0)/2
    eave = 30 - 15 + half*math.tan(PITCH)  # small house total height 15 = half of 30
    small = rounded(gable(x0, x1, eave), 1.2)
    return W, f'<path d="{d}"/><path d="{small}"/>'

def mark_b2():   # same, small house sits proud on a shared sill line
    W, d, (l, r, ia, ie) = frame(26.0, 4.6, 2.2)
    g = 1.6; x0, x1 = l + g, r - g
    half = (x1 - x0)/2
    eave = ia + g/math.sin(math.radians(35)) + half*math.tan(PITCH)
    small = rounded(gable(x0, x1, eave), 1.2)
    return W, f'<path d="{d}"/><path d="{small}"/>'

def mark_b3():   # Attio-style offset: big frame, small solid naust overlapping its foot, right
    W, d, _ = frame(22.0, 4.2, 2.0)
    sw = 11.0; x0 = W - 4.2 - 1.6 + 0; x1 = x0 + sw
    eave = 30 - 15 + (sw/2)*math.tan(PITCH)
    small = rounded(gable(x0, x1, eave), 1.2)
    # knock a gap into the frame where the small house overlaps
    gap = rounded(gable(x0-1.4, x1+1.4, eave - 1.4*math.tan(PITCH) + 1.4/math.cos(PITCH) - 2.0, 31.5), 1.6)
    return x1, f'<mask id="m3"><rect x="-5" y="-5" width="60" height="45" fill="#fff"/><path d="{gap}" fill="#000"/></mask><path mask="url(#m3)" d="{d}"/><path d="{small}"/>'

# ---- Wordmark: n a u s t ------------------------------------------------------
def g_n(x):
    R, r = 9.0, 4.0; cy = XTOP + R
    d = (f'M{f(x)} 30V{f(cy)}A{R} {R} 0 0 1 {f(x+2*R)} {f(cy)}V30H{f(x+2*R-STEM)}V{f(cy)}'
         f'A{r} {r} 0 0 0 {f(x+STEM)} {f(cy)}V30Z')
    return 2*R, d

def g_u(x):
    w, d = g_n(0)
    return w, f'<path transform="translate({f(x)} 0) rotate(180 {f(w/2)} {f((XTOP+30)/2)})" d="{d}"/>'

def g_a(x):
    R = (30 - XTOP)/2; r = R - STEM; cx, cy = x + R, XTOP + R
    ring = (f'M{f(cx-R)} {f(cy)}a{R} {R} 0 1 0 {f(2*R)} 0a{R} {R} 0 1 0 {f(-2*R)} 0Z'
            f'M{f(cx-r)} {f(cy)}a{r} {r} 0 1 1 {f(2*r)} 0a{r} {r} 0 1 1 {f(-2*r)} 0Z')
    stem = f'M{f(x+2*R-STEM)} {XTOP}H{f(x+2*R)}V30H{f(x+2*R-STEM)}Z'
    return 2*R, f'<path fill-rule="evenodd" d="{ring}"/><path d="{stem}"/>'

def g_s(x):
    t = 4.4; ryo = (30 - XTOP + t)/4; ryi = ryo - t; rxo = 8.0; rxi = rxo - t
    cx = x + rxo; c1 = XTOP + ryo; c2 = 30 - ryo
    top = (f'M{f(cx+rxo)} {f(c1)}A{f(rxo)} {f(ryo)} 0 1 0 {f(cx)} {f(c1+ryo)}'
           f'L{f(cx)} {f(c1+ryi)}A{f(rxi)} {f(ryi)} 0 1 1 {f(cx+rxi)} {f(c1)}Z')
    bot = (f'M{f(cx)} {f(c2-ryo)}A{f(rxo)} {f(ryo)} 0 1 1 {f(cx-rxo)} {f(c2)}'
           f'L{f(cx-rxi)} {f(c2)}A{f(rxi)} {f(ryi)} 0 1 0 {f(cx)} {f(c2-ryi)}Z')
    return 2*rxo, top + bot

def g_t(x):
    bar_l, bar_r, sx = 0.0, 13.0, 3.5
    apex = 5.0; eave = apex + (STEM/2)*math.tan(PITCH)
    stem = [(x+sx, 30), (x+sx, eave), (x+sx+STEM/2, apex), (x+sx+STEM, eave), (x+sx+STEM, 30)]
    bar = f'M{f(x+bar_l)} {XTOP}H{f(x+bar_r)}V{XTOP+4.6}H{f(x+bar_l)}Z'
    return bar_r, f'{rounded(stem, 0.6)}{bar}'

def wordmark(x0, track=2.8):
    out, x = [], x0
    for g in (g_n, g_a, g_u, g_s, g_t):
        w, d = g(x)
        out.append(d if d.startswith('<') else f'<path d="{d}"/>')
        x += w + track
    return x - track, ''.join(out)

def svg(body, w, h=30, fill=TAR, pad=0):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-pad} {-pad} {f(w+2*pad)} {f(h+2*pad)}" '
            f'width="{f((w+2*pad)*8)}" height="{f((h+2*pad)*8)}"><g fill="{fill}">{body}</g></svg>')

if __name__ == '__main__':
    out = os.path.join(os.path.dirname(__file__), '..', 'round1'); os.makedirs(out, exist_ok=True)
    for name, fn in (('b1', mark_b1), ('b2', mark_b2), ('b3', mark_b3)):
        w, m = fn()
        open(f'{out}/mark-{name}.svg', 'w').write(svg(m, w, fill=RED, pad=1))
        ww, wm = wordmark(w + 8)
        body = f'<g fill="{RED}">{m}</g><g>{wm}</g>'
        open(f'{out}/lockup-{name}-light.svg', 'w').write(svg(body, ww, fill=TAR, pad=1))
        open(f'{out}/lockup-{name}-dark.svg', 'w').write(svg(body, ww, fill=FOG, pad=1))
    print('written', sorted(os.listdir(out)))
