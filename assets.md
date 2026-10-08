# Assets to generate

Written 2026-10-07. The landing page is built to take these files as soon as they exist. Drop each one into `web/public/` at the path given and it appears with no code change: straight away under `npm run dev`, or after the next `npm run build` for production (the home page is prerendered). Until a file exists, its spot shows a plain dark or paper surface, never a stand-in picture.

No text, logos, letters or watermarks inside any image or video. The page adds all type itself.

The look to hold across every asset: a dusk landscape of smooth lavender dunes, cut by a channel of glowing amber water. It's the hero reference Jadon chose, and it fits the product. Each deposit is water finding its own channel home, the way each boat comes home to its own naust (boathouse).

**Palette** (sample the generated hero for exact values afterwards):
- dune lavender `#8E86C4` to `#C9C3E6`
- dusk sky `#E9C9C2` to `#B7AEDB`
- amber channel `#F08A2C` to `#FFC46B`
- shadow `#1C1C1D`

The brand's Falu red `#A63A24` should appear only where the amber light deepens. Never make it a dominant field.

## 1. Hero landscape loop (the centrepiece)

| | |
|---|---|
| Files | `web/public/hero/landscape.mp4` (H.264), `web/public/hero/landscape.webm` (VP9), `web/public/hero/landscape-poster.jpg` |
| Size | 1920×1080, with the important content inside a centred 1080×1080 square: the page shows it through a circle about 400px across |
| Length | 8–12 seconds, a seamless loop: the last frame must match the first |
| Weight | mp4 under 4 MB, webm under 3 MB, poster under 250 KB |
| Motion | The water in the channel flows slowly away from the camera and catches light. The camera drifts forward very slowly, or not at all. No cuts, no zooms, no flashes. Calm enough to watch for a minute |

**Prompt to start from:**
> Surreal dusk landscape of smooth, satin lavender dunes, soft folds like fabric, a single narrow channel carved deep into the dunes with vertical walls that glow molten amber from inside, filled with slowly flowing luminous orange water, the channel winding from the foreground into the distance toward a soft pale peak, sky a gentle gradient from peach at the horizon to lavender above, cinematic, photoreal 3D render, high detail on the dune surface sheen, no people, no text, no logo, no watermark, seamless loop, slow flowing water, static or very slow forward camera.

The poster is one frame from the video. It shows while the video loads, and stays put for visitors who have reduced motion turned on.

## 2. Hero background glow

| | |
|---|---|
| Files | `web/public/hero/glow.jpg` |
| Size | 1600×1000 |
| Weight | under 150 KB |
| Content | The same scene, heavily blurred (about 80px) and darkened to roughly 25% brightness: a dark charcoal field with a soft warm amber bloom low in the frame and a faint lavender haze above it. No visible shapes |

It sits behind the whole hero, so the dark background feels lit by the landscape in the circle, as in the reference. If the generator can do it, a 1600×1000 seamless loop of the same thing (`glow.mp4`, under 1.5 MB, very slow drift) is better still.

## 3. Hero side card image

| | |
|---|---|
| Files | `web/public/hero/cells.jpg` |
| Size | 1200×1200 |
| Weight | under 250 KB |
| Content | Close studio shot of a long row of thin frosted-glass panels standing upright on a pale paper-coloured surface, receding diagonally to the right. Every panel is clear-to-milky glass except **one** near the front, which glows Falu red to amber from inside and stands slightly taller than the rest. Soft daylight, gentle shadows, shallow depth of field |

It echoes the logo: a grid of addresses with one picked out, the deposit Naust names. It takes the place of the frosted blue slats in the reference.

## 4. Feature illustrations (two)

Grey line-and-plane isometric drawings in the reference's style: flat light-grey planes (`#D6D6D2`), thin mid-grey strokes (`#A9A9A4`), on a transparent background, cropped so the drawing bleeds off two edges of its card.

| File | Subject |
|---|---|
| `web/public/illustrations/addresses.svg` (or `.png`, 1200×1200, transparent) | An isometric 2×2 grid of rounded cubes with one front cube lifted half a block (the logo's geometry), and thin curved lines running from each cube out to small blank tag shapes, like address labels on parcels |
| `web/public/illustrations/sweep.svg` (or `.png`, 1200×1200, transparent) | Several thin isometric channels, like the hero's, running in from the edges and joining into one larger basin or boathouse shape at the back. Small disc shapes (blank coins, no symbols) travel along the channels |

SVG is preferred: it stays sharp at any size and weighs almost nothing.

## 5. Call-to-action texture

| | |
|---|---|
| Files | `web/public/textures/paper.jpg` |
| Size | 2400×1200 |
| Weight | under 300 KB |
| Content | Crumpled, then flattened, sand-coloured paper (`#F1E6CD`), lit flat from above, so the creases read as faint lighter lines. Low contrast: the page puts dark text over it |

## 6. Social card (later)

`web/public/og.png`, 1200×630. A wide crop of the hero landscape with plenty of dark space on the left for the page to overlay the logo. It replaces the current social card once the hero is final.

## Not needed from you

The product screenshots on the page are taken from the running app, and the receipt documents in the ledger section use real data from DevNet, so neither needs generating.
