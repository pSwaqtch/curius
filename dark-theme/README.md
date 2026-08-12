# curius-dark

A dark theme for the Curius Chrome extension, built as an unpacked fork.

## Why a fork

Editing the installed extension in place doesn't work: Chrome verifies file
hashes against `_metadata/computed_hashes.json` and disables the extension as
corrupted. Auto-update would wipe the edits anyway. Loading an unpacked copy
sidesteps both — no hash verification applies, and nothing auto-updates it.

## Why the bundle is patched instead of overridden with CSS

The UI is built with styled-components (runtime-generated class names) plus
inline React style objects. External CSS can't reliably target the first and
can't touch the second at all, so the color literals are rewritten in our own
copy of the bundle. `dark.css` remains as a thin layer for the real class
names Bootstrap contributes.

## Layout

    fork/            the unpacked extension — load this in Chrome
    recolor.py       rewrites colors in the JS bundles
    apply.sh         injects dark.css into the three HTML pages
    dark.css         CSS layer for stable class names
    *.js.orig        pristine bundles (the only copies — see below)
    *.html.orig      pristine pages

`helper.js` is deliberately **not** themed. It is the content script injected
into every website you browse; its tooltips and buttons sit on other people's
pages, which are mostly light.

## Install (per device)

Unpacked extensions cannot sync — Chrome Sync does not carry them, and there
is no hosted install. Each machine needs the folder locally and loaded by
hand, once:

    git clone git@github.com:pSwaqtch/curius.git
    cd curius/dark-theme
    python3 build.py

Then:

1. `chrome://extensions` → enable Developer mode
2. Disable the Web Store "Curius" if present
3. Load unpacked → select this directory's `fork/`

`build.py` runs everywhere Python does. On macOS/Linux the two underlying
steps can also be run directly:

    python3 recolor.py && ./apply.sh

`fork/dist/*.js` and `fork/*.html` are generated and gitignored, which is why
a fresh clone must build before loading.

The fork has no `key`, so it gets its own extension ID and its own storage.
Expect to sign in again on each device; your data lives on Curius's servers.

### Updating a device

    git pull && python3 build.py

Then hit reload on the extension card. The extension ID is stable, so
storage and login survive.

## Palette

Perceptual match to the stock light theme, not a mathematical inversion.
Identical contrast ratios don't produce identical perceived weight on a dark
ground, so:

| Role      | Value     | Note                                        |
|-----------|-----------|---------------------------------------------|
| ground    | `#1a1b1e` |                                             |
| surface   | `#212226` | cards, bars                                 |
| raised    | `#25262b` | hover                                       |
| pressed   | `#2c2d33` | tags                                        |
| primary   | `#e4e4e7` | not pure white — white blooms on dark        |
| secondary | `#b4b4bc` |                                             |
| muted     | `#8b8b93` | lifted; grey sinks into dark faster         |
| accent    | `#e6cf00` | was `#ffe600`; hue held, luminance dropped  |

Highlights keep bright yellow with near-black ink, preserving the "marker"
reading from the light theme rather than inverting it.

## The website (curius.app)

`curius-site-dark.user.css` themes the site itself. It is a **Stylus**
userstyle, not Tampermonkey — the site needed no JS, only CSS with
`!important` to beat Curius's inline styles.

**Install by URL** so every device stays in sync automatically. In Chrome
with Stylus installed, open:

https://raw.githubusercontent.com/pSwaqtch/curius/main/dark-theme/curius-site-dark.user.css

Stylus intercepts `.user.css` URLs and offers an install prompt. It then
re-checks `@updateURL` periodically and pulls any version with a higher
`@version` — so pushing a change here updates every device.

**Bump `@version` when you edit this file.** Stylus compares versions, not
content; without a bump, devices keep the old style.

(Stylus strips the `@-moz-document` wrapper; Chrome ignores that at-rule in a
plain `<style>` tag, so don't test it by pasting into DevTools.)

Verified by measuring computed contrast for every text node on the feed and
bookshelf pages — 0 elements below 3:1.

### When Curius redeploys

The `css-*` selectors near the bottom are emotion class hashes generated at
build time. They **will** change. Everything above that block matches on
values Curius writes (inline styles, Bootstrap classes) and should survive.

If a light patch appears after an update, regenerate the list: open
curius.app, DevTools console, and run

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

## Caution

The original Chrome-managed extension folder no longer exists on this machine,
so the `*.orig` files here are the only pristine copies. To re-fork from a
newer Curius release, reinstall from the Web Store first and re-copy.
