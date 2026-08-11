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
