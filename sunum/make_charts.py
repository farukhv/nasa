"""Charts and analysis figures for the jury deck. Mars-derived dark palette, 16:9-friendly sizes."""
import json, os, math
import numpy as np, cv2
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import rcParams
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "sunum", "assets"); os.makedirs(OUT, exist_ok=True)
D = json.load(open(os.path.join(OUT, "engine_dump.json"), encoding="utf-8"))

BG, BG2, INK, INK2 = "#0E1114", "#151A1F", "#E8E2D6", "#A3ABB2"
REG, DUST, BLUE, SAFE, CAUT, NOGO, WHITE = "#BE7850", "#D9A877", "#4C9BFF", "#5FE3B0", "#FFC23D", "#FF4FA8", "#F4F7F9"
rcParams.update({"figure.facecolor": BG, "axes.facecolor": BG, "savefig.facecolor": BG, "axes.edgecolor": "#2C363F", "axes.labelcolor": INK2,
                 "xtick.color": INK2, "ytick.color": INK2, "text.color": INK, "font.family": "DejaVu Sans", "font.size": 13,
                 "axes.spines.top": False, "axes.spines.right": False, "axes.grid": True, "grid.color": "#2C363F", "grid.alpha": .6, "axes.titleweight": "bold"})
def save(fig, name): fig.savefig(os.path.join(OUT, name), dpi=170, bbox_inches="tight", pad_inches=0.25); plt.close(fig); print("saved", name)

A = D["nominal"]["routes"][0]; B = D["nominal"]["routes"][1] if len(D["nominal"]["routes"]) > 1 else None; ST = D["nominal"]["straight"]
pts = A["points"]

# 1) terrain class share Jezero vs InSight
ins = json.load(open(os.path.join(ROOT, "data/public/scenes/insight/scene.json"), encoding="utf-8"))
cls_ins = np.array(Image.open(os.path.join(ROOT, "data/public/scenes/insight/ch/CLS.png"))); n = cls_ins.size
ins_share = [float((cls_ins == i).mean()) for i in range(6)]
names = ["Sıkı toprak", "Anakaya", "Kayalık", "Kaya tarlası", "Kum dalgası", "Krater kenarı"]; cols = [DUST, WHITE, BLUE, "#31446B", SAFE, NOGO]
fig, ax = plt.subplots(figsize=(12, 3.6))
for row, (lab, sh) in enumerate([("Jezero · Three Forks (1 m)", D["classShare"]), ("Elysium · InSight (0.29 m)", ins_share)]):
    left = 0
    for i, v in enumerate(sh):
        ax.barh(row, v * 100, left=left, color=cols[i], edgecolor=BG, height=.55)
        if v > .06: ax.text(left + v * 50, row, f"{v*100:.0f}%", ha="center", va="center", color=BG if cols[i] in (WHITE, DUST, SAFE) else INK, fontsize=12, fontweight="bold")
        left += v * 100
ax.set_yticks([0, 1]); ax.set_yticklabels(["Jezero · Three Forks", "Elysium · InSight"]); ax.set_xlim(0, 100); ax.set_xlabel("sahne alanı payı (%)"); ax.grid(axis="y", alpha=0)
ax.legend([plt.Rectangle((0, 0), 1, 1, color=c) for c in cols], names, ncol=6, loc="upper center", bbox_to_anchor=(.5, -.28), frameon=False, fontsize=11)
save(fig, "chart_class_share.png")

# 2) route comparison A / B / straight
fig, axs = plt.subplots(1, 4, figsize=(14, 3.8))
labels = ["A rota", "B planı", "Düz çizgi"]; colors = [WHITE, INK2, NOGO]
def bars(ax, vals, title, fmt="{:.0f}", ylim=None):
    b = ax.bar(labels, vals, color=colors, width=.6)
    for r, v in zip(b, vals): ax.text(r.get_x() + r.get_width() / 2, r.get_height(), fmt.format(v), ha="center", va="bottom", color=INK, fontsize=12, fontweight="bold")
    ax.set_title(title, loc="left", fontsize=13); ax.grid(axis="x", alpha=0)
    if ylim: ax.set_ylim(*ylim)
