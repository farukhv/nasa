"""Fetch Jezero HiRISE 25 cm ortho tiles (Mars Trek WMTS, z17) + 1 m DTM window around Three Forks.
Outputs: data/raw/jezero_ortho_z17.png, data/raw/jezero_dtm_1m.npy, data/raw/jezero_meta.json
"""
import math, json, io, os, sys, time, concurrent.futures as cf
import numpy as np, urllib.request
from PIL import Image
R = 3396190.0
LAYER = "JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd"
Z = 17
CLAT, CLON = 18.4528, 77.4080   # Three Forks sample depot
HALF_M = 600.0                  # half window in projected metres
DEG_PER_M = 180.0 / (math.pi * R)
half_deg = HALF_M * DEG_PER_M
lat0, lat1 = CLAT - half_deg, CLAT + half_deg
lon0, lon1 = CLON - half_deg, CLON + half_deg
n = 2 ** (Z + 1)
deg_per_tile = 360.0 / n
x0, x1 = int((lon0 + 180) / deg_per_tile), int((lon1 + 180) / deg_per_tile)
y0, y1 = int((90 - lat1) / deg_per_tile), int((90 - lat0) / deg_per_tile)
os.makedirs("data/raw", exist_ok=True)
print("tiles", x0, x1, y0, y1, (x1 - x0 + 1) * (y1 - y0 + 1))

def get(xy):
    x, y = xy
    url = f"https://trek.nasa.gov/tiles/Mars/EQ/{LAYER}/1.0.0/default/default028mm/{Z}/{y}/{x}.png"
    for a in range(4):
        try:
            d = urllib.request.urlopen(url, timeout=40).read()
            return xy, Image.open(io.BytesIO(d)).convert("L")
        except Exception as e:
            time.sleep(1 + a)
    return xy, None

W = (x1 - x0 + 1) * 256; H = (y1 - y0 + 1) * 256
mosaic = Image.new("L", (W, H), 0)
missing = 0
with cf.ThreadPoolExecutor(12) as ex:
    for (x, y), im in ex.map(get, [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)]):
        if im is None: missing += 1; continue
        mosaic.paste(im, ((x - x0) * 256, (y - y0) * 256))
print("mosaic", mosaic.size, "missing", missing)
# crop to exact bbox
px_per_deg = 256 / deg_per_tile
cx0 = int(round((lon0 - (x0 * deg_per_tile - 180)) * px_per_deg))
cy0 = int(round(((90 - y0 * deg_per_tile) - lat1) * px_per_deg))
cw = int(round((lon1 - lon0) * px_per_deg)); ch = int(round((lat1 - lat0) * px_per_deg))
crop = mosaic.crop((cx0, cy0, cx0 + cw, cy0 + ch))
crop.save("data/raw/jezero_ortho_z17.png")
print("crop", crop.size)

# DTM window
import rasterio
from rasterio.windows import from_bounds
url = "https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/HiRISE/JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40.tif"
t = time.time()
with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR"):
    with rasterio.open(url) as ds:
        X0, Y0 = R * math.radians(lon0), R * math.radians(lat0)
        X1, Y1 = R * math.radians(lon1), R * math.radians(lat1)
        win = from_bounds(X0, Y0, X1, Y1, ds.transform)
        arr = ds.read(1, window=win).astype(np.float32)
        arr[arr < -1e30] = np.nan
np.save("data/raw/jezero_dtm_1m.npy", arr)
print("dtm", arr.shape, round(time.time() - t), "s")
meta = dict(layer=LAYER, zoom=Z, lat0=lat0, lat1=lat1, lon0=lon0, lon1=lon1, center=[CLAT, CLON],
            ortho_px=[crop.size[0], crop.size[1]], ortho_m_per_px_proj=deg_per_tile / 256 / DEG_PER_M,
            dtm_px=[arr.shape[1], arr.shape[0]], dtm_m_per_px_proj=1.0, cos_lat=math.cos(math.radians(CLAT)),
            dtm_url=url, ortho_src="https://trek.nasa.gov/tiles/Mars/EQ/" + LAYER)
json.dump(meta, open("data/raw/jezero_meta.json", "w"), indent=1)
print(meta)
