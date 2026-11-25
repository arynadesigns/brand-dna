# Brand DNA — Livada Studio

An interactive, single-page web app that maps a client's visual taste by having them
swipe through real brand marks, then builds a style profile from their reactions.

## Run it

```bash
# either: double-click
start-brand-dna.command          # serves at http://localhost:8000

# or, from Claude Code's preview:
preview start "brand-dna"        # serves at http://localhost:8770
```

It's plain static files — any static server works. No build step, no dependencies.

## Project layout

| File | What's in it |
|------|--------------|
| `index.html` | Page shell + the markup for every slide (setup → industry → swipe → results). Add new screens here as `.slide` sections. |
| `styles.css` | All styling. Design tokens (colors, etc.) live in `:root` at the top. |
| `app.js` | App logic: slide navigation (`go()`), the `Swiper` module (swipe deck), and the `Top3` module (results). |
| `data.js` | The brand library — `const ALL`, ~60 brands with metadata + embedded logos. `app.js` reads this global. |
| `fonts/` | Golos UI (headings) and Geist (body), loaded via `@font-face` in `styles.css`. |
| `logos/` | SVG brand marks, loaded as `logos/<slug>.svg`. Missing ones fall back to the simpleicons CDN. |

## How it fits together

- Slides are `.slide` elements toggled by `go(index)` in `app.js`.
- The swipe deck reads brands from the global `ALL` (defined in `data.js`), filtered by industry.
- A brand renders its logo from `logos/<slug>.svg`, then a base64 `embed`, then a CDN fallback, then a letter tile.
- Adding a brand = add an object to `ALL` in `data.js` (+ optionally drop its SVG in `logos/`).
- Adding a screen = add a `.slide` section in `index.html` and wire navigation in `app.js`.
