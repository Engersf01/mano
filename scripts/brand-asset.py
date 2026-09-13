#!/usr/bin/env python3
"""
Build the panel's brand lockup from the supplied logo artwork.

Three things have to happen before the logo can go on a holographic panel, and
all three are mechanical, so they live here rather than in a one-off edit:

1. **Trim.** The artwork is a 3500x3500 square that is mostly empty. Layout
   percentages against that are meaningless, and the padding would push the
   lockup away from whichever corner it is anchored to.

2. **Knock the wordmark out to white.** "natalie" is set in near-black. On the
   black background the panel needs, it is invisible — the badge and the cyan
   rule would show and the name, the entire point of a lower-third, would not.
   Only the type *outside* the white badge is recoloured: the sketched star
   inside the badge is also dark, and inverting that would destroy it. The two
   are separated by filling the badge silhouette and asking which side of it
   each dark pixel is on. The cyan rule is left alone.

3. **Shrink.** 1.98 MB of PNG for an element that renders ~400 px wide is a
   slow first paint on conference wifi.

Usage:  python3 scripts/brand-asset.py
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation, binary_fill_holes

SOURCE = Path("public/brand/nxT Natalie -Logo.png")
OUTPUT = Path("public/brand/nxt-natalie.png")
WIDTH = 1400  # renders ~400 CSS px, so this stays crisp on a 3x panel

# A pixel belongs to the cyan rule if it is much more green/blue than red.
CYAN = lambda r, g, b: (g > 140) & (b > 140) & (r < 140)


def main() -> None:
    src = Image.open(SOURCE).convert("RGBA")
    art = src.crop(src.getbbox())

    a = np.array(art)
    r, g, b, alpha = (a[..., i].astype(int) for i in range(4))
    opaque = alpha > 100

    # The badge is the bright shape; fill it so the sketch inside counts as part
    # of it. Dilating first closes the gaps the antialiased edge leaves behind.
    badge = binary_fill_holes(binary_dilation(opaque & (r > 150) & (g > 150) & (b > 150), iterations=3))

    # Everything outside the badge that is not the cyan rule is the wordmark.
    # Alpha is untouched, so the glyph edges keep their antialiasing.
    wordmark = (alpha > 0) & ~badge & ~CYAN(r, g, b)
    a[..., 0][wordmark] = 255
    a[..., 1][wordmark] = 255
    a[..., 2][wordmark] = 255

    out = Image.fromarray(a, "RGBA").resize(
        (WIDTH, round(art.height * WIDTH / art.width)), Image.LANCZOS
    )
    # Palette mode: the art is a grey badge, black-turned-white type and one
    # cyan. 256 colours costs a max per-channel error of 20 on 0.2% of pixels
    # and takes the file from 1.98 MB to about 60 KB.
    out.quantize(colors=256, method=Image.FASTOCTREE).save(OUTPUT, optimize=True)

    print(f"{SOURCE}  {SOURCE.stat().st_size / 1e6:.2f} MB  {src.size[0]}x{src.size[1]}")
    print(f"{OUTPUT}  {OUTPUT.stat().st_size / 1024:.0f} KB  {out.size[0]}x{out.size[1]}")
    print(f"wordmark pixels recoloured: {int(wordmark.sum()):,}")


if __name__ == "__main__":
    main()
