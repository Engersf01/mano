const smoothing = (cutoff: number, dt: number) => {
  const r = 2 * Math.PI * cutoff * dt;
  return r / (r + 1);
};

export class OneEuro {
  private lastT = 0;
  private xPrev = 0;
  private dxPrev = 0;
  private has = false;
  constructor(
    private minCutoff = 1.0,
    private beta = 0.02,
    private dCutoff = 1.0,
  ) {}
  filter(x: number, t: number) {
    if (!this.has) {
      this.has = true;
      this.lastT = t;
      this.xPrev = x;
      this.dxPrev = 0;
      return x;
    }
    const dt = Math.max((t - this.lastT) / 1000, 1e-6);
    this.lastT = t;
    const dx = (x - this.xPrev) / dt;
    const eD = smoothing(this.dCutoff, dt);
    const dxHat = this.dxPrev + eD * (dx - this.dxPrev);
    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const e = smoothing(cutoff, dt);
    const xHat = this.xPrev + e * (x - this.xPrev);
    this.xPrev = xHat;
    this.dxPrev = dxHat;
    return xHat;
  }
}

export class Vec2OneEuro {
  private fx: OneEuro;
  private fy: OneEuro;
  constructor(minCutoff = 1.0, beta = 0.02, dCutoff = 1.0) {
    this.fx = new OneEuro(minCutoff, beta, dCutoff);
    this.fy = new OneEuro(minCutoff, beta, dCutoff);
  }
  filter(p: { x: number; y: number }, t: number) {
    return { x: this.fx.filter(p.x, t), y: this.fy.filter(p.y, t) };
  }
}
