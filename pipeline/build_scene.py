"""
build_scene.py — Mars EVA planner scene builder.
Turns an orbital image (+ optional DTM, + optional CRISM map) into per-cell feature channels
consumed by the browser engine. Every channel is 0..100 uint8 unless noted.

Channels (grid resolution):
  K     rock density proxy (Golombek-style area fraction, texture + bright/shadow pairs)   [Derived]
  E     slope, degrees (0..90 stored as deg*2 -> 0..180? no: stored as deg, clipped 0..100) [Derived from DTM | Assumed from craters]
  Z     ground resistance / sinkage (class based)                                          [Derived]
  CLS   terrain class 0 soil,1 bedrock,2 rocky,3 boulder,4 sand,5 crater rim                [Derived]
  SVF   sky view factor * 100                                                             [Derived]
  HZ0..HZ7 horizon angle (deg) in 8 azimuths (0=N,45=NE,...)  -> shade at any sun angle   [Derived]
  G     geologic exposure value, DK rock/tone diversity, F fresh features, H hydration     [Derived / Observed CRISM / Assumed]
  Q     image quality (local contrast), DV data sufficiency, M multi-sensor agreement,
        P processing stability, LK positional accuracy                                     [Derived]
  ELEV  float32 .bin elevation (m) (real or pseudo)                                        [Observed | Assumed]
Usage: python pipeline/build_scene.py jezero | insight
"""
import sys, os, json, math
import numpy as np, cv2
from scipy import ndimage as ndi
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R_MARS = 3396190.0
ANCHORS = {"insight": (0.015, 0.05), "jezero": (0.05, 0.25)}   # (background, local max) total rock abundance

# ----------------------------------------------------------------------------- helpers
def zscore(a):
    m, s = np.nanmean(a), np.nanstd(a) + 1e-6
    return (a - m) / s

def stretch(a, lo=2, hi=98):
    p0, p1 = np.nanpercentile(a, [lo, hi])
    return np.clip((a - p0) / (p1 - p0 + 1e-9), 0, 1)

def box(a, k):
    return cv2.blur(a.astype(np.float32), (k, k))

def to_u8(a):
    return np.clip(np.nan_to_num(a), 0, 255).astype(np.uint8)

def save_png(path, a):
    Image.fromarray(to_u8(a)).save(path, optimize=True)

def resample(a, shape, interp=cv2.INTER_AREA):
    return cv2.resize(a.astype(np.float32), (shape[1], shape[0]), interpolation=interp)

# ----------------------------------------------------------------------------- texture / rocks
def texture_features(g, w=7):
    """g: float32 grayscale at native image resolution."""
    mu = box(g, w); var = box(g * g, w) - mu * mu
    std = np.sqrt(np.clip(var, 0, None))
    lap = cv2.Laplacian(g, cv2.CV_32F, ksize=3)
    lmu = box(lap, w); lapvar = box(lap * lap, w) - lmu * lmu
    gx = cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)
    grad_e = box(gx * gx + gy * gy, w)
    # structure tensor coherence (ripples -> strongly oriented)
    jxx, jyy, jxy = box(gx * gx, 15), box(gy * gy, 15), box(gx * gy, 15)
    tr = jxx + jyy + 1e-6; det = jxx * jyy - jxy * jxy
    disc = np.sqrt(np.clip(tr * tr / 4 - det, 0, None))
    l1, l2 = tr / 2 + disc, tr / 2 - disc
    coherence = np.clip((l1 - l2) / (l1 + l2 + 1e-6), 0, 1)
    return mu, std, np.sqrt(np.clip(lapvar, 0, None)), np.sqrt(grad_e), coherence

