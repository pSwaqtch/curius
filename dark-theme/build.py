#!/usr/bin/env python3
"""
Build the themed extension: rewrite bundle colors, then inject the CSS layer.

Cross-platform equivalent of `python3 recolor.py && ./apply.sh`, for machines
without bash. Run this after cloning, then load ./fork as an unpacked
extension.

    python3 build.py             build
    python3 build.py --revert    restore the stock light theme
    python3 build.py --no-check  skip the upstream version check
"""

import json
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).parent
PAGES = ["newtab", "extension", "options"]
BEGIN = "<!-- BEGIN curius-dark -->"
END = "<!-- END curius-dark -->"

EXT_ID = "fbpnbdifockifjiimogdjndhpmmfgjkl"
UPDATE_URL = (
    "https://clients2.google.com/service/update2/crx"
    "?response=updatecheck&prodversion=131.0&acceptformat=crx3"
    f"&x=id%3D{EXT_ID}%26uc"
)


def _parse_version(v: str) -> tuple:
    return tuple(int(p) for p in re.findall(r"\d+", v))


def check_upstream() -> None:
    """Warn if the Web Store has a newer Curius than this fork.

    The fork never auto-updates, so it silently drifts behind upstream. This
    runs at build time -- the moment you would act on the answer -- rather
    than on a schedule. Failures here are never fatal: no network, or Google
    changing the endpoint, must not block a build.
    """
    manifest = HERE / "fork" / "manifest.json"
    try:
        local = json.loads(manifest.read_text(encoding="utf-8"))["version"]
    except Exception:
        return

    try:
        with urllib.request.urlopen(UPDATE_URL, timeout=6) as r:
            xml = r.read().decode("utf-8", "replace")
    except (urllib.error.URLError, OSError, TimeoutError):
        print(f"  fork is Curius {local} (upstream check skipped: offline)")
        return

    m = re.search(r'<updatecheck[^>]*\sversion="([^"]+)"', xml)
    if not m:
        print(f"  fork is Curius {local} (upstream version not reported)")
        return
    upstream = m.group(1)

    if _parse_version(upstream) > _parse_version(local):
        print()
        print(f"  ! Curius {upstream} is out upstream; this fork is {local}.")
        print("    The fork does not auto-update, so it will not pick up")
        print("    their fixes. To re-fork: install Curius from the Web")
        print("    Store, copy its version folder over fork/, delete")
        print("    fork/_metadata and the manifest's \"key\" and")
        print("    \"update_url\", then re-run this script.")
        print("    See README 'Caution'.")
        print()
    elif _parse_version(upstream) < _parse_version(local):
        print(f"  fork is Curius {local}; Web Store lists {upstream}")
    else:
        print(f"  fork is current with Curius {upstream}")


def inject(revert: bool) -> bool:
    css_path = HERE / "dark.css"
    if not revert and not css_path.exists():
        print(f"error: {css_path} not found", file=sys.stderr)
        return False
    css = "" if revert else css_path.read_text(encoding="utf-8")

    for page in PAGES:
        target = HERE / "fork" / f"{page}.html"
        pristine = HERE / f"{page}.html.orig"

        # Always write from the pristine source: repeated runs can't
        # accumulate whitespace, and a fresh clone (where fork/*.html is
        # gitignored and therefore absent) still builds.
        if not pristine.exists():
            print(f"error: {pristine} not found", file=sys.stderr)
            return False
        target.parent.mkdir(parents=True, exist_ok=True)
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

    if not revert and "--no-check" not in sys.argv:
        print()
        check_upstream()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