bars(axs[0], [A["totals"]["distM"], B["totals"]["distM"] if B else 0, ST["distM"]], "Mesafe (m)")
bars(axs[1], [0, 0, ST["vetoCells"]], "Geçilen yasak hücre")
bars(axs[2], [A["score"]["Smin"], B["score"]["Smin"] if B else 0, ST["minS"]], "En düşük güvenlik (0–100)", ylim=(0, 100))
bars(axs[3], [A["totals"]["o2Kg"] * 1000, B["totals"]["o2Kg"] * 1000 if B else 0, ST["o2Kg"] * 1000], "O₂ (g, duraklar dahil)")
save(fig, "chart_route_compare.png")

# 3) O2 profile along route A
d = np.array([p["d"] for p in pts]); o2 = .72 - np.array([p["o2"] for p in pts]); ret = np.array([p["ret"] if p["ret"] is not None else np.nan for p in pts]) * 1.2
fig, ax = plt.subplots(figsize=(13, 4.2))
ax.plot(d, o2 * 1000, color=WHITE, lw=2.2, label="O₂ kalan")
ax.plot(d, ret * 1000, color=NOGO, lw=1.8, ls="--", label="1.2 × dönüş O₂'si (walk-back eşiği)")
ax.fill_between(d, ret * 1000, o2 * 1000, where=o2 >= ret, color=SAFE, alpha=.18, label="marj")
i = int(np.nanargmin(o2 - ret)); ax.annotate(f"en dar marj +{(o2[i]-ret[i])*1000:.0f} g\n≈ {(o2[i]-ret[i])/0.09*60:.0f} dk · {d[i]:.0f} m", (d[i], o2[i] * 1000), xytext=(d[i] + 120, o2[i] * 1000 + 60), color=INK, arrowprops=dict(arrowstyle="-", color=INK2))
acc = 0
for lg in A["legs"]:
    acc += lg["distM"]; ax.axvline(acc, color=BLUE, alpha=.35, lw=1); ax.text(acc, 735, lg["to"] if lg["to"] != "BASE" else "HABİTAT", color=BLUE, fontsize=10, ha="right", rotation=90, va="top")
ax.set_xlabel("rota boyunca mesafe (m)"); ax.set_ylabel("oksijen (g)"); ax.set_ylim(0, 760); ax.legend(frameon=False, loc="lower left")
save(fig, "chart_o2_profile.png")

# 4) elevation + safety band + time to shelter
z = np.array([p["z"] for p in pts]); S = np.array([p["S"] for p in pts]); sh = np.array([p["sh"] if p["sh"] is not None else np.nan for p in pts])
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(13, 5), sharex=True, gridspec_kw=dict(height_ratios=[2, 1], hspace=.08))
ax1.fill_between(d, z.min() - 2, z, color="#6B4430", alpha=.7); ax1.plot(d, z, color=DUST, lw=1.5)
for k in range(len(d) - 1):
    ax1.plot(d[k:k + 2], [z.min() - 1.2] * 2, color=SAFE if S[k] >= 70 else CAUT if S[k] >= 50 else NOGO, lw=8, solid_capstyle="butt")
ax1.set_ylabel("yükseklik (m)"); ax1.set_ylim(z.min() - 3, z.max() + 3)
ax1.text(d[0], z.min() - 1.2, " güvenlik: yeşil ≥70 · sarı 50–70 · magenta <50", va="center", fontsize=10, color=INK2)
ax2.plot(d, sh, color=SAFE, lw=2); ax2.axhline(25, color=INK2, ls=":", lw=1); ax2.text(d[-1], 25.8, "25 dk hedef", ha="right", color=INK2, fontsize=10)
ax2.set_ylabel("sığınağa dk"); ax2.set_xlabel("mesafe (m)"); ax2.set_ylim(0, max(30, np.nanmax(sh) + 3))
save(fig, "chart_elev_safety.png")

