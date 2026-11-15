"""Atlas artwork for the jury deck: paper plates with real contour lines, the cartographic route map,
the exploded data-layer stack and transparent charts. Everything is drawn from the project's own rasters.
Run: python sunum/make_atlas.py   (after the engine dump; see sunum/README section in the repo README)."""
import json, os, math
import numpy as np, cv2
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager, rcParams
from PIL import Image, ImageDraw, ImageFont, ImageFilter
Image.MAX_IMAGE_PIXELS = None

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
OUT = os.path.join(HERE, "atlas"); os.makedirs(OUT, exist_ok=True)
FONTS = os.path.join(HERE, "fonts"); SC = os.path.join(ROOT, "data", "public", "scenes", "jezero")
D = json.load(open(os.path.join(HERE, "assets", "engine_dump.json"), encoding="utf-8"))
META = json.load(open(os.path.join(SC, "scene.json"), encoding="utf-8"))

PAPER, PAPER2 = (243, 234, 217), (229, 217, 195)
INK, UMBER, RUST = (38, 32, 28), (122, 92, 72), (196, 87, 42)
BLUE, GREEN, AMBER, MAG = (33, 102, 201), (31, 138, 104), (194, 130, 15), (201, 43, 115)
DARK = (23, 17, 13)
hx = lambda c: "#%02x%02x%02x" % c

def font(name, size, **axes):
    f = ImageFont.truetype(os.path.join(FONTS, name), size)
    try:
        ax = f.get_variation_axes(); vals = []
        for a in ax:
            nm = a["name"].decode() if isinstance(a["name"], bytes) else a["name"]
            key = {"Weight": "wght", "Optical Size": "opsz", "Softness": "SOFT", "Wonky": "WONK", "Width": "wdth"}.get(nm, nm)
            vals.append(axes.get(key, a["default"]))
        f.set_variation_by_axes(vals)
    except Exception:
        pass
    return f
MONO = lambda s, w=500: font("JetBrainsMono.ttf", s, wght=w)
NARROW = lambda s, w=600: font("ArchivoNarrow.ttf", s, wght=w)
SERIF = lambda s, w=500: font("Fraunces.ttf", s, wght=w, opsz=min(144, max(9, s)))

for fnt in ("JetBrainsMono.ttf", "ArchivoNarrow.ttf", "Fraunces.ttf"):
    font_manager.fontManager.addfont(os.path.join(FONTS, fnt))
rcParams.update({"font.family": "JetBrains Mono", "font.size": 12, "axes.edgecolor": hx(INK), "axes.labelcolor": hx(UMBER), "xtick.color": hx(UMBER), "ytick.color": hx(UMBER),
                 "text.color": hx(INK), "axes.spines.top": False, "axes.spines.right": False, "axes.linewidth": 1.1, "axes.grid": True, "grid.color": hx(UMBER), "grid.alpha": .18, "grid.linewidth": .7,
                 "figure.facecolor": "none", "axes.facecolor": "none", "savefig.facecolor": "none", "legend.frameon": False})
def save(fig, name, dpi=200): fig.savefig(os.path.join(OUT, name), dpi=dpi, bbox_inches="tight", pad_inches=0.12, transparent=True); plt.close(fig); print("saved", name)

# ----------------------------------------------------------------------------- rasters
W = H = 1200
Z = np.fromfile(os.path.join(SC, "elev.f32"), dtype="<f4").reshape(H, W)
Zs = cv2.GaussianBlur(Z, (0, 0), 2.2)
ch = lambda n: np.array(Image.open(os.path.join(SC, "ch", n + ".png")))
E, K, CLS, HYD = ch("E").astype(np.float32), ch("K").astype(np.float32), ch("CLS"), ch("H").astype(np.float32)
VETO = np.fromfile(os.path.join(OUT, "veto.bin"), dtype=np.uint8).reshape(H, W)
SAFE = np.fromfile(os.path.join(OUT, "S.bin"), dtype=np.uint8).reshape(H, W).astype(np.float32)
ORTHO = np.array(Image.open(os.path.join(SC, "base.jpg")).convert("L"))          # 3600 x 3600

