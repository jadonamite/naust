# Design Review: Anti-Slop Pass and Apple HIG Audit

**Date:** 2026-10-08  
**Scope:** Operator screen (`/operator`), Customer screen (`/customer/[id]`), and Landing page (`/`)  
**Specification:** `inertia/specs/naust/spec.md` (T025)  
**Foundations:** `docs/design-foundations.md`, `web/app/tokens.css`  

---

## 1. Summary

The design review verifies that Naust meets the Apple Human Interface Guidelines (HIG) web translation standards and the project design foundations. The inspection covered typographic hierarchy, contrast calculations under WCAG 2.1 AA/AAA, minimum hit targets, mobile reflow and 200% zoom behavior, complete keyboard tab navigation, dark mode visual parity, and strict anti-slop copy hygiene.

All criteria pass. The codebase contains no decorative placeholders, no fake social proof, no unlabelled icon-only controls, and no emojis.

---

## 2. Anti-Slop Audit and Copy Hygiene

- **Prose and Claims:** Real ledger measurements only. Timing metrics cite measured DevNet runs (median 2.2 s, max 4.6 s over 10 consecutive transactions). Testimonials cite verified Canton developer forum threads (t/9207) with verbatim attribution (`joao_trakx`, `kevmuko`).
- **Surface Integrity:** No generic illustration kits, stock icons, or marketing filler. Spots awaiting custom generated landscape artwork render clean typographic surfaces.
- **Viewport Height:** Full-viewport containers utilize `min-height: 100vh; min-height: 100dvh;` to prevent layout jumps caused by dynamic browser chrome on mobile devices.
- **Emoji Prohibition:** Enforced across all templates, components, stylesheets, and documentation.

---

## 3. Typographic Hierarchy and Numeric Alignment

- **Display Headings:** Newsreader serif at weight 400 with tight negative tracking (`-0.04em` to `-0.05em`), matching the dashx layout benchmark while preserving typographic dignity.
- **Interface & Running Text:** Inter variable sans for labels, tables, navigation, and body copy (`--leading-ui: 1.25`, `--leading-read: 1.55`).
- **Tabular Figures:** All ledger balances, transaction counts, timestamps, and customer metrics specify `font-variant-numeric: tabular-nums`. Digits align vertically without jitter during 2-second polling cycles.
- **Type Scale Floor:** The smallest interface label is set to `0.75rem` (12px, `--text-footnote`), satisfying the readability floor for non-essential annotations. Body text sits comfortably at `1rem` (16px).

---

## 4. Hit Targets and Spacing

- **Minimum Hit Target:** Every interactive element satisfies the HIG 44px minimum hit region (`--target-min: 2.75rem` / 44px) in both dimensions:
  - Table row customer links (`.rowLink`): 44px minimum height with 4px underline offset.
  - Address copy buttons (`.copy`): 44px minimum height and width with internal padding.
  - Header navigation links (`.tab`): Pill controls wrapped in an accessible container with target heights meeting touch guidelines.
  - Brand lockup (`.brand`): 44px hit region surrounding the 24px/26px SVG mark.
- **Target Separation:** A minimum 8px separation is maintained between adjacent interactive targets to prevent mis-taps.
- **Spacing Grid:** Layout strictly follows the 4px base / 8px modular scale (`--space-1` through `--space-30`).

---

## 5. Contrast and Color Accessibility

Measurements evaluated against WCAG 2.1 AA (4.5:1 for body, 3:1 for large text / graphical controls) and AAA (7:1).

### Light Theme (`--bg: #f4f4f1`, `--surface: #fbfbf9`)
| Role | Color | Surface | Ratio | Standard |
|---|---|---|---|---|
| Primary label (`--label`) | `#0b0b0c` | `#fbfbf9` | 17.8:1 | Pass (AAA) |
| Secondary label (`--label-2`) | `#565b66` | `#f4f4f1` | 6.2:1 | Pass (AA) |
| Tertiary label (`--label-3`) | `#6b6f76` | `#fbfbf9` | 4.8:1 | Pass (AA) |
| Accent (`--accent`) | `#a63a24` | Paper (`#fbfbf9`) | 6.6:1 | Pass (AA) |
| Focus indicator (`--focus`) | `#1f5fd6` | `#f4f4f1` | 6.8:1 | Pass (AA non-text) |
| State: Swept (`--state-done`) | `#1e6b3a` | `#fbfbf9` | 6.1:1 | Pass (AA) |
| State: Progress (`--state-progress`) | `#8a5a00` | `#fbfbf9` | 5.2:1 | Pass (AA) |
| State: Failed (`--state-failed`) | `#a1261b` | `#fbfbf9` | 6.8:1 | Pass (AA) |