def rock_pairs(g, mu, std, sun_az_deg=None):
    """Detect bright blobs with a dark shadow on the anti-sun side. Returns (rock mask, est. azimuth)."""
    dog = cv2.GaussianBlur(g, (0, 0), 1.2) - cv2.GaussianBlur(g, (0, 0), 3.0)
    bright = (dog > 0.6 * std) & (g > mu + 1.6 * std) & (dog == ndi.maximum_filter(dog, 5))
    dark = (g < mu - 1.3 * std)
    lbl, n = ndi.label(dark)
    if n == 0:
        return np.zeros_like(g, bool), sun_az_deg or 270.0
    sizes = ndi.sum(dark, lbl, range(1, n + 1))
    keep = np.isin(lbl, np.where((sizes >= 2) & (sizes <= 40))[0] + 1)
    # estimate shadow direction from bright->nearest dark offset
    dist, (iy, ix) = ndi.distance_transform_edt(~keep, return_indices=True)
    by, bx = np.where(bright)
    if len(by) > 50:
        d = dist[by, bx]; ok = (d > 0.5) & (d < 6)
        dy, dx = iy[by, bx][ok] - by[ok], ix[by, bx][ok] - bx[ok]
        ang = np.degrees(np.arctan2(dx, -dy)) % 360  # azimuth of shadow direction (0=N, cw)
        hist, edges = np.histogram(ang, bins=24, range=(0, 360))
        shadow_az = (edges[np.argmax(hist)] + 7.5) % 360
        est_sun = (shadow_az + 180) % 360
    else:
        est_sun = sun_az_deg or 270.0
    if sun_az_deg is None: sun_az_deg = est_sun
    shadow_az = (sun_az_deg + 180) % 360
    # keep bright blobs whose nearest dark blob lies within +-50 deg of shadow azimuth and <=6 px
    d = dist[by, bx]
    dy, dx = iy[by, bx] - by, ix[by, bx] - bx
    ang = np.degrees(np.arctan2(dx, -dy)) % 360
    dang = np.abs(((ang - shadow_az + 180) % 360) - 180)
    ok = (d > 0.5) & (d <= 5) & (dang <= 45)
    rocks = np.zeros_like(g, bool); rocks[by[ok], bx[ok]] = True
    print(f"   rock candidates {len(by)}, confirmed by shadow pairing {int(ok.sum())}")
    return rocks, est_sun

# ----------------------------------------------------------------------------- DEM derived
def slope_deg(z, dx, dy):
    gy, gx = np.gradient(z, dy, dx)
    return np.degrees(np.arctan(np.hypot(gx, gy)))

def horizon_angles(z, cell, n_dir=16, radius_m=60.0, step=4):
    """Horizon angle (deg) per azimuth on a `step`x downsampled DEM. Returns (n_dir,H,W) at full res."""
    zs = z[::step, ::step]; H, W = zs.shape; c = cell * step
    out = np.zeros((n_dir, H, W), np.float32)
    nsteps = int(radius_m / c)
    yy, xx = np.mgrid[0:H, 0:W]
    for k in range(n_dir):
        az = 2 * math.pi * k / n_dir
        sy, sx = -math.cos(az), math.sin(az)  # 0 = north (up)
        best = np.full((H, W), -1e9, np.float32)
        for s in range(1, nsteps + 1):
            py = np.clip(np.round(yy + sy * s).astype(int), 0, H - 1)
            px = np.clip(np.round(xx + sx * s).astype(int), 0, W - 1)
            ang = np.degrees(np.arctan2(zs[py, px] - zs, s * c))
            best = np.maximum(best, ang)
        out[k] = np.clip(best, 0, 90)
    full = np.stack([resample(o, z.shape, cv2.INTER_LINEAR) for o in out])
    return full

