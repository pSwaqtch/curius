# curius

Work around [Curius](https://curius.app) — a bookmarking / reading tool.

    api-reference.md   the Curius HTTP API, reverse-engineered
    explorer/          React + d3 client for browsing that API
    dark-theme/        dark theme for the Chrome extension and the website

Each subdirectory kept its own history; they were merged into this repo
rather than squashed.

## dark-theme

Two halves, because the extension and the website need different approaches:

- **The extension** is an unpacked fork. Chrome verifies file hashes on
  installed extensions, so editing in place gets it flagged as corrupted.
  The fork sidesteps that. Its UI is styled-components plus inline React
  styles, which external CSS can't reliably reach, so a script rewrites
  color literals in a copy of the bundle.

- **The website** is a Stylus userstyle. On a normal page, CSS with
  `!important` beats inline styles, so no JS is needed.

Both share one palette, so moving between the new tab and the site reads as
one product. See `dark-theme/README.md` for install and maintenance.

## explorer

Vite + React 19 + d3. `npm run dev`.

Needs a JWT in `.env.local` (gitignored — don't commit it).

## Setting up a new device

    git clone git@github.com:pSwaqtch/curius.git
    cd curius/dark-theme
    python3 build.py

Then `chrome://extensions` → Developer mode → Load unpacked → `dark-theme/fork`.

For the website theme, install the userstyle by URL once per device — after
that it auto-updates:

https://raw.githubusercontent.com/pSwaqtch/curius/main/dark-theme/curius-site-dark.user.css

### What syncs, and what doesn't

| Piece | Syncs? | How |
|-------|--------|-----|
| Userstyle | yes | Stylus polls `@updateURL`; bump `@version` to publish |
| Extension | no | Unpacked extensions can't sync — `git pull && python3 build.py`, then reload the card |
| Repo | yes | git |

Requirements on a new machine: Python 3 and git. Node is only needed for
`explorer/`. `build.py` replaces the bash scripts on Windows.
