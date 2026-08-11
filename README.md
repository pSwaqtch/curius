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

## Install

1. `chrome://extensions` → enable Developer mode
2. Disable the Web Store "Curius" if present
3. Load unpacked → select `fork/`

The fork has no `key`, so it gets its own extension ID and its own storage.
Expect to sign in again; your data lives on Curius's servers.

## Iterate

    python3 recolor.py && ./apply.sh

Then hit reload on the extension card.

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

## Caution

The original Chrome-managed extension folder no longer exists on this machine,
so the `*.orig` files here are the only pristine copies. To re-fork from a
newer Curius release, reinstall from the Web Store first and re-copy.