def detect_craters(g, mpp, sun_az_deg, mu, std, min_d_m=2.5, max_d_m=80.0):
    """Craters at HiRISE scale: a dark (shadowed, sun-facing-away) inner wall on the SUN side and a bright
    inner wall on the ANTI-SUN side. So along the anti-sun azimuth we see dark -> bright (rocks are bright -> dark).
    Returns list of (cx, cy, r) in px."""
    shadow_az = math.radians((sun_az_deg + 180) % 360)
    ux, uy = math.sin(shadow_az), -math.cos(shadow_az)       # unit vector along anti-sun (image coords, y down)
    mu_r = box(g, 61); std_r = np.sqrt(np.clip(box(g * g, 61) - mu_r * mu_r, 0, None)) + 1e-3   # regional reference
    dark = g < mu_r - 1.2 * std_r
    lbl, n = ndi.label(dark)
    if n == 0: return []
    idx = np.arange(1, n + 1)
    sizes = ndi.sum(dark, lbl, idx)
    cents = ndi.center_of_mass(dark, lbl, idx)
    objs = ndi.find_objects(lbl)
    means = ndi.mean(g, lbl, idx)
    minA, maxA = (min_d_m / mpp) ** 2 * 0.15, (max_d_m / mpp) ** 2 * 0.5
    H, W = g.shape; out = []
    for (cy, cx), a, sl, gm in zip(cents, sizes, objs, means):
        if a < minA or a > maxA: continue
        bh, bw = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if a / (bh * bw) < 0.45 or max(bh, bw) / max(1, min(bh, bw)) > 2.2: continue   # compact crescent/blob only
        if gm > mu_r[int(cy), int(cx)] - 1.6 * std_r[int(cy), int(cx)]: continue        # must be really dark
        r_d = math.sqrt(a / math.pi)                 # radius of the dark patch
        r = max(2.0, r_d * 1.9)                      # crater radius ~ dark wall is ~half the bowl
        # bright probe on anti-sun side at ~1.0..1.6 r from dark centroid
        px, py = cx + ux * 1.3 * r, cy + uy * 1.3 * r
        if not (0 <= px < W and 0 <= py < H): continue
        x0, x1 = int(max(px - r * 0.6, 0)), int(min(px + r * 0.6, W - 1))
        y0, y1 = int(max(py - r * 0.6, 0)), int(min(py + r * 0.6, H - 1))
        if x1 <= x0 or y1 <= y0: continue
        probe = g[y0:y1, x0:x1].mean()
        # reverse probe (sun side) must NOT be bright (otherwise it's a rock shadow between two bright things)
        qx, qy = cx - ux * 1.3 * r, cy - uy * 1.3 * r
        if not (0 <= qx < W and 0 <= qy < H): continue
        rx0, rx1 = int(max(qx - r * 0.6, 0)), int(min(qx + r * 0.6, W - 1))
        ry0, ry1 = int(max(qy - r * 0.6, 0)), int(min(qy + r * 0.6, H - 1))
        if rx1 <= rx0 or ry1 <= ry0: continue
        rev = g[ry0:ry1, rx0:rx1].mean()
        m0, s0 = mu_r[int(cy), int(cx)], std_r[int(cy), int(cx)]
        if probe > m0 + 0.7 * s0 and rev < m0 + 0.25 * s0 and probe - rev > 0.8 * s0:
            out.append((cx + ux * 0.6 * r, cy + uy * 0.6 * r, r))   # bowl centre between dark and bright walls
    # non-max suppression: drop smaller circles whose centre lies inside a bigger one
    out.sort(key=lambda t: -t[2]); kept = []
    for c in out:
        if all(math.hypot(c[0] - k[0], c[1] - k[1]) > k[2] * 1.1 for k in kept): kept.append(c)
    return kept

def golombek_k_from_large_rock_fraction(A1):
    """Invert A(>=1 m) = k*exp(-(1.79+0.152/k)*1.0) for total rock abundance k (Golombek & Rapp 1997)."""
    ks = np.linspace(0.002, 0.7, 400)
    A = ks * np.exp(-(1.79 + 0.152 / ks))
    return np.interp(A1, A, ks, left=0.0, right=0.7)

def pseudo_dem_from_craters(shape, craters, mpp, rock_mask=None):
    """Bowl-shaped depressions (depth/diameter 0.08 for small fresh, degrading with size). ASSUMED."""
    z = np.zeros(shape, np.float32)
    yy, xx = np.mgrid[0:shape[0], 0:shape[1]]
    for cx, cy, r in craters:
        D = 2 * r * mpp
        dD = 0.08 if D < 15 else 0.04
        depth = dD * D
        rr = np.hypot(xx - cx, yy - cy) / r
        bowl = np.where(rr < 1.0, -depth * (1 - rr ** 2), 0)
        rim = np.where((rr >= 1.0) & (rr < 1.35), depth * 0.25 * (1 - (rr - 1.0) / 0.35), 0)
        z += bowl + rim
    return cv2.GaussianBlur(z, (0, 0), 1.0)

