const sharp = require('sharp'), fs = require('fs'), path = require('path');
const S = p => path.join(__dirname, '..', 'logo', 'svg', p), O = p => path.join(__dirname, '..', 'logo', 'png', p);
const BLACK = '#000000', PAPER = '#F1F1EE';
const svg = p => fs.readFileSync(S(p), 'utf8');
const inner = s => ({ vb: s.match(/viewBox="([^"]+)"/)[1], body: s.slice(s.indexOf('>') + 1, s.lastIndexOf('</svg>')) });
async function png(svgStr, w, h, out) { await sharp(Buffer.from(svgStr), { density: 600 }).resize(w, h, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(O(out)); }
function tile(iconFile, bg, size, radius, scale) {
  const { vb, body } = inner(svg(iconFile)); const [, , vw, vh] = vb.split(' ').map(Number);
  const ih = size * scale, iw = ih * vw / vh;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>` +
    `<svg x="${(size - iw) / 2}" y="${(size - ih) / 2}" width="${iw}" height="${ih}" viewBox="${vb}">${body}</svg></svg>`;
}
function card(logoFile, bg, w, h) {
  const { vb, body } = inner(svg(logoFile)); const [, , vw, vh] = vb.split(' ').map(Number);
  const lw = w * 0.5, lh = lw * vh / vw;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${bg}"/>` +
    `<svg x="${(w - lw) / 2}" y="${(h - lh) / 2}" width="${lw}" height="${lh}" viewBox="${vb}">${body}</svg></svg>`;
}
(async () => {
  for (const s of [16, 32, 48, 64, 128, 256, 512]) {
    await png(svg('naust-icon-on-light.svg'), s, s, `naust-icon-on-light-${s}.png`);
    await png(svg('naust-icon-on-dark.svg'), s, s, `naust-icon-on-dark-${s}.png`);
  }
  await png(tile('naust-icon-on-dark.svg', BLACK, 180, 0, 0.56), 180, 180, 'apple-touch-icon-180.png');
  for (const s of [512, 1024]) {
    await png(tile('naust-icon-on-dark.svg', BLACK, s, s * 0.225, 0.52), s, s, `naust-app-icon-dark-${s}.png`);
    await png(tile('naust-icon-on-light.svg', PAPER, s, s * 0.225, 0.52), s, s, `naust-app-icon-light-${s}.png`);
  }
  await png(svg('naust-logo-on-light.svg'), 1200, 300, 'naust-logo-on-light-1200.png');
  await png(svg('naust-logo-on-dark.svg'), 1200, 300, 'naust-logo-on-dark-1200.png');
  await png(card('naust-logo-on-dark.svg', BLACK, 1200, 630), 1200, 630, 'naust-social-1200x630.png');
  console.log(fs.readdirSync(O('')).length + ' PNGs');
})();
