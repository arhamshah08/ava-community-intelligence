# Slide deck — build spec for Codex

## What you are building

A **single-file HTML slide deck**. Arham pastes in slide content; you lay it out. One
`deck.html` that opens in any browser, navigates by keyboard, and prints to PDF cleanly.
No framework, no build step, no dependencies beyond a Google Fonts link.

If a different output is wanted (PPTX, Google Slides), ask before starting. Default to
the single HTML file.

## The one rule that matters most

**Do not add content.** You are laying out slides, not writing them. Never invent a
subtitle, a supporting line, a transition sentence, a call-to-action or a summary that
Arham did not write. If a slide has four words on it, it stays four words. If a slide is
too sparse, that is the intent.

Restructuring is allowed and encouraged: splitting one crowded slide into two, turning a
paragraph into a table, promoting the number in a sentence into the headline. Adding
words is not.

## Design system — non-negotiable

```
Background   #FFFFFF          always, every slide, no exceptions
Text         #111111          always, no grey, no muted blue, no opacity on text
Hairline     #E5E5E5          rules and table borders only
Font         DM Sans          the only family, loaded from Google Fonts
Weights      600 and 400      nothing else, no 300, no 500, no 700
```

No uppercase. No letter-spacing. No drop shadows. No gradients. No rounded cards unless
a slide genuinely needs a boundary, and then 8px and a 1px `#E5E5E5` border, never a
shadow. No icons unless Arham supplies them. Hierarchy comes from **size, weight, space
and alignment only**.

One accent (`#1B3A8F`) is permitted for **data marks only** — bar fills, chart lines,
the active dot. Never for text. Leave it out entirely if the deck has no data marks.

### Type scale — use these five sizes and no others

| Role | Size | Weight |
|---|---|---|
| Big metric | 140px | 600 |
| Slide headline | 72px | 600 |
| Body, list item | 32px | 400 |
| Table cell, caption | 24px | 400 |
| Eyebrow, slide number | 20px | 400 |

Line height 1.15 on the 140 and 72, 1.5 on everything else.

### Canvas

1920 × 1080, scaled to fit the viewport with `transform: scale()` so it is
resolution-independent. 120px margin on all four sides — nothing enters that margin.
Content is vertically centred unless the template says otherwise.

## Slide templates

Pick the closest template per slide. Do not invent new ones without need.

1. **Title** — headline only, left-aligned, vertically centred. Optional eyebrow above.
2. **Statement** — one headline, up to two lines. The default for most slides.
3. **Metric** — one 140px number with a short label above it. Up to three side by side.
4. **Comparison** — a two- or three-column table. Header row 24px, body 32px, hairline
   rules between rows only, no vertical rules, no zebra striping.
5. **List** — up to five items, 32px, generous spacing. No bullets — use space. Never
   more than five; split the slide instead.
6. **Image** — one image, max 60% of slide height, with an optional 32px caption below.
7. **Close** — same as Title.

## What not to do

These are the exact mistakes to avoid — they were all corrected in the companion app and
the same rules apply here:

- No text under a main line. If a number needs context, that context is a **column** or a
  separate slide, not a sub-line under the figure.
- No restating a figure that is already on the slide.
- No decorative card subtitles ("same 255 homes, both ways", "highest earning first").
- No explanatory paragraph under a table.
- No more than one idea per slide.

## Behaviour

- `→` / `Space` / click advances. `←` goes back. `Home` / `End` jump to first / last.
- Progress dots bottom-left, clickable. Slide number bottom-right at 20px.
- `?` toggles a plain slide index overlay.
- Print stylesheet: one slide per page, landscape, no dots or slide chrome, so
  `Cmd-P → Save as PDF` produces a clean deck.
- Deep-link each slide as `#3` so a specific slide can be shared.

## Output

```
deck.html            the whole deck, self-contained
assets/              only if Arham supplies images
```

Put the slide content in one `SLIDES` array at the top of the file, each entry
`{ template, eyebrow?, headline?, items?, rows?, metric?, image?, caption? }`, so the
content can be edited without touching layout code.

## Acceptance checks

Run in the browser console on the deck. Must return an empty array:

```js
[...document.querySelectorAll('.slide *')]
  .filter(e => e.children.length === 0 && e.textContent.trim())
  .filter(e => { const g = getComputedStyle(e);
    return !['140px','72px','32px','24px','20px'].includes(g.fontSize)
      || !['400','600'].includes(g.fontWeight)
      || g.color !== 'rgb(17, 17, 17)'
      || !g.fontFamily.startsWith('"DM Sans"')
      || g.textTransform === 'uppercase'
      || g.letterSpacing !== 'normal'; })
  .map(e => e.textContent.trim().slice(0, 30));
```

Then by eye: every slide readable at 25% zoom, nothing inside the 120px margin, no slide
carrying more than one idea, and the PDF export clean.

## Done when

`deck.html` opens, navigates by keyboard, passes the console check, prints to PDF one
slide per page, and contains exactly the words Arham supplied — no more.
