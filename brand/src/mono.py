"""Concept 2 (lifted cell): black and off-white, the raised cube's sides in Falu red. Name from tools/word.json."""
import json, os, re
from iso import render, box

HERE = os.path.dirname(__file__)
BLACK, PAPER, RED = '#000000', '#F1F1EE', '#A63A24'
GAP, RADIUS = 0.4, 0.8
WORD = json.load(open(os.path.join(HERE, '..', 'tools', 'word.json')))
NAME = '2-lifted-cell'

def objects(ink):
    lifted = box(1.08, 1.08, 0.55, 1, 1, 1)
    return [(box(0, 0, 0, 1, 1, 1), ink), (box(1.08, 0, 0, 1, 1, 1), ink), (box(0, 1.08, 0, 1, 1, 1), ink),
            ([lifted[0]], ink), (lifted[1:], RED)]

def icon(ink, accent=None):
    return render(objects(ink), gap=GAP, radius=RADIUS)

def logo(ink, accent=None, gapx=4.5, pad=1.5):
    w, inner = icon(ink, accent)
    vb = re.search(r'viewBox="([^"]+)"', inner).group(1)
    body = inner[inner.index('>')+1:inner.rindex('</svg>')]
    total = w + gapx + WORD['width']
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-pad} {-pad} {total+2*pad:.2f} {30+2*pad}" '
            f'width="{(total+2*pad)*10:.0f}" height="{(30+2*pad)*10:.0f}">'
            f'<svg x="{-pad}" y="{-pad}" width="{w+2*pad:.2f}" height="{30+2*pad}" viewBox="{vb}">{body}</svg>'
            f'<path fill="{ink}" transform="translate({w+gapx:.2f} 0)" d="{WORD["d"]}"/></svg>')

if __name__ == '__main__':
    out = os.path.join(HERE, '..', 'logo', 'svg'); os.makedirs(out, exist_ok=True)
    for f in os.listdir(out): os.remove(os.path.join(out, f))
    files = {
        'naust-icon-on-light.svg': icon(BLACK)[1], 'naust-icon-on-dark.svg': icon(PAPER)[1],
        'naust-logo-on-light.svg': logo(BLACK), 'naust-logo-on-dark.svg': logo(PAPER),
    }
    for n, s in files.items(): open(os.path.join(out, n), 'w').write(s)
    print(sorted(files))
