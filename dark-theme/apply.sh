#!/usr/bin/env bash
# Inject the dark theme into the unpacked Curius fork (./fork).
#
# The fork is loaded via chrome://extensions -> Load unpacked, so no hash
# verification applies and the theme persists. Run this after editing
# dark.css, then hit the reload icon on the extension card.
#
#   ./apply.sh            apply the theme
#   ./apply.sh --revert   strip it back to stock light

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CSS="$HERE/dark.css"

# All three extension pages share the same shell and get the same CSS layer.
PAGES=(newtab extension options)

BEGIN="<!-- BEGIN curius-dark -->"
END="<!-- END curius-dark -->"

for page in "${PAGES[@]}"; do
  target="$HERE/fork/$page.html"
  pristine="$HERE/$page.html.orig"

  [[ -f "$target" ]] || { echo "error: $target not found" >&2; exit 1; }

  # Always start from the pristine file so repeated runs can't accumulate
  # whitespace or leave partial injections behind.
  [[ -f "$pristine" ]] && cp "$pristine" "$target"

  if [[ "${1:-}" == "--revert" ]]; then
    echo "reverted $page.html"
    continue
  fi

  [[ -f "$CSS" ]] || { echo "error: dark.css not found at $CSS" >&2; exit 1; }

  python3 - "$target" "$CSS" "$BEGIN" "$END" "$page" <<'PY'
import sys
path, css_path, begin, end, page = sys.argv[1:6]
html = open(path, encoding="utf-8").read()
css = open(css_path, encoding="utf-8").read()
block = f"{begin}\n<style>\n{css}\n</style>\n{end}\n"
if "</head>" not in html:
    sys.exit(f"error: no </head> in {page}.html")
open(path, "w", encoding="utf-8").write(html.replace("</head>", block + "</head>", 1))
print(f"injected {page}.html")
PY
done

if [[ "${1:-}" == "--revert" ]]; then
  echo "Reverted to stock light theme. Reload the extension."
  exit 0
fi

echo
echo "Done. Reload Curius (dark) at chrome://extensions."