# 5) EVA window
win = D["nominal"]["window"]; hrs = win["hours"]
fig, ax = plt.subplots(figsize=(13, 3.6))
for h in hrs:
    c = SAFE if h["score"] >= 70 else CAUT if h["score"] >= 45 else NOGO
    ax.bar(h["ltst"], max(0, h["score"]), width=.48, color=c, hatch="///" if h["dustDevil"] else None, edgecolor=BG)
ax.axvspan(11, 14, color=CAUT, alpha=.08); ax.text(12.5, 101, "toz şeytanı tepe penceresi 11–14", ha="center", color=CAUT, fontsize=11)
if win["recommendedStart"] is not None:
    dur = A["totals"]["tMin"] / 60; ax.axvspan(win["recommendedStart"], win["recommendedStart"] + dur, fill=False, edgecolor=WHITE, lw=2)
    ax.text(win["recommendedStart"] + dur / 2, 108, f"önerilen EVA: {int(win['recommendedStart'])}:{int((win['recommendedStart']%1)*60):02d} başla, {dur:.1f} saat", ha="center", color=WHITE, fontsize=12, fontweight="bold")
ax.set_xlim(5.5, 18.5); ax.set_ylim(0, 116); ax.set_xlabel("yerel güneş saati (LTST)"); ax.set_ylabel("saat uygunluk puanı"); ax.set_xticks(range(6, 19)); ax.grid(axis="x", alpha=0)
save(fig, "chart_eva_window.png")

# 6) scenarios
sc = [("Nominal", D["nominal"]), ("Giysi sızıntısı ×3", D["leak"]), ("Eş yaralı ×0.5 hız", D["injured"]), ("Toz τ=4", D["dust"]), ("SEP fırtınası", D["sep"])]
fig, axs = plt.subplots(1, 3, figsize=(14, 4), sharey=True)
names_s = [s[0] for s in sc]
mm = [s[1]["routes"][0]["minMargin"]["min"] if s[1]["routes"] else 0 for s in sc]
tt = [s[1]["routes"][0]["totals"]["tMin"] if s[1]["routes"] else 0 for s in sc]
kept = [len(s[1]["routes"][0]["order"]) if s[1]["routes"] else 0 for s in sc]
cc = [WHITE, CAUT, CAUT, CAUT, NOGO]
for ax, vals, title, fmt in zip(axs, [mm, tt, kept], ["En dar walk-back marjı (dk)", "Kalan süre (dk)", "Gezilen hedef sayısı"], ["{:.0f}", "{:.0f}", "{:d}"]):
    b = ax.barh(names_s, vals, color=cc, height=.6); ax.invert_yaxis(); ax.grid(axis="y", alpha=0)
    for r, v in zip(b, vals): ax.text(r.get_width(), r.get_y() + r.get_height() / 2, " " + fmt.format(v), va="center", color=INK, fontsize=12)
    ax.set_title(title, loc="left", fontsize=13)
save(fig, "chart_scenarios.png")

# 7) Golombek model
ks = np.linspace(.01, .5, 200); q = 1.79 + .152 / ks
F = lambda Dm: ks * np.exp(-q * Dm)
fig, ax = plt.subplots(figsize=(8.5, 5))
ax.plot(ks * 100, (F(.10) - F(.30)) * 100, color=CAUT, lw=2.5, label="takılma bandı 10–30 cm (alan payı)")
ax.plot(ks * 100, F(.30) * 100, color=NOGO, lw=2.5, label="≥ 30 cm basamak kayaları")
ax.plot(ks * 100, F(1.0) * 100, color=BLUE, lw=2, ls="--", label="≥ 1 m (HiRISE'ın görebildiği)")
for kx, pen in [(5, 15), (10, 30), (20, 55), (40, 85)]:
    ax.axvline(kx, color=INK2, lw=.8, ls=":"); ax.text(kx, 23.5, f"k=%{kx}\nceza {pen}", ha="center", fontsize=10, color=INK2)
