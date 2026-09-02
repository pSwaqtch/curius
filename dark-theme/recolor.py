#!/usr/bin/env python3
"""
Rewrite light-theme colors inside the Curius newtab bundle.

Why this exists: the UI is built with styled-components (runtime class
names) plus some inline React style objects. External CSS can't reliably
target the first and can't touch the second at all. Since the fork is our
own copy, substituting the color literals at the source is both simpler
and more complete than fighting them with overrides.

Always rewrites from newtab.js.orig, so it is safe to re-run.
"""

import re
import sys
from pathlib import Path

HERE = Path(__file__).parent

# Bundles we retheme. helper.js is deliberately excluded: it is the content
# script injected into every site you browse, and its white tooltips/buttons
# sit on other people's (mostly light) pages. Darkening those would make the
# Curius UI clash everywhere except on dark sites.
BUNDLES = ["newtab", "extension", "options"]

# Perceptual mapping, same reasoning as dark.css:
#   light surfaces -> dark surfaces, stepped to preserve relative depth
#   muted greys    -> lifted, because grey sinks into dark faster
#   #ffe600        -> hue held, luminance dropped
SUBS = {
    # --- surfaces (light -> dark), longest/most specific first ---
    "#f8f8f8": "#25262b",
    "#f5f5f5": "#2c2d33",
    "#fafafd": "#25262b",
    "#f2f2f2": "#2c2d33",
    "#f6f6f6": "#25262b",
    "#fcfcfc": "#212226",
    "#fafafa": "#212226",
    "#efefef": "#2c2d33",
    "#e3e5f1": "#2c2d33",
    "#edeef9": "#2c2d33",
    "#ececf6": "#2c2d33",
    "#eee":     "#2c2d33",

    # --- text greys (lifted for dark grounds) ---
    "#aaa":     "#8b8b93",
    "#545454":  "#b4b4bc",
    "#cecece":  "#8b8b93",
    "#babac0":  "#3a3b42",   # scrollbar thumb

    # --- accent: hue held, luminance dropped ---
    # Only #ffe600, used as a UI accent (selected channel, offset button).
    # #FEFD70 belongs to the highlight gradient, which stays bright and
    # carries dark ink -- see RAW below.
    "#ffe600":  "#e6cf00",

    # --- popup-specific surfaces ---
    "#e4e4e4":  "#2c2d33",
    "#3a3a3a":  "#b4b4bc",
}

# Curius's body ink, which appears with and without spaces depending on the
# bundle. Matched by regex so a spacing variant can't slip through -- that is
# exactly how the options page ended up with near-black text on a dark ground.
INK_RE = re.compile(r"rgb\(\s*33,\s*37,\s*41\s*\)")
INK = "#e4e4e7"

# Icons sit at `color: lightgrey` and darken to `color: black` on hover --
# an affordance that inverts on a dark ground (hovering would dim them).
# Flip the pair so hover still means "brighter".
HOVER_RE = [
    (re.compile(r"color: lightgrey;"), "color: #8b8b93;"),
    (re.compile(r"color: black;"), "color: #ffffff;"),
]

# All three bundles embed the same palette module. Retheming it here fixes
# every component that reads a token, rather than chasing individual rules.
PALETTE = [
    # Body ink token. Named "black" but used as the primary text color.
    ('black:"rgb(33,37,41)"', 'black:"#e4e4e7"'),
    # Pale surface tokens, designed as tints on white.
    ('paleBlue:"rgb(245, 248, 250)"', 'paleBlue:"#212226"'),
    ('lightBlue:"rgb(223, 231, 236)"', 'lightBlue:"#2c2d33"'),
    ('borderGrey:"rgba(243,244,246)"', 'borderGrey:"rgba(52,53,59)"'),
    ('palePurple:"#e3e5f1"', 'palePurple:"#2c2d33"'),
    # Highlight washes: translucent yellow over dark turns muddy, so go
    # opaque -- same reasoning as the newtab highlight fix.
    ('paleYellow:"rgba(255, 200, 0, 0.2)"', 'paleYellow:"rgba(240, 230, 0, 0.85)"'),
    ('selfHighlightColor:"#ffff99"', 'selfHighlightColor:"#e6cf00"'),
]

# Popup (extension.js) components. Applied to every bundle that contains
# them, unlike RAW below which is newtab-specific.
POPUP = [
    # Title input: transparent background with no color set, so it inherited
    # the browser default black and stayed black on the dark panel.
    ("flex: 1;\n  outline: none;\n  border: none;\n  font-family: Source Sans Pro;\n  background-color: transparent;",
     "flex: 1;\n  outline: none;\n  border: none;\n  font-family: Source Sans Pro;\n  background-color: transparent;\n  color: #e4e4e7;"),

    # "Done" button: pale blue-grey, unmapped.
    ("background-color: rgb(223, 231, 236);\n  border: none;",
     "background-color: #2c2d33;\n  color: #e4e4e7;\n  border: none;"),

    # Title field wrapper: white border, and lightgrey on focus/hover.
    ("border: 1px solid white;", "border: 1px solid #34353b;"),
    ("border: 1px solid lightgrey;", "border: 1px solid #43444c;"),
]