def hillshade(z, az=315, alt=42, zf=2.2):
    gy, gx = np.gradient(z * zf); slope = np.pi / 2 - np.arctan(np.hypot(gx, gy)); asp = np.arctan2(-gx, gy)
    a, b = np.radians(360 - az + 90), np.radians(alt)
    return np.clip(np.sin(b) * np.sin(slope) + np.cos(b) * np.cos(slope) * np.cos(a - asp), 0, 1)
HS = hillshade(Zs)

def contours_rgba(z, size, color, minor=2.0, major=10.0, lw=(0.7, 1.5), alpha=(0.5, 0.9), labels=False):
    """Contour lines as an RGBA image of `size` (w, h) covering array z."""
    w, h = size; fig = plt.figure(figsize=(w / 200, h / 200), dpi=200); ax = fig.add_axes([0, 0, 1, 1]); ax.axis("off")
    lo, hi = math.floor(z.min() / major) * major, math.ceil(z.max() / major) * major
    ax.contour(z, levels=np.arange(lo, hi, minor), colors=[hx(color)], linewidths=lw[0], alpha=alpha[0], origin="upper", extent=(0, w, h, 0))
    cs = ax.contour(z, levels=np.arange(lo, hi, major), colors=[hx(color)], linewidths=lw[1], alpha=alpha[1], origin="upper", extent=(0, w, h, 0))
    if labels: ax.clabel(cs, fmt="%d", fontsize=7, inline=True, inline_spacing=2)
    ax.set_xlim(0, w); ax.set_ylim(h, 0)
    fig.canvas.draw(); buf = np.asarray(fig.canvas.buffer_rgba()).copy(); plt.close(fig)
    return Image.fromarray(buf).resize((w, h))