ax.set_xlabel("toplam kaya bolluğu k (%)"); ax.set_ylabel("alan payı (%)"); ax.set_ylim(0, 26); ax.legend(frameon=False, fontsize=11, loc="center left", bbox_to_anchor=(.02, .62))
ax.set_title("Golombek & Rapp (1997): F(D) = k·exp[−q(k)·D]\nYörünge yalnız ≥1 m kayayı görür; yürüyen astronotu 10–30 cm bandı tehdit eder", loc="left", fontsize=13)
save(fig, "chart_golombek.png")

# 8) weights donuts (two separate images)
def donut(name, labels, vals, cols):
    fig, ax = plt.subplots(figsize=(7.4, 4.2))
    w, _ = ax.pie(vals, colors=cols, startangle=90, counterclock=False, wedgeprops=dict(width=.38, edgecolor=BG))
    ax.legend(w, [f"{l}  {v:.0%}" for l, v in zip(labels, vals)], loc="center left", bbox_to_anchor=(1.0, .5), frameon=False, fontsize=13)
    save(fig, name)
donut("chart_weights_safety.png", ["Kaya yoğunluğu K", "Eğim E", "Zemin direnci Z", "O₂ dönüş durumu", "Radyasyon R", "Sıcaklık T"], [.25, .20, .20, .15, .10, .10], [BLUE, DUST, REG, WHITE, NOGO, CAUT])
donut("chart_weights_science.png", ["Jeolojik maruziyet G", "Taze yüzey F", "Çeşitlilik D", "Hedef yakınlığı N", "Hidrasyon H (CRISM)"], [.30, .25, .20, .15, .10], [WHITE, BLUE, DUST, REG, SAFE])

# 9) performance
fig, ax = plt.subplots(figsize=(8.5, 3.8))
lab = ["İlk sürüm", "Önbellek + kovalı kuyruk", "Kaba ızgara sıralama\n(soğuk)", "Kaba ızgara sıralama\n(önbellekli)"]; v = [9.7, 5.1, 3.0, 2.0]
b = ax.bar(lab, v, color=[NOGO, CAUT, SAFE, SAFE], width=.6)
for r, x in zip(b, v): ax.text(r.get_x() + r.get_width() / 2, r.get_height(), f"{x:.1f} s", ha="center", va="bottom", color=INK, fontsize=13, fontweight="bold")
ax.set_ylabel("plan süresi (s)"); ax.grid(axis="x", alpha=0); save(fig, "chart_perf.png")

# 10) field stats + K histogram
fs = D["fieldStats"]; kh = np.array(D["kHist"])
fig, (a1, a2) = plt.subplots(1, 2, figsize=(13, 3.8), gridspec_kw=dict(width_ratios=[1, 1.4]))
vals = [fs["go"], fs["caution"], fs["nogo"], fs["veto"]]
b = a1.bar(["GO", "CAUTION", "NO-GO", "Veto"], [x * 100 for x in vals], color=[SAFE, CAUT, NOGO, "#8a2d5a"], width=.6)
for r, x in zip(b, vals): a1.text(r.get_x() + r.get_width() / 2, r.get_height(), f"{x*100:.1f}%", ha="center", va="bottom", color=INK, fontsize=12)
a1.set_title("Jezero hücrelerinin güvenlik dağılımı", loc="left", fontsize=13); a1.grid(axis="x", alpha=0)
a2.bar(np.arange(41), kh / kh.sum() * 100, color=BLUE, width=.9); a2.axvspan(10, 25, color=BLUE, alpha=.08); a2.axvspan(25, 40.5, color=NOGO, alpha=.1)
a2.text(17, a2.get_ylim()[1] * .9 if a2.get_ylim()[1] else 1, "kayalık\n(ceza 30–55)", ha="center", color=INK2, fontsize=10); a2.text(33, a2.get_ylim()[1] * .9 if a2.get_ylim()[1] else 1, "kaya tarlası\n(≥%25 veto bandı)", ha="center", color=INK2, fontsize=10)
a2.set_xlabel("kaya bolluğu k (%) — yörünge tespiti, yüzey sayımlarına ankrajlı"); a2.set_ylabel("hücre payı (%)"); a2.set_title("Kaya bolluğu histogramı (Jezero)", loc="left", fontsize=13)
save(fig, "chart_field_stats.png")