# Search overlay on the new tab. The dropdown panel, its section labels and
# the input's focus state are all styled-components with light values.
OVERLAY = [
    # Dropdown panel.
    ("position: absolute;\n  width: 100%;\n  background-color: white;\n  z-index: 100;\n  box-shadow: rgb(0 0 0 / 20%) 0px 12px 12px;",
     "position: absolute;\n  width: 100%;\n  background-color: #212226;\n  color: #e4e4e7;\n  z-index: 100;\n  box-shadow: rgb(0 0 0 / 50%) 0px 12px 12px;\n  border: 1px solid #34353b;\n  border-radius: 7px;"),

    # "FROM CURIUS" / "RECENTLY SAVED" section labels.
    ("color: rgba(55, 53, 47, 0.65);", "color: #8b8b93;"),
    ("border-bottom: 1px solid rgba(243, 244, 246);",
     "border-bottom: 1px solid #34353b;"),

    # Loading spinner row.
    ("padding: 10px;\n  color: #a5a5a5;", "padding: 10px;\n  color: #8b8b93;"),

    # Search input: goes white on focus, which is the white box behind the
    # dropdown. Keep the raised-surface treatment instead.
    # NOTE: this block lives inside a JS string literal, so its newlines are
    # the two characters \ and n -- not real newlines like the templates above.
    ("&:focus {\\n      outline: 3px solid #f9f9f9;\\n      border: 1px solid #ddd;\\n      background-color: white;\\n    }",
     "&:focus {\\n      outline: none;\\n      border: 1px solid #43444c;\\n      background-color: #25262b;\\n    }"),
    ("&:hover {\\n      border: 1px solid #ddd;\\n    }",
     "&:hover {\\n      border: 1px solid #43444c;\\n    }"),
]

# Inline style objects and gradients that CSS cannot override.
RAW = [
    # Header navbar: white gradient -> dark gradient (keeps the blur effect)
    (
        'background:"linear-gradient(rgba(255,255,255,1.0), rgba(255,255,255,0.8))"',
        'background:"linear-gradient(rgba(26,27,30,1.0), rgba(26,27,30,0.85))"',
    ),
    # A lone inline white background
    ('background:"#fff"', 'background:"#212226"'),
    # Inline muted greys -> lifted grey
    ('color:"grey"', 'color:"#8b8b93"'),
    # 70% black on white is solid primary text. The same opacity on a dark
    # ground reads far weaker, so this goes to full-strength body text --
    # these are feed link titles and authors, not secondary metadata.
    ('color:"rgba(0, 0, 0, 0.7)"', 'color:"#e4e4e7"'),
    ('color:"#343a40"', 'color:"#e4e4e7"'),
    # Bootstrap navbar variant is light; its own text rules assume dark ink
    ('variant:"light"', 'variant:"dark"'),
    # Bootstrap <mark> is a pale cream meant for black ink; keep that
    # relationship rather than inverting it.
    (".mark,mark{padding:.2em;background-color:#fcf8e3}",
     ".mark,mark{padding:.2em;background-color:#e6cf00;color:#17180f}"),
    # Bootstrap card / list-group / modal surfaces (minified, no spaces)
    ("background-color:#fff;background-clip:border-box",
     "background-color:#212226;background-clip:border-box"),
    ("background-color:#fff;background-clip:padding-box",
     "background-color:#212226;background-clip:padding-box"),
    # The highlight gradient is a yellow->salmon wash designed for black ink.
    # Keep it bright and force dark text on it, exactly as in the light theme,
    # instead of letting inherited light text turn it muddy.
    ("background: linear-gradient(108.99deg, #FEFD70 5.28%, rgba(255, 230, 0, 0.993167) 20.83%, #F88F6F 129.61%);",
     "background: linear-gradient(108.99deg, #FEFD70 5.28%, rgba(255, 230, 0, 0.993167) 20.83%, #F88F6F 129.61%);\\n  color: #17180f;"),

    # --- styled-components that use bare keywords, not hex ---

    # NOTE: these templates contain real newlines, not escaped ones.

    # Section header bars ("Recent links", "Read later") -- the white strips
    # across the feed. Runs before the hex map, so match the original values.
    # The label text inherits Bootstrap's dark ink from the card component,
    # so set it explicitly here -- otherwise it stays near-black on the now
    # dark bar.
    ("width: 100%;\n  border-bottom: 1px solid #eee;\n  border-radius: 5px;\n  background-color: white;\n  &:hover {\n    background-color: #fafafa;",
     "width: 100%;\n  border-bottom: 1px solid #34353b;\n  border-radius: 5px;\n  background-color: #212226;\n  color: #e4e4e7;\n  & a, & span {\n    color: #e4e4e7;\n  }\n  &:hover {\n    background-color: #25262b;"),

    # "Read later" tile: same inherited dark ink, plus a hover rule that
    # explicitly sets black text.
    ("background-color: #f6f6f6;\n  border-radius: 10px;",
     "background-color: #25262b;\n  color: #e4e4e7;\n  border-radius: 10px;"),
    ("background-color: #f2f2f2;\n    color: rgba(0, 0, 0, 0.9);",
     "background-color: #2c2d33;\n    color: #ffffff;"),

    # Feed row text in styled-components (the "in <title>" lines and author
    # names). Same reasoning as the inline rgba above: these are primary
    # content, so they go to full-strength body text rather than a
    # translucent grey that sinks into the dark ground.
    ("font-family: Source Sans Pro;\n  color: rgba(0, 0, 0, 0.7);",
     "font-family: Source Sans Pro;\n  color: #e4e4e7;"),
    ("color: rgba(0, 0, 0, 0.54) !important;",
     "color: #b4b4bc !important;"),
    ("margin: 3px;\n  color: rgba(0, 0, 0, 0.6);",
     "margin: 3px;\n  color: #b4b4bc;"),
    ("&:hover {\n    background-color: #f8f8f8;\n    color: rgba(0, 0, 0, 0.8);\n  }",
     "&:hover {\n    background-color: #25262b;\n    color: #ffffff;\n  }"),

    # The "Curius" wordmark: black ink -> body text.
    ("Qr=l.a.a`\n  color: black;\n  :hover {\n    color: black;",
     "Qr=l.a.a`\n  color: #e4e4e7;\n  :hover {\n    color: #ffffff;"),

    # Inline highlight wash on saved text. A 20%-opacity yellow reads as a
    # marker over white, but over a dark ground it just muddies the text.
    # Go opaque and put dark ink on it, preserving the "highlighter" reading.
    ("cs=l.a.div`\n  background-color: rgba(240, 230, 0, 0.2);\n  &:hover {\n    background-color: #ffe60099;\n  }",
     "cs=l.a.div`\n  background-color: rgba(240, 230, 0, 0.85);\n  color: #17180f;\n  &:hover {\n    background-color: rgba(240, 230, 0, 1);\n  }"),
]


