/// <reference lib="webworker" />
import { loadScene } from '../engine/sceneLoader';
import { plan } from '../engine/route';
import type { SceneData, PlanRequest, POI } from '../engine/types';
import type { PlannerConfig } from '../engine/config';

let scene: SceneData | null = null;

self.onmessage = async (ev: MessageEvent) => {
  const msg = ev.data;
  try {
    if (msg.type === 'load') {
      scene = await loadScene(msg.id, msg.base, p => (self as unknown as Worker).postMessage({ type: 'progress', p }));
      (self as unknown as Worker).postMessage({ type: 'loaded', meta: scene.meta, elev: scene.elev, cls: scene.ch.CLS, K: scene.ch.K, E: scene.ch.E, H: scene.ch.H, SVF: scene.ch.SVF, DV: scene.ch.DV });
    } else if (msg.type === 'plan') {
      if (!scene) throw new Error('scene not loaded');
      const res = plan(scene, msg.cfg as PlannerConfig, msg.req as PlanRequest, msg.pois as POI[]);
      const transfer: Transferable[] = [res.fields.S.buffer, res.fields.V.buffer, res.fields.C.buffer, res.fields.veto.buffer, res.fields.shade.buffer, res.fields.comm.buffer, res.fields.o2Ret.buffer];
      for (const r of res.routes) transfer.push(r.corridor.mask.buffer);
      (self as unknown as Worker).postMessage({ type: 'plan', token: msg.token, res }, transfer);
    }
  } catch (e) {
    (self as unknown as Worker).postMessage({ type: 'error', token: msg.token, message: (e as Error).message, stack: (e as Error).stack });
  }
};