# 11/12) HiRISE analysis panels (separate images; captions live on the slide)
pal = np.array([[0, 0, 0], [232, 226, 214], [111, 163, 216], [49, 68, 160], [95, 227, 176], [255, 79, 168]], np.uint8)
def hirise_panels(scene, crop=None, kmax=25.0):
    base = cv2.imread(os.path.join(ROOT, f"data/public/scenes/{scene}/base.jpg"))[..., ::-1]
    m = json.load(open(os.path.join(ROOT, f"data/public/scenes/{scene}/scene.json"), encoding="utf-8")); ds = m["disp_scale"]
    CLS = np.array(Image.open(os.path.join(ROOT, f"data/public/scenes/{scene}/ch/CLS.png"))); K = np.array(Image.open(os.path.join(ROOT, f"data/public/scenes/{scene}/ch/K.png"))).astype(np.float32)
    size = (base.shape[1], base.shape[0])
    ov = cv2.resize(pal[CLS], size, interpolation=cv2.INTER_NEAREST)
    alpha = cv2.resize((CLS > 0).astype(np.float32), size, interpolation=cv2.INTER_NEAREST)[..., None] * .6
    cls_img = (base * (1 - alpha) + ov * alpha).astype(np.uint8)
    # rock abundance: colour only where above the scene background, cyan -> amber -> magenta
    t = np.clip((K - np.percentile(K, 30)) / (kmax - np.percentile(K, 30)), 0, 1); t = cv2.resize(t, size, interpolation=cv2.INTER_LINEAR)
    stops = np.array([[79, 216, 255], [255, 194, 61], [255, 79, 168]], np.float32)
    col = np.where(t[..., None] < .5, stops[0] + (stops[1] - stops[0]) * (t[..., None] / .5), stops[1] + (stops[2] - stops[1]) * ((t[..., None] - .5) / .5))
    a2 = (t[..., None] ** .7) * .75
    rock = (base * .75 * (1 - a2) + col * a2).astype(np.uint8).copy()
    for cx, cy, r in m["craters"]: cv2.circle(rock, (int(cx * ds), int(cy * ds)), max(4, int(r * ds)), (244, 247, 249), 2)
    out = {"raw": base, "cls": cls_img, "rock": rock}
    for k, im in out.items():
        if crop: x0, y0, x1, y1 = crop; im = im[y0:y1, x0:x1]
        Image.fromarray(im).save(os.path.join(OUT, f"hirise_{scene}_{k}.jpg"), quality=88); print("saved", f"hirise_{scene}_{k}.jpg", im.shape)
hirise_panels("jezero", crop=(900, 0, 3600, 2100), kmax=22)
hirise_panels("insight", kmax=22)

