/** Binary min-heap on typed arrays (lazy deletion: push duplicates, skip closed on pop). */
export class MinHeap {
  private ids: Int32Array; private keys: Float32Array; size = 0;
  constructor(cap: number) { this.ids = new Int32Array(cap); this.keys = new Float32Array(cap); }
  push(id: number, key: number) {
    if (this.size === this.ids.length) this.grow();
    let i = this.size++;
    this.ids[i] = id; this.keys[i] = key;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.keys[p] <= this.keys[i]) break;
      this.swap(i, p); i = p;
    }
  }
  pop(): number {
    const top = this.ids[0];
    this.size--;
    if (this.size > 0) {
      this.ids[0] = this.ids[this.size]; this.keys[0] = this.keys[this.size];
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < this.size && this.keys[l] < this.keys[m]) m = l;
        if (r < this.size && this.keys[r] < this.keys[m]) m = r;
        if (m === i) break;
        this.swap(i, m); i = m;
      }
    }
    return top;
  }
  peekKey() { return this.keys[0]; }
  clear() { this.size = 0; }
  private swap(a: number, b: number) {
    const ti = this.ids[a]; this.ids[a] = this.ids[b]; this.ids[b] = ti;
    const tk = this.keys[a]; this.keys[a] = this.keys[b]; this.keys[b] = tk;
  }
  private grow() {
    const n = this.ids.length * 2;
    const ids = new Int32Array(n); ids.set(this.ids); this.ids = ids;
    const keys = new Float32Array(n); keys.set(this.keys); this.keys = keys;
  }
}

/**
 * Dial's bucket queue: O(1) push/pop for non-negative edge costs when keys are quantised.
 * Keys are rounded to multiples of `q`; the ring must be wider than the largest edge cost / q.
 */
export class DialQueue {
  private head: Int32Array; private entNode: Int32Array; private entNext: Int32Array; private entBucket: Int32Array;
  private free = 0; private cur = 0; private base = 0; size = 0;
  private q: number; private ring: number;
  constructor(q: number, ring = 1 << 16, cap = 1 << 16) {
    this.q = q; this.ring = ring;
    this.head = new Int32Array(ring).fill(-1); this.entNode = new Int32Array(cap); this.entNext = new Int32Array(cap); this.entBucket = new Int32Array(cap);
  }
  push(id: number, key: number) {
    let b = Math.floor(key / this.q);
    if (b < this.base) b = this.base;
    if (b - this.base >= this.ring) b = this.base + this.ring - 1;      // clamp (keeps monotone pops; tiny approximation)
    if (this.free === this.entNode.length) { const n = this.free * 2; const a = new Int32Array(n); a.set(this.entNode); this.entNode = a; const c = new Int32Array(n); c.set(this.entNext); this.entNext = c; const d = new Int32Array(n); d.set(this.entBucket); this.entBucket = d; }
    const e = this.free++, slot = b % this.ring;
    this.entNode[e] = id; this.entBucket[e] = b; this.entNext[e] = this.head[slot]; this.head[slot] = e; this.size++;
  }
  /** pops the id with the smallest bucket; returns key via lastKey */
  lastKey = 0;
  pop(): number {
    for (;;) {
      const slot = this.cur % this.ring, e = this.head[slot];
      if (e !== -1 && this.entBucket[e] === this.cur) {
        this.head[slot] = this.entNext[e]; this.size--; this.lastKey = this.cur * this.q; return this.entNode[e];
      }
      if (e !== -1 && this.entBucket[e] !== this.cur) { /* stale wrap entry: should not happen */ this.head[slot] = this.entNext[e]; this.size--; continue; }
      this.cur++; this.base = this.cur;
    }
  }
}
