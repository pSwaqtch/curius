# curius

Work around [Curius](https://curius.app) — a bookmarking / reading tool.

    api-reference.md   the Curius HTTP API, reverse-engineered
    explorer/          React + d3 client for browsing that API
    dark-theme/        dark theme for the Chrome extension and the website

## Setup

Needs Python 3 and git. Node only for `explorer/`.

    git clone git@github.com:pSwaqtch/curius.git
    cd curius/dark-theme
    python3 build.py

**Extension** — `chrome://extensions` → Developer mode → Load unpacked →
`dark-theme/fork`. Disable the Web Store "Curius" first if present.

**Website** — with [Stylus](https://add0n.com/stylus.html) installed, open
this URL and accept the install prompt:

https://raw.githubusercontent.com/pSwaqtch/curius/main/dark-theme/curius-site-dark.user.css

Repeat both on every device. The fork has its own extension ID and storage,
so expect to sign in again per device; your data lives on Curius's servers.

## Updating

| Piece | Syncs? | How |
|-------|--------|-----|
| Userstyle | yes | Stylus polls `@updateURL`. **Bump `@version` or devices keep the old style.** |
| Extension | no | `git pull && python3 build.py`, then reload the card. ID is stable, login survives. |
| Repo | yes | git |

Unpacked extensions can't sync — Chrome Sync doesn't carry them.

Every build also checks whether the Chrome Web Store has a newer Curius than
the fork, since the fork never auto-updates and would otherwise drift behind
silently. See `dark-theme/README.md` for how to re-fork.

## explorer

    cd explorer && npm install && npm run dev

Needs a JWT in `.env.local` (gitignored — don't commit it).

## Why two approaches

The extension is an unpacked fork: Chrome verifies file hashes on installed
extensions, so editing in place flags it as corrupted, and auto-update would
wipe the edits anyway. Its UI is styled-components plus inline React styles,
which external CSS can't reliably reach, so `recolor.py` rewrites color
literals in our own copy of the bundle.

The website is a Stylus userstyle. On a normal page CSS with `!important`
beats inline styles, so no JS is needed.

Both share one palette — see `dark-theme/README.md`.