# 13) Navcam ground-truth validation
pov = json.load(open(os.path.join(ROOT, "data/public/scenes/jezero/rover_pov.json"), encoding="utf-8"))
Kj = np.array(Image.open(os.path.join(ROOT, "data/public/scenes/jezero/ch/K.png")))
rows = []
for pid, info in pov.items():
    wp = info["waypoint"]; kx, ky = int(wp["x"]), int(wp["y"]); kloc = float(Kj[max(0, ky - 8):ky + 8, max(0, kx - 8):kx + 8].mean())
    idxs = []
    for im in info["images"]:
        g = cv2.imread(os.path.join(ROOT, "data/public" + im["file"]), cv2.IMREAD_GRAYSCALE).astype(np.float32)
        h = g.shape[0]; ground = g[int(h * .55):, :]            # lower 45 % = near-field ground
        mu = cv2.blur(ground, (31, 31)); sd = np.sqrt(np.clip(cv2.blur(ground * ground, (31, 31)) - mu * mu, 0, None))
        rock = ((ground > mu + 1.4 * sd) | (ground < mu - 1.6 * sd)).mean()   # bright faces + shadows
        idxs.append(rock * 100)
    rows.append((pid, info["sol"], kloc, float(np.mean(idxs)), float(np.std(idxs)), info["images"][0]["file"]))
rows.sort(key=lambda r: r[2])
rho = np.corrcoef([r[2] for r in rows], [r[3] for r in rows])[0, 1]
fig, a1 = plt.subplots(figsize=(11, 4.6))
x = np.arange(len(rows)); a1.bar(x - .18, [r[2] for r in rows], .36, color=BLUE, label="yörünge kaya bolluğu k (%) — HiRISE, 16 m pencere")
a1.bar(x + .18, [r[3] for r in rows], .36, yerr=[r[4] for r in rows], color=DUST, label="yer doku indeksi (%) — Navcam alt yarı: parlak yüz + gölge pikselleri", capsize=4, error_kw=dict(ecolor=INK2))
a1.set_xticks(x); a1.set_xticklabels([f"{r[0]} · sol {r[1]}" for r in rows]); a1.legend(frameon=False, fontsize=11, loc="upper left"); a1.grid(axis="x", alpha=0); a1.set_ylim(0, 16)
a1.text(len(rows) - .5, 14.6, f"Pearson r = {rho:.2f} (n = 4, gösterge niteliğinde)", ha="right", color=INK2, fontsize=11)
save(fig, "fig_navcam_validation.png")
json.dump([dict(poi=r[0], sol=r[1], k_orbit=r[2], ground_idx=r[3], ground_sd=r[4]) for r in rows], open(os.path.join(OUT, "navcam_validation.json"), "w"), indent=1)

# 14) Navcam contact sheet (one row per POI, up to 3 frames)
fig, axs = plt.subplots(len(pov), 3, figsize=(14, 3.3 * len(pov)))
for i, (pid, info) in enumerate(pov.items()):
    for j in range(3):
        ax = axs[i, j]; ax.axis("off")
        if j < len(info["images"]):
            im = info["images"][j]; ax.imshow(Image.open(os.path.join(ROOT, "data/public" + im["file"])))
            ax.set_title(f"{pid} · sol {info['sol']} · az {im['az']:.0f}° · {im['lmst'] or ''}", fontsize=10, loc="left", color=INK2)
save(fig, "fig_navcam_contact.png")

# 15) crops of the user's images for slides (downsized)
def thumb(src, dst, maxw):
    im = Image.open(os.path.join(ROOT, src)).convert("RGB"); im.thumbnail((maxw, maxw)); im.save(os.path.join(OUT, dst), quality=88); print("img", dst, im.size)
thumb("data/public/pov/perseverance_rim.jpg", "img_mastcamz_rim.jpg", 1900)
thumb("data/public/pov/kenmore_abrasion.jpg", "img_abrasion.jpg", 1200)
thumb("data/public/pov/spirit_gusev.jpg", "img_spirit_pano.jpg", 1900)
thumb("PIA26515.tif", "img_hirise_insight_raw.jpg", 1400)
# Jezero ortho crop around depot for a hero image
ortho = Image.open(os.path.join(ROOT, "data/public/scenes/jezero/base.jpg")); ortho.crop((1200, 1100, 2800, 2000)).save(os.path.join(OUT, "img_jezero_ortho_crop.jpg"), quality=88)
print("done")
