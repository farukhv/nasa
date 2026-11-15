import { CHANNELS, type ChannelName, type SceneData, type SceneMeta } from './types';

async function loadPngGray(url: string, W: number, H: number): Promise<Uint8Array> {
  const blob = await (await fetch(url)).blob();
  const bmp = await createImageBitmap(blob);
  const cv = new OffscreenCanvas(W, H), ctx = cv.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0);
  const d = ctx.getImageData(0, 0, W, H).data, out = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) out[i] = d[i * 4];
  bmp.close?.();
  return out;
}

export async function loadScene(id: string, base = '/scenes', onProgress?: (p: number) => void): Promise<SceneData> {
  const meta: SceneMeta = await (await fetch(`${base}/${id}/scene.json`)).json();
  const { W, H } = meta;
  const ch = {} as Record<ChannelName, Uint8Array>;
  let done = 0;
  await Promise.all(CHANNELS.map(async c => {
    ch[c] = await loadPngGray(`${base}/${id}/ch/${c}.png`, W, H);
    onProgress?.(++done / (CHANNELS.length + 1));
  }));
  const buf = await (await fetch(`${base}/${id}/elev.f32`)).arrayBuffer();
  const elev = new Float32Array(buf);
  onProgress?.(1);
  return { meta, ch, elev };
}
