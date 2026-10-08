# Naust brand

The mark is a lifted cell: four isometric blocks in a grid, with the front block raised half a block above the rest and its sides in Falu red. The grid is the network of customer addresses. The red block is the one deposit Naust picks out and names.

## Files

| Use | File |
|---|---|
| Logo for light backgrounds | `logo/svg/naust-logo-on-light.svg` |
| Logo for dark backgrounds | `logo/svg/naust-logo-on-dark.svg` |
| Icon for light backgrounds | `logo/svg/naust-icon-on-light.svg` |
| Icon for dark backgrounds | `logo/svg/naust-icon-on-dark.svg` |
| Favicons | `logo/png/naust-icon-on-light-16.png`, `-32`, `-48` (and `-on-dark-` versions) |
| Apple touch icon | `logo/png/apple-touch-icon-180.png` |
| App icon | `logo/png/naust-app-icon-dark-512.png`, `-1024` (light versions too) |
| Social card (Open Graph, X) | `logo/png/naust-social-1200x630.png` |

Always use the SVGs where you can. The PNGs are for places that can't take vectors.

## Colour

| Name | Hex | Use |
|---|---|---|
| Black | `#000000` | Blocks and name on light; background for dark |
| Paper | `#F1F1EE` | Blocks and name on dark; background for light |
| Falu red | `#A63A24` | The two sides of the raised block, and nothing else |

Never pure white. Paper replaces it everywhere, including backgrounds behind the logo.

## Typeface

The name is "Naust", capital N, in **Montserrat Bold** with letter spacing tightened by 3.5% (Open Font License, free for commercial use), converted to outlines so the logo never needs the font installed. For product UI, self-host Montserrat from Fontsource (`@fontsource/montserrat`). Never load it from Google Fonts at runtime.

## Construction

- **True isometric.** All three axes at 30°, so the blocks read as real cubes.
- **Solid faces.** Faces are separated only by a uniform cut line of 0.4 units on a 30-unit-tall mark (1.3% of the height). No gradients, no shading, no outlines.
- **Corners** rounded at 0.8 units.
- **The raised block** sits on the front corner of the 2×2 grid and rises 55% of a block above the others. Its top face stays in the main colour; only its two sides are red.
- **The lockup** puts the icon at the full height of the logo, with the capital N at two thirds of it and a gap of 4.5 units between them.

## Size and space

- **Smallest icon:** 16 px.
- **Smallest full logo:** 90 px wide.
- **Clear space:** keep a margin equal to one block's width on every side.

## Don't

- Use pure white, or any colour beyond the three above.
- Make the raised block's top red, or any other block red.
- Stretch, rotate or skew either file.
- Move the raised block or change how far it rises.
- Add shadows, glows, gradients or outlines.

## In the app

The web app uses these files directly: `web/components/brand/` holds the SVGs, the `Logo` component (`<Logo />` for the full logo, `<Logo variant="icon" />` for the mark; it follows the system light or dark setting unless you pass `on="light"` or `on="dark"`) and `tokens.css` with the three colours. Favicons, app icons and the social card live in `web/public/`. After regenerating, copy the new files across.

## Rebuilding

The geometry is code, so every file regenerates exactly:

```
cd brand/tools && node word2path.js montserrat-latin-700-normal.woff Naust 20 word.json -0.035
cd brand/src && python3 mono.py      # SVGs (iso.py holds the block geometry; mono.py sets colours, lines, corners)
cd brand/tools && node export.js     # PNG exports
```