def retheme(name: str) -> bool:
    """Rewrite one bundle from its pristine copy. Returns False on failure."""
    src = HERE / f"{name}.js.orig"
    dst = HERE / "fork" / "dist" / f"{name}.js"

    if not src.exists():
        print(f"error: pristine bundle not found at {src}", file=sys.stderr)
        return False

    js = src.read_text(encoding="utf-8", errors="surrogateescape")
    original_len = len(js)
    counts: dict[str, int] = {}

    # Exact-block substitutions run FIRST, since they quote original color
    # values that the hex map would otherwise rewrite out from underneath.
    # RAW is newtab-specific; PALETTE is shared by every bundle.
    # options.js carries no palette or colors of its own -- it is styled
    # entirely by options.html -- so don't warn about missing tokens there.
    has_palette = "selfHighlightColor" in js

    exact = (PALETTE if has_palette else []) + (RAW if name == "newtab" else [])
    for old, new in exact:
        n = js.count(old)
        if n:
            js = js.replace(old, new)
            counts[old.splitlines()[0][:58]] = n
        else:
            print(f"  WARN [{name}]: no match -> {old.splitlines()[0][:58]}",
                  file=sys.stderr)

    # POPUP components appear in some bundles but not others, so a miss here
    # is expected rather than a problem worth warning about.
    for old, new in POPUP + OVERLAY:
        n = js.count(old)
        if n:
            js = js.replace(old, new)
            counts[old.splitlines()[0][:58]] = n

    # Body ink in any spacing form.
    js, n = INK_RE.subn(INK, js)
    if n:
        counts["rgb(33, 37, 41) [body ink]"] = n

    # Icon hover states, so hovering still brightens rather than dims.
    for rx, repl in HOVER_RE:
        js, n = rx.subn(repl, js)
        if n:
            counts[f"{rx.pattern} [hover]"] = n

    # Hex substitutions are word-boundary aware so #eee doesn't match inside
    # #eeeeee, and longer literals are replaced before their prefixes.
    for old in sorted(SUBS, key=len, reverse=True):
        new = SUBS[old]
        pattern = re.escape(old) + r"(?![0-9a-fA-F])"
        js, n = re.subn(pattern, new, js)
        if n:
            counts[old] = n

    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(js, encoding="utf-8", errors="surrogateescape")

    total = sum(counts.values())
    print(f"{name}.js: {total} substitutions  "
          f"({original_len} -> {len(js)} bytes)")
    return True


def main() -> int:
    ok = True
    for name in BUNDLES:
        if not retheme(name):
            ok = False
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
