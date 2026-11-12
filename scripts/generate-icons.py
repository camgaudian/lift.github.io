"""Generate Lift's app icons from the modular LIFT mark.

Geometry mirrors src/lib/brandMark.ts (keep in sync). Requires Pillow.
Run from the repo root:  python scripts/generate-icons.py
"""

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

PUBLIC = Path(__file__).resolve().parent.parent / "public"
SS = 4  # supersampling factor

BG = ("#ffffff", "#ededf0")
DEEP = ("#0a7cf5", "#0550b4")
SOFT = ("#7cc4ff", "#3d9dff")


def rr(x, y, w, h, r):
    return (x, y, w, h, r)


WORD_DEEP = [
    rr(160, 330, 100, 360, (34, 34, 0, 96)),
    rr(160, 590, 270, 100, (0, 34, 34, 96)),
    rr(452, 447, 100, 243, (34, 0, 34, 34)),
    rr(452, 447, 168, 85, (34, 34, 30, 0)),
    rr(713, 447, 100, 243, (34, 34, 34, 34)),
]
WORD_SOFT = [
    rr(330, 330, 100, 238, (64, 22, 22, 22)),
    rr(452, 330, 180, 95, (60, 16, 60, 16)),
    rr(654, 330, 218, 95, (60, 16, 60, 16)),
]
MONO_DEEP = [rr(300, 250, 150, 524, (50, 50, 0, 140)), rr(300, 624, 424, 150, (0, 50, 50, 140))]
MONO_SOFT = [rr(482, 250, 242, 342, (120, 30, 30, 30))]


