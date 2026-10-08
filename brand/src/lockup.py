"""Compose mark + wordmark lockups and the type comparison."""
import json, os, re
from iso import concepts, render, INK, RED, FOG

HERE = os.path.dirname(__file__)
PATHS = json.load(open(os.path.join(HERE, '..', 'tools', 'naust-paths.json')))

def mark_svg(name, ink, radius=0.9, gap=0.6):
    return render(concepts(ink, RED)[name], gap=gap, radius=radius)

def lockup(name, font, ink, gapx=7.0, radius=0.9):
    w, inner = mark_svg(name, ink, radius)
    vb = re.search(r'viewBox="([^"]+)"', inner).group(1)
    body = inner[inner.index('>')+1:inner.rindex('</svg>')]
    t = PATHS[font]; pad = 1.5
    total = w + gapx + t['width']
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-pad} {-pad} {total+2*pad:.2f} {30+2*pad}" '
            f'width="{(total+2*pad)*10:.0f}" height="{(30+2*pad)*10:.0f}">'
            f'<svg x="{-pad}" y="{-pad}" width="{w+2*pad:.2f}" height="{30+2*pad}" viewBox="{vb}">{body}</svg>'
            f'<path fill="{ink}" transform="translate({w+gapx:.2f} 0)" d="{t["d"]}"/></svg>')

if __name__ == '__main__':
    out = os.path.join(HERE, '..', 'final'); os.makedirs(out, exist_ok=True)
    for font in PATHS:
        slug = font.replace(' ', '-')
        open(f'{out}/type-{slug}.svg', 'w').write(lockup('1-docking', font, INK))
    print(sorted(f for f in os.listdir(out) if f.startswith('type-')))