# ----------------------------------------------------------------------------- sheet furniture
BW, BH = 2880, 1620
def grain(base, amp=2.4, mottle=3.5, seed=1):
    rng = np.random.default_rng(seed)
    n = cv2.GaussianBlur(rng.normal(0, 1, (BH, BW)).astype(np.float32), (0, 0), 0.9) * amp
    m = cv2.GaussianBlur(rng.normal(0, 1, (BH // 8, BW // 8)).astype(np.float32), (0, 0), 9); m = cv2.resize(m, (BW, BH)) * mottle * 6
    img = np.clip(np.array(base, np.float32)[None, None, :] + (n + m)[..., None], 0, 255)
    return Image.fromarray(img.astype(np.uint8))

def frame(img, ink, alpha=255, labels=True):
    """Double neatline, graticule ticks, corner registration marks and real Jezero coordinates."""
    d = ImageDraw.Draw(img, "RGBA"); c = ink + (alpha,); c2 = ink + (int(alpha * .55),)
    m1, m2 = 54, 68
    d.rectangle([m1, m1, BW - m1, BH - m1], outline=c, width=4)
    d.rectangle([m2, m2, BW - m2, BH - m2], outline=c2, width=1)
    f = MONO(19, 500)
    lon0, lon1, lat0, lat1 = META["lon0"], META["lon1"], META["lat0"], META["lat1"]
    n = 24
    for i in range(1, n):
        x = m1 + (BW - 2 * m1) * i / n; L = 16 if i % 4 == 0 else 8
        d.line([x, m1, x, m1 - L], fill=c, width=2); d.line([x, BH - m1, x, BH - m1 + L], fill=c, width=2)
        if labels and i % 4 == 0 and i not in (12,):
            t = f"{lon0 + (lon1 - lon0) * i / n:.4f}°D"; d.text((x, m1 - 22), t, font=f, fill=c2, anchor="mb")
    n = 14
    for i in range(1, n):
        y = m1 + (BH - 2 * m1) * i / n; L = 16 if i % 2 == 0 else 8
        d.line([m1, y, m1 - L, y], fill=c, width=2); d.line([BW - m1, y, BW - m1 + L, y], fill=c, width=2)
    if labels:
        for i in (4, 10):
            y = m1 + (BH - 2 * m1) * i / 14; t = f"{lat1 - (lat1 - lat0) * i / 14:.4f}°K"
            tmp = Image.new("RGBA", (220, 30), (0, 0, 0, 0)); ImageDraw.Draw(tmp).text((110, 15), t, font=f, fill=c2, anchor="mm")
            tmp = tmp.rotate(90, expand=True); img.paste(tmp, (m1 - 46, int(y) - 110), tmp)
    for cx, cy in ((m1 - 26, m1 - 26), (BW - m1 + 26, m1 - 26), (m1 - 26, BH - m1 + 26), (BW - m1 + 26, BH - m1 + 26)):
        d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], outline=c2, width=2); d.line([cx - 15, cy, cx + 15, cy], fill=c2, width=2); d.line([cx, cy - 15, cx, cy + 15], fill=c2, width=2)
    return img

def paper_plate(name, crop, mask_fn, seed, strength=0.42, dark=False):
    base, ink = (DARK, PAPER) if dark else (PAPER, UMBER)
    img = grain(base, amp=2.0 if dark else 2.4, mottle=2.2 if dark else 3.5, seed=seed).convert("RGBA")
    y0, y1, x0, x1 = crop
    cont = contours_rgba(Zs[y0:y1, x0:x1], (BW, BH), ink, minor=1.0, major=5.0, lw=(0.8, 1.6), alpha=(1, 1))
    a = np.array(cont, np.float32); yy, xx = np.mgrid[0:BH, 0:BW]
    a[..., 3] *= strength * mask_fn(xx / BW, yy / BH)
    img = Image.alpha_composite(img, Image.fromarray(a.astype(np.uint8)))
    img = frame(img, PAPER if dark else INK, alpha=150 if dark else 235)
    img.convert("RGB").save(os.path.join(OUT, name), quality=90); print("saved", name)

sm = lambda t: np.clip(t, 0, 1) ** 2 * (3 - 2 * np.clip(t, 0, 1))
paper_plate("bg_paper_a.jpg", (60, 735, 0, 1200), lambda x, y: 0.25 + 0.75 * sm((x - 0.45) / 0.5), 1)                 # contours gather on the right
paper_plate("bg_paper_b.jpg", (420, 1095, 0, 1200), lambda x, y: 0.2 + 0.8 * sm((y - 0.4) / 0.55), 2)                # ... along the bottom
paper_plate("bg_paper_c.jpg", (200, 875, 0, 1200), lambda x, y: 0.22 + 0.5 * sm((0.5 - x) / 0.5) * sm((y - 0.3) / 0.6), 3)  # quiet, lower left
paper_plate("bg_dark_a.jpg", (0, 675, 0, 1200), lambda x, y: 0.35 + 0.65 * sm((x - 0.4) / 0.55), 4, strength=0.26, dark=True)
paper_plate("bg_dark_b.jpg", (480, 1155, 0, 1200), lambda x, y: 0.3 + 0.7 * sm((y - 0.35) / 0.6), 5, strength=0.24, dark=True)

# regolith plate for the closing statement
img = grain((190, 120, 80), amp=3.0, mottle=3.0, seed=7).convert("RGBA")
cont = np.array(contours_rgba(Zs[100:775, 0:1200], (BW, BH), INK, minor=1.0, major=5.0, lw=(0.8, 1.7), alpha=(1, 1)), np.float32); cont[..., 3] *= 0.22
img = frame(Image.alpha_composite(img, Image.fromarray(cont.astype(np.uint8))), INK, alpha=235)
img.convert("RGB").save(os.path.join(OUT, "bg_regolith.jpg"), quality=90); print("saved bg_regolith.jpg")

# ----------------------------------------------------------------------------- cover hero: duotone ortho + contours
def duotone(gray, stops):
    g = gray.astype(np.float32) / 255; out = np.zeros(gray.shape + (3,), np.float32); xs = np.linspace(0, 1, len(stops))
    for c in range(3): out[..., c] = np.interp(g, xs, [s[c] for s in stops])
    return out
y0 = 300; crop = ORTHO[y0:y0 + 2025, :]                                              # 3600 x 2025 (16:9)
hero = duotone(cv2.resize(crop, (BW, BH), interpolation=cv2.INTER_AREA), [(126, 80, 56), (198, 152, 116), (234, 218, 194), (251, 248, 241)])
yy, xx = np.mgrid[0:BH, 0:BW]
vig = 1 - 0.35 * sm((np.hypot((xx - BW * .66) / BW, (yy - BH * .45) / BH) - 0.25) / 0.6); left = 1 - 0.93 * sm((0.60 - xx / BW) / 0.52)
mk = (vig * left)[..., None]; hero = hero * mk + np.array(PAPER, np.float32)[None, None, :] * (1 - mk)
heroI = Image.fromarray(np.clip(hero, 0, 255).astype(np.uint8)).convert("RGBA")
zc = Zs[y0 // 3:(y0 + 2025) // 3, :]
cont = np.array(contours_rgba(zc, (BW, BH), UMBER, minor=2.0, major=10.0, lw=(0.6, 1.5), alpha=(1, 1)), np.float32); cont[..., 3] *= 0.50
heroI = frame(Image.alpha_composite(heroI, Image.fromarray(cont.astype(np.uint8))), INK, alpha=235)
heroI.convert("RGB").save(os.path.join(OUT, "hero_cover.jpg"), quality=90); print("saved hero_cover.jpg")

# ----------------------------------------------------------------------------- cartographic route map
MS = 2000; k = MS / W
relief = cv2.resize(HS, (MS, MS), interpolation=cv2.INTER_CUBIC); ort = cv2.resize(ORTHO, (MS, MS), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
tone = 0.50 + 0.38 * relief + 0.22 * (ort - ort.mean())
mp = np.clip(np.array(PAPER, np.float32)[None, None, :] * np.clip(tone, 0.35, 1.08)[..., None], 0, 255)
# sand ripples: cool tint; bedrock: warm light tint
cls_big = cv2.resize(CLS, (MS, MS), interpolation=cv2.INTER_NEAREST)
mp[cls_big == 4] = mp[cls_big == 4] * 0.72 + np.array((150, 180, 190), np.float32) * 0.28
mp[cls_big == 1] = mp[cls_big == 1] * 0.82 + np.array((250, 240, 220), np.float32) * 0.18
mapI = Image.fromarray(mp.astype(np.uint8)).convert("RGBA")
# veto hatch
vb = cv2.resize(VETO, (MS, MS), interpolation=cv2.INTER_NEAREST) > 0
yy, xx = np.mgrid[0:MS, 0:MS]; hat = ((xx + yy) % 14 < 3) & vb
ov = np.zeros((MS, MS, 4), np.uint8); ov[hat] = MAG + (190,); ov[vb & ~hat] = MAG + (28,)
mapI = Image.alpha_composite(mapI, Image.fromarray(ov))
mapI = Image.alpha_composite(mapI, contours_rgba(Zs, (MS, MS), UMBER, minor=2.0, major=10.0, lw=(0.5, 1.25), alpha=(0.45, 0.9), labels=True))
d = ImageDraw.Draw(mapI, "RGBA")
# Perseverance track
rov = json.load(open(os.path.join(SC, "rover.json"), encoding="utf-8"))
for seg in rov["traverse"]:
    pts = [(x * k, y * k) for x, y in seg]
    for i in range(0, len(pts) - 1, 6): d.line(pts[i:i + 3], fill=UMBER + (230,), width=3)
A = D["nominal"]["routes"][0]; B = D["nominal"]["routes"][1]
pa = [(p["x"] * k, p["y"] * k) for p in A["points"]]; pb = [(p["x"] * k, p["y"] * k) for p in B["points"]]
for i in range(0, len(pb) - 1, 5): d.line(pb[i:i + 3], fill=INK + (235,), width=4)                # B: dashed ink
d.line(pa, fill=PAPER + (255,), width=17, joint="curve"); d.line(pa, fill=RUST + (255,), width=9, joint="curve")
# direction arrows on A
acc = 0; nxt = 120
for i in range(4, len(A["points"])):
    if A["points"][i]["d"] < nxt: continue
    nxt += 260; (x0, y0_), (x1, y1) = pa[i - 4], pa[i]; ang = math.atan2(y1 - y0_, x1 - x0); s = 20
    tri = [(x1 + s * math.cos(ang), y1 + s * math.sin(ang)), (x1 + s * math.cos(ang + 2.5), y1 + s * math.sin(ang + 2.5)), (x1 + s * math.cos(ang - 2.5), y1 + s * math.sin(ang - 2.5))]
    d.polygon(tri, fill=INK + (255,), outline=PAPER + (255,))
# waiting points, base, rover, POIs
for h in D["havens"]:
    if h["id"] in ("BASE", "ROVER"): continue
    x, y = h["x"] * k, h["y"] * k; d.rectangle([x - 15, y - 15, x + 15, y + 15], fill=PAPER + (255,), outline=GREEN + (255,), width=5); d.text((x, y), h["id"], font=MONO(15, 700), fill=INK, anchor="mm")
bx, by = D["base"]["x"] * k, D["base"]["y"] * k
d.polygon([(bx, by - 24), (bx + 24, by), (bx, by + 24), (bx - 24, by)], fill=INK + (255,), outline=PAPER + (255,))
d.text((bx + 34, by + 26), "HABİTAT", font=NARROW(30, 700), fill=INK, anchor="lm", stroke_width=5, stroke_fill=PAPER)
order = A["order"]; names = {"TF": "Three Forks deposu", "SCARP": "Delta önü yarı", "ROCKS": "Kaya tarlası", "RIPPLE": "Dalga alanı", "CRATER": "Küçük krater"}
for p in D["pois"]:
    x, y = p["x"] * k, p["y"] * k; n = order.index(p["id"]) + 1 if p["id"] in order else 0
    d.ellipse([x - 26, y - 26, x + 26, y + 26], fill=PAPER + (255,), outline=BLUE + (255,), width=6)
    d.text((x, y), str(n), font=MONO(28, 700), fill=BLUE, anchor="mm")
    right = x < MS * 0.72
    d.text((x + (38 if right else -38), y - 30), names.get(p["id"], p["id"]), font=NARROW(31, 600), fill=INK, anchor="lm" if right else "rm", stroke_width=5, stroke_fill=PAPER)
# scale bar + north arrow (bottom-left)
m_per_px = META["cell_dx"] / k; x0, yb = 80, MS - 90
for i in range(4):
    x = x0 + i * 50 / m_per_px; d.rectangle([x, yb, x + 50 / m_per_px, yb + 16], fill=(INK if i % 2 == 0 else PAPER) + (255,), outline=INK + (255,), width=2)
for i, t in enumerate(("0", "50", "100", "150", "200 m")): d.text((x0 + i * 50 / m_per_px, yb + 24), t, font=MONO(22, 500), fill=INK, anchor="ma", stroke_width=4, stroke_fill=PAPER)
nx, ny = MS - 110, MS - 150
d.polygon([(nx, ny - 60), (nx + 22, ny + 20), (nx, ny + 4), (nx - 22, ny + 20)], fill=INK + (255,), outline=PAPER + (255,)); d.text((nx, ny + 30), "K", font=SERIF(40, 600), fill=INK, anchor="ma", stroke_width=5, stroke_fill=PAPER)
d.rectangle([0, 0, MS - 1, MS - 1], outline=INK + (255,), width=6)
mapI.convert("RGB").save(os.path.join(OUT, "route_map.jpg"), quality=90); print("saved route_map.jpg")

# ----------------------------------------------------------------------------- exploded layer stack (real rasters)
def colorize(a, stops, lo=None, hi=None):
    lo = np.percentile(a, 2) if lo is None else lo; hi = np.percentile(a, 98) if hi is None else hi
    t = np.clip((a - lo) / (hi - lo + 1e-9), 0, 1); xs = np.linspace(0, 1, len(stops)); out = np.zeros(a.shape + (3,), np.float32)
    for c in range(3): out[..., c] = np.interp(t, xs, [s[c] for s in stops])
    return out.astype(np.uint8)
L = 640
ortS = cv2.resize(ORTHO, (L, L), interpolation=cv2.INTER_AREA)
clsP = np.array([PAPER2, (250, 244, 230), (120, 150, 200), (60, 80, 150), (120, 190, 170), MAG], np.uint8)[cv2.resize(CLS, (L, L), interpolation=cv2.INTER_NEAREST)]
layers = [
    ("optik", duotone(ortS, [(40, 26, 18), (150, 96, 62), (238, 220, 190)]).astype(np.uint8)),
    ("topo", colorize(cv2.resize(E, (L, L)), [PAPER, (220, 170, 120), RUST, (90, 30, 20)], 0, 28)),
    ("spektral", colorize(cv2.resize(HYD, (L, L), interpolation=cv2.INTER_CUBIC), [PAPER2, (170, 200, 225), BLUE], 20, 80)),
    ("sinif", clsP),
    ("guvenlik", colorize(cv2.resize(SAFE, (L, L)), [MAG, (220, 170, 60), (90, 170, 130), GREEN], 20, 95)),
]
sx, sy, off = 0.74, 0.235, 196
TW, TH = int(L * sx * 2), int(L * sy * 2); CW, CH = TW + 60, TH + off * (len(layers) - 1) + 90
canvas = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
for i, (nm, im) in enumerate(layers):
    src = np.float32([[0, 0], [L, 0], [0, L]]); oy = CH - TH - 50 - i * off; ox = 30
    dst = np.float32([[ox + TW / 2, oy], [ox + TW, oy + TH / 2], [ox, oy + TH / 2]])
    M = cv2.getAffineTransform(src, dst)
    rgba = np.dstack([im, np.full((L, L), 255, np.uint8)])
    warped = cv2.warpAffine(rgba, M, (CW, CH), flags=cv2.INTER_AREA, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    quad = [(ox + TW / 2, oy), (ox + TW, oy + TH / 2), (ox + TW / 2, oy + TH), (ox, oy + TH / 2)]
    sh = Image.new("RGBA", (CW, CH), (0, 0, 0, 0)); ImageDraw.Draw(sh).polygon([(x + 6, y + 22) for x, y in quad], fill=INK + (70,))
    canvas = Image.alpha_composite(canvas, sh.filter(ImageFilter.GaussianBlur(10)))
    canvas = Image.alpha_composite(canvas, Image.fromarray(warped))
    ImageDraw.Draw(canvas).line(quad + [quad[0]], fill=INK + (255,), width=3)
canvas.save(os.path.join(OUT, "layer_stack.png")); print("saved layer_stack.png", canvas.size)

# ----------------------------------------------------------------------------- charts (transparent, atlas ink)
pts = A["points"]; dist = np.array([p["d"] for p in pts]); o2 = 0.72 - np.array([p["o2"] for p in pts]); ret = np.array([p["ret"] if p["ret"] is not None else np.nan for p in pts]) * 1.2
z = np.array([p["z"] for p in pts]); S_ = np.array([p["S"] for p in pts]); cls = np.array([p["cls"] for p in pts]); slp = np.array([p["slope"] for p in pts]); shel = np.array([p["sh"] if p["sh"] is not None else np.nan for p in pts])
leg_ends = np.cumsum([l["distM"] for l in A["legs"]]); leg_names = [names.get(l["to"], "Habitat") for l in A["legs"]]

fig, ax = plt.subplots(figsize=(12.5, 4.3))
ax.fill_between(dist, ret * 1000, o2 * 1000, color=hx(GREEN), alpha=.16, lw=0)
ax.plot(dist, o2 * 1000, color=hx(INK), lw=2.4); ax.plot(dist, ret * 1000, color=hx(MAG), lw=1.8, ls=(0, (5, 3)))
i = int(np.nanargmin(o2 - ret)); ax.plot([dist[i], dist[i]], [ret[i] * 1000, o2[i] * 1000], color=hx(GREEN), lw=2.5)
ax.scatter([dist[i]] * 2, [ret[i] * 1000, o2[i] * 1000], color=hx(GREEN), s=28, zorder=5)
for x in leg_ends[:-1]: ax.axvline(x, color=hx(BLUE), lw=.9, alpha=.55)
ax.set_xlabel("rota boyunca mesafe (m)"); ax.set_ylabel("oksijen (g)"); ax.set_ylim(0, 760); ax.set_xlim(0, dist[-1] * 1.005)
save(fig, "chart_o2.png")

cc = {0: PAPER2, 1: (250, 244, 230), 2: (120, 150, 200), 3: (60, 80, 150), 4: (120, 190, 170), 5: MAG}
fig, (a1, a2, a3) = plt.subplots(3, 1, figsize=(12.5, 6.2), sharex=True, gridspec_kw=dict(height_ratios=[3.2, 1, 1.1], hspace=.10))
zb = z.min() - 6
for j in range(len(dist) - 1): a1.fill_between(dist[j:j + 2], zb, z[j:j + 2], color=hx(cc[int(cls[j])]), lw=0)
a1.plot(dist, z, color=hx(INK), lw=2.2); a1.set_ylim(zb, z.max() + 9); a1.set_ylabel("yükseklik (m)"); a1.grid(axis="x", alpha=0)
for x in leg_ends[:-1]: a1.plot([x, x], [zb, np.interp(x, dist, z) + 5], color=hx(BLUE), lw=1.1); a1.scatter([x], [np.interp(x, dist, z) + 5], s=46, color=hx(PAPER), edgecolor=hx(BLUE), lw=2, zorder=5)
a2.bar(dist, slp, width=np.gradient(dist), color=[hx(MAG) if s > 20 else hx(RUST) if s > 12 else hx(UMBER) for s in slp], lw=0); a2.set_ylabel("eğim °", fontsize=10); a2.set_ylim(0, 26); a2.axhline(25, color=hx(MAG), lw=1, ls=":")
a3.plot(dist, shel, color=hx(GREEN), lw=2.2); a3.fill_between(dist, 0, shel, color=hx(GREEN), alpha=.12, lw=0); a3.set_ylabel("sığınak dk", fontsize=10); a3.set_xlabel("rota boyunca mesafe (m)"); a3.set_ylim(0, 30); a3.set_xlim(0, dist[-1] * 1.005)
fig.align_ylabels(); save(fig, "chart_kesit.png")

ks = np.linspace(.01, .5, 200); q = 1.79 + .152 / ks; F = lambda Dm: ks * np.exp(-q * Dm)
fig, ax = plt.subplots(figsize=(7.4, 4.5))
ax.plot(ks * 100, (F(.10) - F(.30)) * 100, color=hx(AMBER), lw=2.6); ax.plot(ks * 100, F(.30) * 100, color=hx(MAG), lw=2.6); ax.plot(ks * 100, F(1.0) * 100, color=hx(BLUE), lw=2.2, ls=(0, (5, 3)))
for kx in (5, 10, 20, 40): ax.axvline(kx, color=hx(UMBER), lw=.8, ls=":")
ax.set_xlabel("toplam kaya bolluğu k (%)"); ax.set_ylabel("alan payı (%)"); ax.set_ylim(0, 26); ax.set_xlim(0, 50)
save(fig, "chart_golombek.png")

nv = json.load(open(os.path.join(HERE, "assets", "navcam_validation.json")))
fig, ax = plt.subplots(figsize=(8.6, 4.4)); x = np.arange(len(nv))
ax.bar(x - .19, [r["k_orbit"] for r in nv], .36, color=hx(BLUE)); ax.bar(x + .19, [r["ground_idx"] for r in nv], .36, yerr=[r["ground_sd"] for r in nv], color=hx(RUST), capsize=4, error_kw=dict(ecolor=hx(INK), lw=1.2))
ax.set_xticks(x); ax.set_xticklabels([f"{names.get(r['poi'], r['poi'])}\nsol {r['sol']}" for r in nv]); ax.grid(axis="x", alpha=0); ax.set_ylim(0, 14); ax.set_ylabel("%")
save(fig, "chart_dogrulama.png")

fig, ax = plt.subplots(figsize=(6.2, 3.3)); hh, ee = np.histogram(E, bins=np.arange(0, 41, 1)); hh = hh / hh.sum() * 100
ax.bar(ee[:-1] + .5, hh, width=.92, color=[hx(MAG) if e >= 25 else hx(RUST) if e >= 15 else hx(UMBER) for e in ee[:-1]]); ax.set_xlabel("eğim (°)"); ax.set_ylabel("hücre payı (%)"); ax.set_xlim(0, 40)
save(fig, "chart_egim.png")
fig, ax = plt.subplots(figsize=(6.2, 3.3)); hh, ee = np.histogram(K, bins=np.arange(0, 31, 1)); hh = hh / hh.sum() * 100
ax.bar(ee[:-1] + .5, hh, width=.92, color=[hx(MAG) if e >= 25 else hx(BLUE) if e >= 10 else hx(UMBER) for e in ee[:-1]]); ax.set_xlabel("kaya bolluğu k (%)"); ax.set_ylabel("hücre payı (%)"); ax.set_xlim(0, 30)
save(fig, "chart_kaya_hist.png")

stats = dict(cells=int(W * H), slope_p50=float(np.percentile(E, 50)), slope_p90=float(np.percentile(E, 90)), slope_p99=float(np.percentile(E, 99)),
             relief=float(Z.max() - Z.min()), k_p50=float(np.percentile(K, 50)), k_p90=float(np.percentile(K, 90)), veto=float(VETO.mean() * 100),
             nolos=float(100 - np.fromfile(os.path.join(OUT, "comm.bin"), dtype=np.uint8).mean() * 100), cls=[float((CLS == i).mean() * 100) for i in range(6)])
json.dump(stats, open(os.path.join(OUT, "stats.json"), "w"), indent=1); print(stats)