### Dark Theme (`--bg: #111112`, `--surface: #1a1a1c`)
| Role | Color | Surface | Ratio | Standard |
|---|---|---|---|---|
| Primary label (`--label`) | `#f1f1ee` | `#1a1a1c` | 15.6:1 | Pass (AAA) |
| Secondary label (`--label-2`) | `#b7b8bd` | `#1a1a1c` | 8.2:1 | Pass (AAA) |
| Tertiary label (`--label-3`) | `#9a9ca3` | `#1a1a1c` | 5.8:1 | Pass (AA) |
| Accent (`--accent`) | `#d66b53` | `#1a1a1c` | 4.7:1 | Pass (AA) |
| Focus indicator (`--focus`) | `#7aa7ff` | `#111112` | 7.4:1 | Pass (AA non-text) |
| State: Swept (`--state-done`) | `#6fcf8d` | `#1a1a1c` | 8.4:1 | Pass (AAA) |
| State: Progress (`--state-progress`) | `#e3b04b` | `#1a1a1c` | 7.3:1 | Pass (AAA) |
| State: Failed (`--state-failed`) | `#ff8a7a` | `#1a1a1c` | 6.4:1 | Pass (AA) |

State representation never relies on color alone: every deposit pill explicitly renders status text ("Swept to treasury", "Seen", "Accepted", "Failed").

---

## 6. Keyboard Tab-Through and Focus Mechanics

- **Skip Navigation:** A dedicated skip link (`.skip-link`) is placed at the head of `AppHeader`, linking directly to `#main-content`. It remains off-screen until focused by keyboard navigation.
- **Focus Rings:** Non-disruptive, high-contrast 2px outline with 3px offset (`--focus`). The focus style preserves the natural curvature of pill buttons and rounded cards rather than forcing a square outline.
- **Tab Sequence (Operator Screen):**
  1. Skip to main content (`.skip-link`)
  2. Home logo link (`/`)
  3. Operator navigation tab (`/operator`, `aria-current="page"`)
  4. Customer navigation tab (`/customer/Ada`)
  5. Customer table links (`/customer/:ref`)
  6. Deposit address copy buttons (`CopyButton` with programmatic clipboard write, accessible label update, and key triggers on Space/Enter)
  7. Cookie notice link and dismissal button
- **Tab Sequence (Customer Screen):**
  1. Skip to main content
  2. Home logo link
  3. Navigation tabs
  4. Deposit address copy button
  5. Receipt list items (static structured disclosure with accessible definitions)
- **No Keyboard Traps:** Focus moves unimpeded across all views without modal trap conditions.

---

## 7. Reflow and 200% Zoom (WCAG 1.4.4 & 1.4.10)

- **640px Viewport (Desktop 200% Zoom):**
  - Summary metric cards (`.stats`) collapse from 3-column grid to 1-column vertical stack without text clipping.
  - Deposit feed rows (`.feedRow`) collapse timestamp above details, maintaining legible line length.
  - Zero horizontal overflow on the root document.
- **390px Viewport (Mobile Portrait) & 320px (Narrow Constraint):**
  - Table contents wrap in `.tableWrap` with designated horizontal scrolling on data tables, protecting layout integrity.
  - Long Canton party identifiers (`86bb3d93-Ada::12204a9d88...`) employ `word-break: break-all;` within `.bigAddress code`, wrapping gracefully across multiple lines.
  - Receipt card grid uses `minmax(min(100%, 17rem), 1fr)` ensuring no bounding overflow on screens under 320px width.

---

## 8. Dark Mode Visual Parity

- **Semantic Surface Depth:**
  - Background: `#111112`
  - Cards & Tables: `#1a1a1c` with 1px border (`#2c2c30`)
  - Recessed Panels: `#232326`
  - Active Tab Pill: Elevated using `--surface-active: #2c2c31` and subtle inset border (`inset 0 0 0 1px rgb(255 255 255 / 0.08)`), preventing the active control from appearing sunken into the container track.
- **Contrast Adaptation:** Text luminance and border delineations maintain identical functional hierarchy between light and dark palettes.

---

## 9. Motion and Transparency Fallbacks

- **Reduced Motion (`prefers-reduced-motion: reduce`):** Transition durations and CSS feed animations collapse to `0.01ms`, instantly displaying updated rows.
- **Reduced Transparency (`prefers-reduced-transparency: reduce`):** Glass headers revert to solid `var(--bg)` without translucent backdrop blur.

---

## 10. Audit Verdict

**Status: PASS**  
The design implementation fulfills all requirements of T025, aligns with `docs/design-foundations.md`, and satisfies Apple HIG web guidelines.
