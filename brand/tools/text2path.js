// Outline "naust" in each candidate font: baseline y=30, x-height XH units, tracking in em.
const opentype = require('opentype.js'), fs = require('fs'), path = require('path');
const XH = 18.6, TRACK = -0.01;
const dir = path.join(__dirname, '..', 'fonts'); const out = {};
for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.woff'))) {
  const font = opentype.parse(fs.readFileSync(path.join(dir, f)).buffer.slice(0));
  const xh = font.tables.os2.sxHeight || font.charToGlyph('x').getBoundingBox().y2;
  const size = XH / xh * font.unitsPerEm;
  let x = 0, d = '';
  for (const ch of 'naust') {
    const g = font.charToGlyph(ch);
    d += g.getPath(x, 30, size).toPathData(3);
    x += g.advanceWidth / font.unitsPerEm * size + TRACK * size;
  }
  const bb = new opentype.Path(); // width from last advance minus trailing tracking
  out[f.replace('-latin-', ' ').replace('-normal.woff', '')] = { d, width: x - TRACK * size };
}
fs.writeFileSync(path.join(__dirname, 'naust-paths.json'), JSON.stringify(out));
console.log(Object.keys(out).join('\n'));
