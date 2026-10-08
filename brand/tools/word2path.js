// Outline a word in one font. Usage: node word2path.js <font file in ../fonts> <text> <capHeight> <out.json> [tracking in em]
const opentype = require('opentype.js'), fs = require('fs'), path = require('path');
const [file, text = 'Naust', cap = '20', out = 'word.json', track = '0'] = process.argv.slice(2);
const font = opentype.parse(fs.readFileSync(path.join(__dirname, '..', 'fonts', file)).buffer.slice(0));
const ch = font.tables.os2.sCapHeight || font.charToGlyph('H').getBoundingBox().y2;
const size = Number(cap) / ch * font.unitsPerEm;
const glyphs = [...text].map(c => font.charToGlyph(c));
let x = 0, d = '', x2 = 0;
glyphs.forEach((g, i) => {
  const gp = g.getPath(x, 30, size); d += gp.toPathData(3);
  const bb = gp.getBoundingBox(); if (isFinite(bb.x2)) x2 = Math.max(x2, bb.x2);
  const kern = i < glyphs.length - 1 ? font.getKerningValue(g, glyphs[i + 1]) : 0;
  x += (g.advanceWidth + kern) / font.unitsPerEm * size + Number(track) * size;
});
fs.writeFileSync(path.join(__dirname, out), JSON.stringify({ d, width: x2, font: file }));
console.log(file, text, 'width', x2.toFixed(2));
