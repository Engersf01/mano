#!/usr/bin/env python3
"""
Build the favicon set and the social preview card from the NeumoMeet artwork.

Everything here is derived, never drawn by hand, so re-running it after the
brand files change is the whole update. Three things make the generated files
different from a plain resize of the supplied art:

1. **A white plate under every icon.** The mark is a transparent PNG whose
   stethoscope, tubing and ground shadow are near-black — drawn for the white
   page the hub actually is. Left transparent, those parts vanish against a
   dark browser tab, and iOS composites an apple-touch-icon onto black no
   matter what, which would eat half the graphic. A white square is also what
   the artwork was designed to sit on, so nothing about it is a compromise.

2. **The ground shadow is cropped off the icons.** The mark ends in a thin
   dark arc under the lungs. At 16 px that arc is a single muddy row that
   reads as a smudge, and it costs the lungs — the only recognisable part at
   that size — a tenth of the height. Every icon is cropped the same way, so
   the set stays one shape across all of its resolutions.

3. **The preview card uses the full lockup, not the mark.** A social card is
   read at a glance in a feed, and the stacked lockup already carries the
   wordmark, the year and the tagline as artwork — setting that type again in
   whatever font happens to be installed would be both redundant and worse.

Usage:  python3 scripts/brand-icons.py
"""
from pathlib import Path

import numpy as np
from PIL import Image

MARK = Path("public/brand/neumomeet-mark.png")
LOCKUP = Path("public/brand/neumomeet.png")

ICONS = Path("public/icons")
FAVICON = Path("public/favicon.ico")
PREVIEW = Path("public/og/neumomeet.png")

WHITE = (255, 255, 255, 255)

# Sampled from the wordmark's own gradient, so the accent cannot drift away
# from the artwork it sits under.
BLUE = (1, 86, 203)
MAGENTA = (210, 16, 100)

# `.ico` carries several resolutions in one file; these are the three every
# desktop browser and bookmark bar actually asks for.
ICO_SIZES = (16, 32, 48)

# Android applies its own shape to a `maskable` icon and may clip anything
# outside the inner 80% circle, so that variant is drawn smaller on its plate.
MASKABLE_SAFE = 0.72


def trimmed(path: Path) -> Image.Image:
    """The artwork with its transparent margin removed."""
    art = Image.open(path).convert("RGBA")
    return art.crop(art.getbbox())


def lungs_only(mark: Image.Image) -> Image.Image:
    """The mark with the ground shadow under the lungs cropped away.

    The arc is separated from the lungs by a band of near-empty rows, so it is
    found rather than hard-coded: it is the last run of well-covered rows in
    the file, and the cut goes at the top of the gap above it. If the artwork
    ever loses the arc, there is no such run low down and the mark comes back
    untouched.
    """
    coverage = (np.array(mark)[..., 3] > 30).sum(1)
    covered = coverage > coverage.max() * 0.4

    last = int(np.flatnonzero(covered)[-1])
    start = last
    while start > 0 and covered[start - 1]:
        start -= 1  # to the top of the arc
    cut = start
    while cut > 0 and not covered[cut - 1]:
        cut -= 1  # to the top of the gap above it

    if cut == start or cut < mark.height * 0.6:
        return mark
    return mark.crop((0, 0, mark.width, cut))


def plate(art: Image.Image, size: int, fill: float) -> Image.Image:
    """`art` centred on an opaque white square of `size`, covering `fill` of it.

    The art is fitted by whichever side is tighter, so a wide graphic keeps its
    proportions and gains the extra room as vertical margin.
    """
    scale = min(size * fill / art.width, size * fill / art.height)
    # Supersample: a single LANCZOS step straight to 16 px loses the bronchial
    # tree, which is what makes the graphic legible at all once it is small.
    big = art.resize((round(art.width * scale * 4), round(art.height * scale * 4)), Image.LANCZOS)
    small = big.resize((round(art.width * scale), round(art.height * scale)), Image.LANCZOS)

    out = Image.new("RGBA", (size, size), WHITE)
    out.alpha_composite(small, ((size - small.width) // 2, (size - small.height) // 2))
    return out


def preview(lockup: Image.Image, width: int = 1200, height: int = 630) -> Image.Image:
    """The 1200x630 card: the lockup on white, over a brand-coloured edge."""
    card = Image.new("RGBA", (width, height), WHITE)

    # A horizontal blue-to-magenta bar along the bottom edge, taken straight
    # from the wordmark. It gives the card a border on the one side where the
    # lockup leaves the most room, and it is what survives being shown as a
    # 200 px thumbnail in a chat preview.
    bar = 14
    ramp = np.linspace(0, 1, width)[None, :, None]
    gradient = np.array(BLUE)[None, None, :] * (1 - ramp) + np.array(MAGENTA)[None, None, :] * ramp
    strip = np.repeat(gradient.astype(np.uint8), bar, axis=0)
    card.paste(Image.fromarray(strip, "RGB"), (0, height - bar))

    # Sized from the tagline, the smallest thing on the card that has to stay
    # readable; the rest of the frame is deliberately left as white space.
    art_height = height - bar - 90
    scale = art_height / lockup.height
    art = lockup.resize((round(lockup.width * scale), art_height), Image.LANCZOS)
    card.alpha_composite(art, ((width - art.width) // 2, (height - bar - art.height) // 2))
    return card


def save(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(path, optimize=True)
    print(f"{path}  {path.stat().st_size / 1024:6.0f} KB  {image.width}x{image.height}")


def main() -> None:
    mark = lungs_only(trimmed(MARK))
    lockup = trimmed(LOCKUP)

    # 0.86 for the browser icons: enough margin that the graphic is not touching
    # the edge of a bookmark-bar tile, no more.
    save(plate(mark, 32, 0.86), ICONS / "icon-32.png")
    save(plate(mark, 192, 0.86), ICONS / "icon-192.png")
    save(plate(mark, 512, 0.86), ICONS / "icon-512.png")
    save(plate(mark, 512, MASKABLE_SAFE), ICONS / "icon-maskable-512.png")
    # 180 is the size current iOS asks for; older devices downscale it.
    save(plate(mark, 180, 0.86), ICONS / "apple-touch-icon.png")

    # Every `.ico` frame is rendered at its own size and handed over ready —
    # left to itself the encoder would downscale one bitmap to all three, and
    # a 48-to-16 step is exactly the one the bronchial tree does not survive.
    frames = {size: plate(mark, size, 0.86).convert("RGB") for size in ICO_SIZES}
    base = max(ICO_SIZES)
    FAVICON.parent.mkdir(parents=True, exist_ok=True)
    frames[base].save(
        FAVICON,
        sizes=[(s, s) for s in ICO_SIZES],
        append_images=[f for s, f in frames.items() if s != base],
    )
    print(f"{FAVICON}  {FAVICON.stat().st_size / 1024:6.0f} KB  {'/'.join(map(str, ICO_SIZES))}")

    save(preview(lockup), PREVIEW)


if __name__ == "__main__":
    main()
