# Design foundations

The tokens live in `web/app/tokens.css`; this file explains them. New work is checked against the tokens file.

- **Brand:** `brand/README.md`. Paper replaces white everywhere. Falu red is the one accent.
- **Accessibility:** body text meets 4.5:1 contrast, every target is at least 44px, and reduced motion is honoured.

## Type

Two families, both self-hosted at build time by `next/font` (no runtime request to Google):
- **Newsreader** for display headings, at weight 400 with tight negative tracking (-0.04 to -0.05em).
- **Inter** for everything else: body, labels, buttons, the statement line, and the hero headline.

Sizes are by role in `tokens.css`. Display sizes are 50, 38, 34 and 24px; interface sizes are 16 (body), 14 (label) and 12 (floor). Running text uses 1.55 leading; labels and buttons use 1.25.

## Spacing

One 4px-based scale (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 120). No arbitrary values. Content is 1200px wide; the grey panels are 1260px.

## Colour

Semantic roles only: `--label`, `--label-2`, `--label-3`, `--separator`, `--bg`, `--surface`, `--surface-sunk`, `--accent`. The landing page is light by design, with a fixed dark hero and one dark panel. The app screens (operator, customer) follow the system theme through the `.app-theme` class.

Contrast floor: 4.5:1 for body text, 3:1 for large text and control boundaries. State is never shown by colour alone: deposit states always carry their word.

## Targets

44px minimum hit region on everything clickable, in both dimensions, with at least 8px between neighbouring targets. Small glyphs sit inside padded regions.

## Radius and elevation

| Step | Value | Meaning |
|---|---|---|
| control | 12px | nav links, inline controls |
| card | 16px | cards, the hero frame, accordion rows |
| panel | 18px | coloured feature panels |
| stack | 24px | grey panels, stacked cards |
| hall | 40px | the one large grey panel |
| pill | full | buttons and chips |

Elevation has three steps: none, `--elev-1` (resting cards and paper buttons), `--elev-2` (stacked documents in the ledger panel).

## Motion

160ms for small state changes, 240ms default, 350ms for larger moves. Ease out on arrival, ease in on exit. Motion must explain something: the stacked cards stack because they are a sequence, and the marquee moves because it is a list of addresses that keeps going. Under `prefers-reduced-motion` everything stops and the hero video shows its still frame.

## Glass

Only the floating navigation bar uses a translucent blur, with a solid fallback where `backdrop-filter` is unsupported or reduced transparency is requested. Content surfaces are solid.

## Legal

Terms, privacy and cookie policy pages ship with the first version, linked in the footer, with a cookie notice. Naust sets no tracking cookies; the notice says so.