def quad(p0, p1, p2, n=24):
    return [
        ((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
         (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1])
        for t in (i / n for i in range(n + 1))
    ]


def rr_points(x, y, w, h, r):
    a, b, c, d = r
    pts = [(x + a, y), (x + w - b, y)]
    pts += quad((x + w - b, y), (x + w, y), (x + w, y + b))
    pts += [(x + w, y + h - c)]
    pts += quad((x + w, y + h - c), (x + w, y + h), (x + w - c, y + h))
    pts += [(x + d, y + h)]
    pts += quad((x + d, y + h), (x, y + h), (x, y + h - d))
    pts += [(x, y + a)]
    pts += quad((x, y + a), (x, y), (x + a, y))
    return pts


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def vgradient(size, top, bottom, y0=0, y1=None):
    w, h = size
    y1 = h if y1 is None else y1
    t, b = hex_rgb(top), hex_rgb(bottom)
    col = Image.new("RGBA", (1, h))
    for y in range(h):
        k = min(1, max(0, (y - y0) / max(1, y1 - y0)))
        col.putpixel((0, y), tuple(round(t[i] + (b[i] - t[i]) * k) for i in range(3)) + (255,))
    return col.resize((w, h))


def mask_for(shapes, px, scale, center_y):
    """Rasterize shapes (1024 canvas) into a mask of px×px, scaled about the canvas centre."""
    m = Image.new("L", (px, px), 0)
    d = ImageDraw.Draw(m)
    k = px / 1024
    for s in shapes:
        pts = [(((x - 512) * scale + 512) * k, ((y - center_y) * scale + 512) * k) for x, y in rr_points(*s)]
        d.polygon(pts, fill=255)
    return m


def render(size, deep, soft, scale, center_y, rounded=False, bg=BG, deep_c=DEEP, soft_c=SOFT, depth=True):
    px = size * SS
    canvas = vgradient((px, px), *bg) if bg else Image.new("RGBA", (px, px), (0, 0, 0, 0))
    k = px / 1024
    top, bot = (512 - 280 * scale) * k, (512 + 280 * scale) * k
    masks = [mask_for(shapes, px, scale, center_y) for shapes in (deep, soft)]

    if depth and bg:
        # Soft inner shading around the tile edge, like the previous trophy icon.
        blur = 40 * k
        pad = int(blur * 3)
        tile = Image.new("L", (px + 2 * pad, px + 2 * pad), 0)
        ImageDraw.Draw(tile).rectangle((pad, pad, pad + px - 1, pad + px - 1), fill=255)
        tile = tile.filter(ImageFilter.GaussianBlur(blur)).crop((pad, pad, pad + px, pad + px))
        edge = ImageChops.invert(tile).point(lambda v: int(v * 0.3))
        canvas.paste((0, 0, 0), (0, 0), edge)

        # Drop shadow under the letters.
        shadow = ImageChops.lighter(*masks) if soft else masks[0]
        shadow = shadow.transform(shadow.size, Image.AFFINE, (1, 0, 0, 0, 1, -16 * k * scale))
        shadow = shadow.filter(ImageFilter.GaussianBlur(11 * k * scale)).point(lambda v: int(v * 0.3))
        canvas.paste((0, 0, 0), (0, 0), shadow)

    for mask, cols in zip(masks, (deep_c, soft_c)):
        canvas.paste(vgradient((px, px), *cols, int(top), int(bot)), (0, 0), mask)
    if rounded:
        corner = Image.new("L", (px, px), 0)
        ImageDraw.Draw(corner).rounded_rectangle((0, 0, px - 1, px - 1), radius=int(228 * k), fill=255)
        canvas.putalpha(corner)
    return canvas.resize((size, size), Image.LANCZOS)


def svg_path(shapes):
    out = ""
    for x, y, w, h, (a, b, c, d) in shapes:
        out += (
            f"M{x + a} {y}H{x + w - b}Q{x + w} {y} {x + w} {y + b}V{y + h - c}"
            f"Q{x + w} {y + h} {x + w - c} {y + h}H{x + d}Q{x} {y + h} {x} {y + h - d}"
            f"V{y + a}Q{x} {y} {x + a} {y}Z"
        )
    return out


def write_favicon():
    """Monogram favicon: the full word is unreadable at 16-32px."""
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{BG[0]}"/><stop offset="1" stop-color="{BG[1]}"/></linearGradient>
    <linearGradient id="deep" gradientUnits="userSpaceOnUse" x1="0" y1="250" x2="0" y2="774"><stop offset="0" stop-color="{DEEP[0]}"/><stop offset="1" stop-color="{DEEP[1]}"/></linearGradient>
    <linearGradient id="soft" gradientUnits="userSpaceOnUse" x1="0" y1="250" x2="0" y2="774"><stop offset="0" stop-color="{SOFT[0]}"/><stop offset="1" stop-color="{SOFT[1]}"/></linearGradient>
    <filter id="edge" x="-20%" y="-20%" width="140%" height="140%">
      <feComponentTransfer in="SourceAlpha" result="inverse"><feFuncA type="table" tableValues="1 0"/></feComponentTransfer>
      <feGaussianBlur in="inverse" stdDeviation="40" result="blur"/>
      <feFlood flood-color="#000000" flood-opacity="0.3" result="color"/>
      <feComposite in="color" in2="blur" operator="in" result="shadow"/>
      <feComposite in="shadow" in2="SourceAlpha" operator="in" result="clipped"/>
      <feComposite in="SourceGraphic" in2="clipped" operator="over"/>
    </filter>
    <filter id="drop" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="20" stdDeviation="14" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <rect width="1024" height="1024" rx="228" fill="url(#bg)" filter="url(#edge)"/>
  <g filter="url(#drop)">
    <g transform="translate(512 512) scale(1.25) translate(-512 -512)">
      <path fill="url(#deep)" d="{svg_path(MONO_DEEP)}"/>
      <path fill="url(#soft)" d="{svg_path(MONO_SOFT)}"/>
    </g>
  </g>
</svg>
"""
    (PUBLIC / "favicon.svg").write_text(svg, encoding="utf-8")


def main():
    write_favicon()
    word = dict(deep=WORD_DEEP, soft=WORD_SOFT, center_y=510)
    render(512, scale=1.24, **word).save(PUBLIC / "icon-512.png")
    render(192, scale=1.24, **word).save(PUBLIC / "icon-192.png")
    render(180, scale=1.24, **word).save(PUBLIC / "apple-touch-icon.png")
    # Maskable: keep the mark inside the 80% safe circle.
    render(512, scale=0.98, **word).save(PUBLIC / "icon-512-maskable.png")
    # Notification badge: Android draws it as a white silhouette, so one flat colour on transparent.
    white = ("#ffffff", "#ffffff")
    render(96, MONO_DEEP + MONO_SOFT, [], scale=1.3, center_y=512, bg=None, deep_c=white, soft_c=white).save(
        PUBLIC / "badge-96.png"
    )
    print("Icons written to", PUBLIC)


if __name__ == "__main__":
    main()
