# Walkthrough video + consistency pass — build spec

## Context

`~/ava-community-intelligence` is live at https://ava-community-intelligence.vercel.app
and pushed to https://github.com/arhamshah08/ava-community-intelligence. Nine tabs are
built and the UI has just been stripped to a minimal treatment: three font sizes
(30/16/14), two weights (600/400), one family (DM Sans), one ink (`#111111`), no
sub-lines under main lines, no restated figures.

Two things remain. This file is the complete spec — build everything in it. No further
questions should be needed.

1. A **standalone walkthrough slide route** plus a rendered **.mp4** and a
   **captions-only transcript**.
2. A **consistency pass** over the handful of surfaces the minimal treatment has not
   reached yet (mainly the Communities panel).

---

## Deliverable 1 — walkthrough route

**New file:** `src/walkthrough.js`
**Modified:** `src/main.js` (one TABS entry), `src/styles.css` (append a `.wt-*` block)

Route `#/walkthrough`, rendered `flush: true` so it fills the viewport. Add to TABS
under the `Context` group, labelled `Walkthrough`, placed after `About`.

Layout per slide — deliberately almost empty:

```
┌────────────────────────────────────┐
│                                    │
│   Households earn                  │  ← 72px, weight 600
│   74% more                         │
│                                    │
│   ┌──────────────────────────┐     │
│   │   screenshot for step    │     │  ← max-height 52vh, 8px radius,
│   └──────────────────────────┘     │     1px var(--line) border
│                                    │
│   ● ● ● ○ ○ ○ ○ ○ ○ ○     [Next ›] │  ← dots 8px, Next uses .btn
└────────────────────────────────────┘
```

Rules:
- One caption, one image, dots, one button. Nothing else on the slide.
- Caption is the **only** text. No sub-line, no step title, no narration on screen.
- Hide the left nav while on this route (the slide is full-bleed).
- Keyboard: `→` / `Space` next, `←` back, `Esc` leaves to `#/dashboard`.
- Clicking anywhere on the slide advances; the dots are clickable to jump.
- No autoplay. Frames are captured step by step (see Deliverable 2).

**Typography exception — state this in a comment in `styles.css`.** The walkthrough is a
presentation surface, not product UI, so it adds two tokens *used only by `.wt-*`
classes*:

```css
--fs-slide: 72px;   /* caption */
--fs-slide-dot: 14px;
```

Everything else still obeys the locked rules: weights 600/400 only, DM Sans only, text
`#111111` only, line-height 1.25 on the caption.

### The ten slides

Single source of truth — one `STEPS` array in `src/walkthrough.js`:

| # | Caption (exact, on screen) | Screenshot to capture | From |
|---|---|---|---|
| 1 | Two problems. One answer. | Oakland map, homes + both DC sites | `#/map` → Community |
| 2 | A household earns $2,115 a year. | KPI row, programme **On** | `#/dashboard` |
| 3 | Without a data centre: $1,215. | KPI row, programme **Off** | `#/dashboard` |
| 4 | Stack more programmes. Earn more. | Programme list with switches | `#/programs` |
| 5 | 255 households, each scored. | Customer list, Mixed sort | `#/customers` |
| 6 | Why this one? Every measure checked. | "Every measure we checked" table | customer modal |
| 7 | What pays for it. What comes next. | Value stack bar + next rung | customer modal |
| 8 | And exactly what to buy. | Product shortlist | customer modal |
| 9 | Built from permits, imagery, meter data. | Permit pipeline mid-run | `#/permits` |
| 10 | Now do it anywhere. | California map, 10 providers | `#/communities` |

Captions are ~6 words. Do not lengthen them. They are roughly 10% of the content of the
tabs they stand in for, which is the point.

Images live at `public/walkthrough/01.png` … `10.png`, referenced as `/walkthrough/01.png`.
Capture at 1600×980, crop to the region named above, no browser chrome.

---

## Deliverable 2 — the .mp4

Capture the **rendered slides** (not the raw screenshots), so each frame already carries
the caption and dots.

```bash
mkdir -p frames
# For each of the 10 slides: open #/walkthrough, advance to slide N,
# screenshot the viewport to frames/slide-01.png … slide-10.png at 1600x980.

ffmpeg -y -framerate 1/5 -pattern_type glob -i 'frames/slide-*.png' \
  -c:v libx264 -r 30 -pix_fmt yuv420p -vf "scale=1920:-2" \
  walkthrough.mp4
```

`-framerate 1/5` holds each slide 5 seconds → a 50-second silent video. Adjust to `1/4`
if it feels slow. ffmpeg is already installed at `/opt/homebrew/bin/ffmpeg`.

Add `frames/` and `walkthrough.mp4` to `.gitignore` — do not commit the binary.

---

## Deliverable 3 — the transcript

**New file:** `WALKTHROUGH-TRANSCRIPT.md`. Captions only, nothing else:

```markdown
# Walkthrough — on-screen captions

1. Two problems. One answer.
2. A household earns $2,115 a year.
...
10. Now do it anywhere.
```

Generate it from the same `STEPS` array so it can never drift from the slides.

---

## Deliverable 4 — consistency pass

The minimal treatment has not reached these. Apply the same rules: no text under a main
line, no restated figures, no decorative card subtitles. Move anything worth keeping into
a column.

**`src/communities.js`** — the main offender:
- `Serves` paragraph and `Why it matters here` paragraph → drop the `sec__title` +
  `<p class="nobar">` pairs. Put `serves` and `hq` into the existing two-up stat grid as
  further cells. Drop `load` from the panel entirely, or move it to a `title` attribute
  on the marker.
- `.commprog` rows render `<b>name</b><small>desc</small>` stacked. Flatten to a
  `ledger__row` with the name on the left and nothing on the right; move `desc` to a
  `title` attribute.
- The closing verify footnote → one short line: `Named people verified as of early 2026.`
  Keep the `verify` tags on the rows; they carry the caveat.

**`src/designer.js`** — three remaining `card__note` subtitles; delete them.

**`src/dashboard.js` / `src/programs.js`** — one `card__note` each; keep only if it is a
count, delete if it is a description.

**Leave `src/about.js` alone.** It is a prose page by design and is not presented.

Do not touch: the recommendation "why" line, the next-rung "what is needed" line, and the
grid operator note. All three are inside the double-click modal and are the answer itself,
not decoration.

---

## Verification

```bash
cd ~/ava-community-intelligence
npm run dev -- --port 5174
```

1. `#/walkthrough` — caption renders at 72px, arrows and Space advance, dots jump, Esc
   exits, nav is hidden.
2. Run the audit below in the console on **every** route; it must return `clean` for all.
   The walkthrough route is expected to report 72px — that is the sanctioned exception.

```js
[...document.querySelectorAll('#view *')]
  .filter(e => e.children.length === 0 && e.textContent.trim())
  .filter(e => { const g = getComputedStyle(e);
    return !['14px','16px','30px','72px'].includes(g.fontSize)
      || !['400','600'].includes(g.fontWeight)
      || !['rgb(17, 17, 17)','rgb(255, 255, 255)'].includes(g.color); })
  .map(e => e.textContent.trim().slice(0,20));
```

3. `walkthrough.mp4` plays, 10 slides, text legible at 50% zoom.
4. `npx vite build` clean, then `vercel --prod --yes`, then confirm the served asset hash
   matches `dist/index.html`.

## Done when

`#/walkthrough` runs end to end, `walkthrough.mp4` exists at the repo root,
`WALKTHROUGH-TRANSCRIPT.md` lists the ten captions, the Communities panel carries no
stacked sub-lines, and the audit returns clean on every route.