# ----------------------------------------------------------------------------- scene builders
def build(scene_id):
    out_dir = os.path.join(ROOT, "data", "public", "scenes", scene_id); os.makedirs(os.path.join(out_dir, "ch"), exist_ok=True)
    meta = {}
    if scene_id == "jezero":
        m = json.load(open(os.path.join(ROOT, "data/raw/jezero_meta.json")))
        ortho = np.array(Image.open(os.path.join(ROOT, "data/raw/jezero_ortho_z17.png")).convert("L"), np.float32)
        dtm = np.load(os.path.join(ROOT, "data/raw/jezero_dtm_1m.npy")).astype(np.float32)
        dtm = np.where(np.isnan(dtm), np.nanmedian(dtm), dtm)
        H, W = dtm.shape
        cell_dy = 1.0; cell_dx = m["cos_lat"] * 1.0           # projected 1 m -> true E-W metres
        img_mpp = m["ortho_m_per_px_proj"]                     # projected metres / ortho px
        sun_az, sun_el = None, 40.0                            # az estimated from shadows; el assumed (HiRISE ~15:00 LTST)
        lat0, lat1, lon0, lon1 = m["lat0"], m["lat1"], m["lon0"], m["lon1"]
        meta.update(name="Jezero · Three Forks örnek deposu", body="Mars", lat0=lat0, lat1=lat1, lon0=lon0, lon1=lon1,
                    has_dtm=True, dtm_src="USGS JEZ_hirise_soc_006 DTM 1 m (CC0)", img_src="Mars Trek HiRISE 25 cm ortho (z17)",
                    crism_src="Parente, Itoh, Saranathan 2021 — Zenodo 5575824 (CC-BY), 36 m/px")
    elif scene_id == "insight":
        ortho = np.array(Image.open(os.path.join(ROOT, "PIA26515.tif")).convert("L"), np.float32)
        # mask the scale bar / label area (bottom-right) by inpainting the texture mean
        Hh, Ww = ortho.shape
        bar = np.zeros_like(ortho, bool); bar[int(Hh * 0.89):, int(Ww * 0.64):] = True
        ortho = ortho.copy(); ortho[bar] = np.nan; ortho = np.where(np.isnan(ortho), np.nanmedian(ortho), ortho)
        H, W = ortho.shape
        img_mpp = 100.0 / 340.0
        cell_dx = cell_dy = img_mpp
        dtm = None; sun_az, sun_el = None, 45.0
        # approximate geographic frame (centre = lander), image north-up
        clat, clon = 4.502384, 135.623447
        dlat = (H * img_mpp / 2) / (R_MARS * math.pi / 180); dlon = dlat / math.cos(math.radians(clat))
        lat0, lat1, lon0, lon1 = clat - dlat, clat + dlat, clon - dlon, clon + dlon
        meta.update(name="Elysium Planitia · InSight (Homestead hollow)", body="Mars", lat0=lat0, lat1=lat1, lon0=lon0, lon1=lon1,
                    has_dtm=False, dtm_src="YOK — sözde-DEM krater çanaklarından (VARSAYIM)",
                    img_src="HiRISE ESP_085514_1845 / PIA26515 (NASA/JPL/UArizona), 0.294 m/px ölçek çubuğundan",
                    crism_src=None, mask_rect=[int(Ww * 0.64), int(Hh * 0.89), Ww, Hh])
    else:
        raise SystemExit("unknown scene")

    # ---------------- texture at native image res
    g = ortho
    mu, std, lapv, grad, coh = texture_features(g, 7)
    rocks, est_sun = rock_pairs(g, mu, std, sun_az)
    sun_az = est_sun if sun_az is None else sun_az
    print(f"[{scene_id}] image {g.shape}, est. sun azimuth {sun_az:.0f}°")
    # rock area fraction in 15 m window: each detected rock ~ (2 px)^2 .. use blob count * mean area
    win_px = max(5, int(25.0 / img_mpp) | 1)
    rock_area_px = math.pi * (0.5 * 1.2 / img_mpp) ** 2                # detected rock ~1.2 m diameter (HiRISE resolves >=1 m)
    A1 = box(rocks.astype(np.float32), win_px) * rock_area_px           # relative density of resolved rocks (orbital)
    # Orbital detections are RELATIVE (noise, pebble clusters). Anchor to published surface rock counts:
    #  InSight: 1-4 % overall, 3-5 % near craters (Golombek et al. 2020/2021)
    #  Jezero landing region: ~5 % background, delta-front rubble up to ~25 % (Mars 2020 site criteria, Golombek 2012 scaling)
    k_bg, k_hi = ANCHORS[scene_id]
    p20, p99 = np.percentile(A1, [20, 99.5])
    k_total = k_bg + (k_hi - k_bg) * np.clip((A1 - p20) / (p99 - p20 + 1e-9), 0, 1)
    tex = 0.4 * zscore(std) + 0.3 * zscore(lapv) + 0.3 * zscore(grad)
    tex = tex * (1 - 0.5 * (coh > 0.7))                                # ripple suppression
    K_img = 100 * np.clip(k_total * (0.8 + 0.4 * stretch(tex)), 0, 1)  # texture modulates +-20 %
    K_img = cv2.GaussianBlur(K_img, (0, 0), max(1.0, 3.0 / img_mpp))

    # ---------------- bring to grid resolution
    if dtm is not None:
        grid_shape = dtm.shape
    else:
        grid_shape = g.shape
    K = resample(K_img, grid_shape)
    coh_g = resample(coh, grid_shape); std_g = resample(std, grid_shape); mu_g = resample(mu, grid_shape)
    tone = stretch(mu_g, 1, 99)                                         # 0 dark .. 1 bright
    cell = (cell_dx + cell_dy) / 2

    # ---------------- craters (both scenes), DEM
    craters_img = detect_craters(g, img_mpp, sun_az, mu, std)
    sx, sy = grid_shape[1] / g.shape[1], grid_shape[0] / g.shape[0]
    craters = [(cx * sx, cy * sy, r * sx) for cx, cy, r in craters_img]
    print(f"[{scene_id}] craters detected: {len(craters)}")
    if dtm is None:
        dtm = pseudo_dem_from_craters(grid_shape, craters, cell)
    E = slope_deg(dtm, cell_dx, cell_dy)
    hz = horizon_angles(dtm, cell, 16, 60.0, 4 if grid_shape[0] > 800 else 2)
    svf = 1 - np.mean(np.sin(np.radians(hz)), axis=0)
    tri = np.sqrt(box((dtm - box(dtm, 3)) ** 2, 3))                      # terrain ruggedness (m)

    # ---------------- crater rim mask
    rim = np.zeros(grid_shape, np.float32)
    yy, xx = np.mgrid[0:grid_shape[0], 0:grid_shape[1]]
    for cx, cy, r in craters:
        rr = np.hypot(xx - cx, yy - cy) / max(r, 1)
        rim = np.maximum(rim, np.clip(1 - np.abs(rr - 1.0) / 0.35, 0, 1) * (1 if r * cell > 2.5 else 0.5))
        rim = np.maximum(rim, np.where(rr < 0.8, 0.6, 0))                 # bowl interior: loose fill

    # ---------------- terrain classes
    CLS = np.zeros(grid_shape, np.uint8)                                   # soil
    sand = (coh_g > 0.5) & (tone > 0.4) & (K < 12)
    sand = ndi.binary_opening(sand, iterations=1)
    lbl_s, ns = ndi.label(sand)
    if ns:
        sz = ndi.sum(sand, lbl_s, range(1, ns + 1)); sand = np.isin(lbl_s, np.where(sz >= (6.0 / cell) ** 2)[0] + 1)
    sand = ndi.binary_dilation(sand, iterations=2)
    bedrock = meta["has_dtm"] & (E > 8) & (E < 26) & (K < 40)   # scarp faces / layered outcrop
    rocky = K >= 10; boulder = K >= 25
    CLS[sand] = 4; CLS[rocky] = 2; CLS[boulder] = 3; CLS[bedrock] = 1; CLS[rim > 0.4] = 5
    CLS = ndi.median_filter(CLS, 5)

    Zmap = {0: 15, 1: 5, 2: 25, 3: 35, 4: 80, 5: 45}
    Z = np.vectorize(Zmap.get)(CLS).astype(np.float32)
    Z = np.maximum(Z, 100 * np.clip((coh_g - 0.5) / 0.4, 0, 1) * (tone > 0.4))   # ripple strength
    Z = box(Z, 3)

    # ---------------- science components
    Gmap = {0: 25, 1: 90, 2: 50, 3: 65, 4: 20, 5: 75}
    G = np.vectorize(Gmap.get)(CLS).astype(np.float32)
    G = np.where(CLS == 2, 40 + 20 * np.clip((K - 10) / 15, 0, 1), G)          # rocky scales 35..60 with K
    G = box(G, 5)
    # diversity: tone entropy in ~15 m window + class variety
    win_g = max(5, int(15.0 / cell) | 1)
    bins = np.clip((tone * 8).astype(int), 0, 7)
    ent = np.zeros(grid_shape, np.float32)
    for b in range(8):
        p = box((bins == b).astype(np.float32), win_g); ent -= np.where(p > 0, p * np.log(p + 1e-9), 0)
    cls_var = np.zeros(grid_shape, np.float32)
    for c in range(6):
        cls_var += (box((CLS == c).astype(np.float32), win_g) > 0.05)
    DK = 100 * np.clip(0.6 * ent / np.log(8) + 0.4 * (cls_var - 1) / 3, 0, 1)
    # fresh features: slope breaks + crater rims + strong local contrast
    F = 100 * np.clip(0.5 * stretch(tri) + 0.3 * rim + 0.2 * stretch(std_g), 0, 1)
    F = ndi.maximum_filter(F, 5)
    # hydration / mineral (CRISM)
    if meta.get("crism_src"):
        import rasterio
        from rasterio.windows import from_bounds
        with rasterio.open(os.path.join(ROOT, "data/raw/jezeroFinal_crism.tif")) as ds:
            X0, Y0 = R_MARS * math.radians(lon0), R_MARS * math.radians(lat0)
            X1, Y1 = R_MARS * math.radians(lon1), R_MARS * math.radians(lat1)
            win = from_bounds(X0, Y0, X1, Y1, ds.transform)
            c = ds.read(window=win, out_shape=(3, 40, 40), boundless=True, fill_value=0).astype(int)
        rgb = c.transpose(1, 2, 0)
        def near(col, tol=12): return (np.abs(rgb - np.array(col)).sum(-1) < tol)
        Hs = np.full(rgb.shape[:2], 20, np.float32)
        Hs[near((153, 0, 0))] = 45; Hs[near((255, 0, 0))] = 50            # olivine
        Hs[near((153, 77, 0))] = 35; Hs[near((255, 128, 0))] = 40         # HCP
        Hs[near((153, 77, 68))] = 70; Hs[near((255, 128, 114))] = 78      # olivine + smectite
        Hs[near((0, 153, 153))] = 85; Hs[near((0, 255, 255))] = 92        # Fe/Mg smectite
        Hs[near((0, 153, 0))] = 88; Hs[near((0, 255, 0))] = 95            # Mg carbonate
        Hs[near((153, 129, 0))] = 85; Hs[near((255, 215, 0))] = 92        # carbonate + 2.2um
        Hs[near((77, 77, 0))] = 75; Hs[near((128, 128, 0))] = 80
        Hs = Hs[::-1]  # raster rows go north->south already; keep orientation consistent with window read
        Hs = Hs[::-1]
        H_ = resample(Hs, grid_shape, cv2.INTER_LINEAR)
        H_src = "Observed"
    else:
        H_ = np.full(grid_shape, 25, np.float32); H_src = "Assumed"

    # ---------------- confidence components
    Q = 100 * np.clip(0.35 + 0.65 * stretch(std_g, 5, 95), 0, 1)
    DV = np.full(grid_shape, 88 if meta["has_dtm"] else 42, np.float32)
    if meta.get("crism_src"): DV -= 8 * (H_ < 22)
    if meta["has_dtm"]:
        # agreement between texture-rock proxy and DEM ruggedness
        a, b = stretch(K), stretch(tri)
        M = 100 * np.clip(1 - np.abs(a - b), 0, 1) * 0.6 + 40
    else:
        M = np.full(grid_shape, 48, np.float32)
    edge = np.minimum.reduce([yy, xx, grid_shape[0] - 1 - yy, grid_shape[1] - 1 - xx]).astype(np.float32)
    P = 40 + 50 * np.clip(edge / (12.0 / cell), 0, 1)
    LK = np.full(grid_shape, 90 if meta["has_dtm"] else 62, np.float32)
    if "mask_rect" in meta:
        x0, y0, x1, y1 = meta["mask_rect"]; Q[y0:y1, x0:x1] = 10; DV[y0:y1, x0:x1] = 10; P[y0:y1, x0:x1] = 10

    # ---------------- write
    ch = dict(K=K, E=np.clip(E, 0, 100), Z=Z, CLS=CLS, SVF=100 * svf, G=G, DK=DK, F=F, H=H_, Q=Q, DV=DV, M=M, P=P, LK=LK)
    for k in range(8):
        ch[f"HZ{k}"] = hz[k * 2]
    for name, arr in ch.items():
        save_png(os.path.join(out_dir, "ch", f"{name}.png"), arr)
    # elevation float32 little endian
    dtm.astype("<f4").tofile(os.path.join(out_dir, "elev.f32"))
    # display base image: integer multiple of grid
    disp_scale = max(1, int(round(g.shape[1] / grid_shape[1])))
    base = cv2.resize(g, (grid_shape[1] * disp_scale, grid_shape[0] * disp_scale), interpolation=cv2.INTER_AREA)
    base8 = cv2.normalize(base, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    # warm-tone the greyscale so it reads as Mars (HiRISE RED channel is panchromatic)
    rgb = np.stack([base8 * 1.00, base8 * 0.78, base8 * 0.60], -1)
    Image.fromarray(to_u8(rgb)).save(os.path.join(out_dir, "base.jpg"), quality=86)
    stats = {k: dict(mean=float(np.nan_to_num(np.nanmean(v))), p90=float(np.nan_to_num(np.nanpercentile(v, 90)))) for k, v in ch.items() if not k.startswith("HZ")}
    meta.update(id=scene_id, W=int(grid_shape[1]), H=int(grid_shape[0]), cell_dx=cell_dx, cell_dy=cell_dy,
                disp_scale=disp_scale, sun_az=float(sun_az), sun_el=float(sun_el),
                elev_min=float(dtm.min()), elev_max=float(dtm.max()),
                craters=[[float(a), float(b), float(c)] for a, b, c in craters[:200]],
                class_names=["Sıkı toprak", "Anakaya", "Kayalık", "Blok/kaya tarlası", "Kum dalgası", "Krater kenarı"],
                provenance=dict(K="Derived", E="Derived" if meta["has_dtm"] else "Assumed", Z="Derived", CLS="Derived",
                                SVF="Derived" if meta["has_dtm"] else "Assumed", G="Derived", DK="Derived", F="Derived",
                                H=H_src, Q="Derived", DV="Derived", M="Derived", P="Derived", LK="Derived",
                                ELEV="Observed" if meta["has_dtm"] else "Assumed"),
                rock_anchor=dict(k_bg=ANCHORS[scene_id][0], k_hi=ANCHORS[scene_id][1], note="Orbital detections scaled to published surface counts"),
                stats=stats)
    json.dump(meta, open(os.path.join(out_dir, "scene.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print(json.dumps(stats, indent=0)[:1200])
    print("class share %:", {n: round(float((CLS == i).mean() * 100), 1) for i, n in enumerate(meta["class_names"])})
    print("written", out_dir)

if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else "insight")
