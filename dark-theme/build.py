#!/usr/bin/env python3
"""
Build the themed extension: rewrite bundle colors, then inject the CSS layer.

Cross-platform equivalent of `python3 recolor.py && ./apply.sh`, for machines
without bash. Run this after cloning, then load ./fork as an unpacked
extension.

    python3 build.py            build
    python3 build.py --revert   restore the stock light theme
"""

import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).parent
PAGES = ["newtab", "extension", "options"]
BEGIN = "<!-- BEGIN curius-dark -->"
END = "<!-- END curius-dark -->"


def inject(revert: bool) -> bool:
    css_path = HERE / "dark.css"
    if not revert and not css_path.exists():
        print(f"error: {css_path} not found", file=sys.stderr)
        return False
    css = "" if revert else css_path.read_text(encoding="utf-8")

    for page in PAGES:
        target = HERE / "fork" / f"{page}.html"
        pristine = HERE / f"{page}.html.orig"

        if not target.exists():
            print(f"error: {target} not found", file=sys.stderr)
            return False

        # Always start from the pristine file so repeated runs can't
        # accumulate whitespace or leave partial injections behind.
        if pristine.exists():
            target.write_text(pristine.read_text(encoding="utf-8"),
                              encoding="utf-8")

        if revert:
            print(f"  reverted {page}.html")
            continue

        html = target.read_text(encoding="utf-8")
        if "</head>" not in html:
            print(f"error: no </head> in {page}.html", file=sys.stderr)
            return False

        block = f"{BEGIN}\n<style>\n{css}\n</style>\n{END}\n"
        target.write_text(html.replace("</head>", block + "</head>", 1),
                          encoding="utf-8")
        print(f"  injected {page}.html")
    return True


def main() -> int:
    revert = "--revert" in sys.argv

    if not revert:
        recolor = HERE / "recolor.py"
        if not recolor.exists():
            print(f"error: {recolor} not found", file=sys.stderr)
            return 1
        result = subprocess.run([sys.executable, str(recolor)])
        if result.returncode != 0:
            return result.returncode
        print()

    if not inject(revert):
        return 1

    print()
    if revert:
        print("Reverted to stock. Reload the extension.")
    else:
        print("Built. Load ./fork via chrome://extensions -> Load unpacked,")
        print("or hit reload on the card if it is already loaded.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
