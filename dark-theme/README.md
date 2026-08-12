# dark-theme

Dark theme for the Curius Chrome extension (an unpacked fork) and for
curius.app (a Stylus userstyle).

Install instructions are in the [root README](../README.md).

## Layout

    fork/                      the unpacked extension — load this in Chrome
    build.py                   recolor + inject; works on any OS
    recolor.py                 rewrites colors in the JS bundles
    apply.sh                   injects dark.css into the HTML pages
    dark.css                   CSS layer for stable class names
    curius-site-dark.user.css  the website userstyle
    *.js.orig / *.html.orig    pristine sources

Build with `python3 build.py`, or `python3 recolor.py && ./apply.sh` on
macOS/Linux. Generated files (`fork/dist/*.js`, `fork/*.html`) are
gitignored, so a fresh clone must build before loading.

`helper.js` is deliberately **not** themed. It is the content script injected
into every website you browse; its tooltips sit on other people's pages,
which are mostly light.

## Palette

Perceptual match to the light theme, not a mathematical inversion — identical
contrast ratios don't produce identical perceived weight on a dark ground.

| Role      | Value     | Note                                       |
|-----------|-----------|--------------------------------------------|
| ground    | `#1a1b1e` |                                            |
| surface   | `#212226` | cards, bars                                |
| raised    | `#25262b` | hover                                      |
| pressed   | `#2c2d33` | tags                                       |
| rule      | `#2c2d31` | separators; 1.25:1, above the strict match |
| primary   | `#e4e4e7` | not pure white — white blooms on dark      |
| secondary | `#b4b4bc` |                                            |
| muted     | `#8b8b93` | lifted; grey sinks into dark faster        |
| accent    | `#e6cf00` | was `#ffe600`; hue held, luminance dropped |

Highlights keep bright yellow with near-black ink, preserving the "marker"
reading rather than inverting it.

Site theme verified by measuring computed contrast for every text node on the
feed and bookshelf pages: 0 elements below 3:1.

## Editing

**Colors in the extension** live in `recolor.py` (bundle substitutions) and
`dark.css` (Bootstrap and Material-UI class names). Run `build.py`, reload the
card.

**Colors on the site** live in `curius-site-dark.user.css`. Bump `@version`
and push, or other devices keep the old style.

Stylus strips the `@-moz-document` wrapper. Chrome ignores that at-rule in a
plain `<style>` tag, so don't test the file by pasting it into DevTools.

## When Curius redeploys

The `css-*` selectors near the bottom of the userstyle are emotion class
hashes generated at build time. They **will** change. Everything above that
block matches on values Curius writes (inline styles, Bootstrap and `Mui*`
class names, SVG attributes) and should survive.

If a light patch appears after an update, regenerate the list from the
curius.app DevTools console:

    const light=new Set(), dark=new Set();
    const lum=c=>{const m=c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      return m? .299*+m[1]+.587*+m[2]+.114*+m[3] : null;};
    for(const s of document.styleSheets){try{for(const r of s.cssRules){
      if(!r.style||!r.selectorText||!/css-/.test(r.selectorText))continue;
      const bg=r.style.backgroundColor, c=r.style.color;
      if(bg&&lum(bg)>200) light.add(r.selectorText);
      if(c&&(c==='black'||lum(c)<90)) dark.add(r.selectorText);
    }}catch(e){}}
    console.log([...light].join(','), '\n\n', [...dark].join(','));

For the extension, a Curius release won't touch the fork (it doesn't
auto-update), but you also won't get their fixes until you re-fork.

## Caution

The original Chrome-managed extension folder no longer exists, so the
`*.orig` files and `fork/`'s vendored assets are the only copies. To re-fork
from a newer Curius release, install it from the Web Store first, then
re-copy.
