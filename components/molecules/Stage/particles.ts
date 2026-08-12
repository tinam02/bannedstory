// a wz map particle emitter, run rather than replayed
//
// the definition in Effect/particle.img is a cocos2d-x ParticleSystem in
// gravity mode, which is a documented simulation, so this is a port of
// cocos's initParticle and update rather than anything reverse engineered
//
// nexon added two things on top: an alpha envelope over the particle's life
// (MiddlePoint0/1 with MiddlePointAlpha0/1) and a speed curve (SpeedPoint).
// both are keyframes over normalised life, both are handled in curveAt

/** one Effect/particle.img definition, as dump-map-layers.lua writes it */
export type ParticleDef = {
  /** the emitter's own sprite, dumped beside the map's layer sprites */
  texture: string;
  tw: number;
  th: number;
  totalParticle?: number;
  /** seconds, or -1 for an emitter that never stops */
  duration?: number;
  emissionRate?: number;
  /** degrees, and the spread either side of it */
  angle?: number;
  angleVar?: number;
  life?: number;
  lifeVar?: number;
  // packed 0xRRGGBB. the top byte is zero on every one seen so far, which is
  // why the alpha envelope exists
  startColor?: number;
  startColorVar?: number;
  endColor?: number;
  endColorVar?: number;
  startSize?: number;
  startSizeVar?: number;
  endSize?: number;
  endSizeVar?: number;
  /** the emitter's offset from the instance, and the box particles spawn in */
  posX?: number;
  posY?: number;
  posVarX?: number;
  posVarY?: number;
  /** degrees a second */
  startSpin?: number;
  startSpinVar?: number;
  endSpin?: number;
  endSpinVar?: number;
  /** D3DBLEND, not GL. 5 is SRCALPHA, 2 is ONE, 6 is INVSRCALPHA */
  blendFuncSrc?: number;
  blendFuncDst?: number;
  positionType?: number;
  // the alpha envelope, as two interior keyframes over normalised life
  MiddlePoint0?: number;
  MiddlePoint1?: number;
  MiddlePointAlpha0?: number;
  MiddlePointAlpha1?: number;
  /** time to speed, as a percentage. 0:100 0.5:2 means it stops almost at once */
  SpeedPoint?: Record<string, number>;
  GRAVITY?: {
    x?: number;
    y?: number;
    speed?: number;
    speedVar?: number;
    radialAccel?: number;
    radialAccelVar?: number;
    tangentialAccel?: number;
    tangentialAccelVar?: number;
    /** turns the sprite to face the way it is travelling */
    rotationIsDir?: number;
  };
};

/** one placement of a definition, out of the map's own particle node */
export type ParticleInstance = {
  name: string;
  x?: number;
  y?: number;
  z?: number;
  /** parallax rates. -100 on every one so far, meaning pinned to the map */
  rx?: number;
  ry?: number;
  /** which set this belongs to, for a map with more than one state */
  tags?: string;
  backTags?: string;
  boneName?: string;
};

export type MapParticles = {
  id: string;
  defs: Record<string, ParticleDef>;
  instances: ParticleInstance[];
};

// a D3DBLEND destination of ONE is additive, anything else is ordinary alpha.
// the magenta glitter blends additively, the black smoke does not
const D3DBLEND_ONE = 2;
export const isAdditive = (def: ParticleDef) => def.blendFuncDst === D3DBLEND_ONE;

// how much colour has to change before a particle gets its own tinted copy of
// the texture. five bits a channel, so a life spent fading from magenta to
// violet passes through about thirty of them
const TINT_SHIFT = 3;

// a frame long enough that the tab was probably in the background, so the
// simulation steps as if it were one frame rather than trying to catch up
const MAX_STEP = 1 / 20;

// unpacks 0xRRGGBB. wz stores these as a plain integer and the alpha byte is
// always zero, so alpha comes from the envelope instead
const rgb = (packed = 0) => ({
  r: (packed >> 16) & 255,
  g: (packed >> 8) & 255,
  b: packed & 255,
});

/** a signed unit random, which is what every cocos Var field is scaled by */
const rnd = () => Math.random() * 2 - 1;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * A keyframe curve over normalised life.
 *
 * Both nexon extensions are the same shape: a handful of times mapped to
 * values, linear between them, flat outside. SpeedPoint arrives as an object
 * keyed by the time, which is why the keys get sorted numerically rather than
 * trusted in wz order.
 */
export type Curve = { t: number; v: number }[];

const toCurve = (raw: Record<string, number> | undefined): Curve | null => {
  if (!raw) return null;
  const pts = Object.entries(raw)
    .map(([t, v]) => ({ t: Number(t), v: Number(v) }))
    .filter(p => Number.isFinite(p.t) && Number.isFinite(p.v))
    .sort((a, b) => a.t - b.t);
  return pts.length > 1 ? pts : null;
};

const curveAt = (c: Curve, t: number) => {
  if (t <= c[0].t) return c[0].v;
  const last = c[c.length - 1];
  if (t >= last.t) return last.v;
  for (let i = 1; i < c.length; i++) {
    const b = c[i];
    if (t > b.t) continue;
    const a = c[i - 1];
    const span = b.t - a.t;
    return span > 0 ? a.v + ((b.v - a.v) * (t - a.t)) / span : b.v;
  }
  return last.v;
};

/**
 * The alpha envelope, as a curve from birth to death.
 *
 * The endpoints come out of the packed colours, which put alpha in the top
 * byte, and that byte is zero on every definition seen so far. So a particle
 * fades in, holds through the two interior keyframes, and fades out.
 *
 * A definition with neither the envelope nor an alpha byte would be invisible,
 * so that one falls back to opaque.
 */
const alphaCurve = (def: ParticleDef): Curve => {
  const born = (def.startColor ?? 0) >>> 24;
  const dead = (def.endColor ?? 0) >>> 24;
  const mid: Curve = [];
  if (def.MiddlePoint0 !== undefined && def.MiddlePointAlpha0 !== undefined)
    mid.push({ t: clamp01(def.MiddlePoint0), v: def.MiddlePointAlpha0 });
  if (def.MiddlePoint1 !== undefined && def.MiddlePointAlpha1 !== undefined)
    mid.push({ t: clamp01(def.MiddlePoint1), v: def.MiddlePointAlpha1 });
  if (!mid.length && !born && !dead) return [{ t: 0, v: 255 }, { t: 1, v: 255 }];
  return [{ t: 0, v: born }, ...mid.sort((a, b) => a.t - b.t), { t: 1, v: dead }];
};

/**
 * One emitter, placed once.
 *
 * State lives in parallel typed arrays rather than objects. A map runs a few
 * dozen of these at sixty frames a second, and a per particle object per frame
 * is the one thing that would put the garbage collector in the middle of it.
 */
export class Emitter {
  readonly additive: boolean;
  /** where the emitter sits, in plate pixels */
  readonly ox: number;
  readonly oy: number;

  private readonly def: ParticleDef;
  private readonly tex: CanvasImageSource;
  private readonly max: number;
  private readonly rate: number;
  private readonly alpha: Curve;
  private readonly speed: Curve | null;
  private readonly tints = new Map<number, HTMLCanvasElement>();

  // one slot a particle, all of them live in [0, count)
  private count = 0;
  private readonly px: Float32Array;
  private readonly py: Float32Array;
  private readonly vx: Float32Array;
  private readonly vy: Float32Array;
  private readonly radial: Float32Array;
  private readonly tangent: Float32Array;
  private readonly size: Float32Array;
  private readonly dSize: Float32Array;
  private readonly rot: Float32Array;
  private readonly dRot: Float32Array;
  private readonly cr: Float32Array;
  private readonly cg: Float32Array;
  private readonly cb: Float32Array;
  private readonly dr: Float32Array;
  private readonly dg: Float32Array;
  private readonly db: Float32Array;
  private readonly life: Float32Array;
  private readonly age: Float32Array;

  /** every per particle array in one list, so retiring one can walk them */
  private readonly fields: Float32Array[];

  private owed = 0;
  private elapsed = 0;

  constructor(def: ParticleDef, at: ParticleInstance, tex: CanvasImageSource) {
    this.def = def;
    this.tex = tex;
    this.ox = at.x ?? 0;
    this.oy = at.y ?? 0;
    this.additive = isAdditive(def);

    this.max = Math.max(1, Math.round(def.totalParticle ?? 1));
    // cocos derives the rate from the pool and the lifetime, so a full pool is
    // exactly what a steady emitter settles at
    const life = Math.max(0.01, def.life ?? 1);
    this.rate = def.emissionRate ?? this.max / life;

    this.alpha = alphaCurve(def);
    this.speed = toCurve(def.SpeedPoint);

    const n = this.max;
    this.px = new Float32Array(n);
    this.py = new Float32Array(n);
    this.vx = new Float32Array(n);
    this.vy = new Float32Array(n);
    this.radial = new Float32Array(n);
    this.tangent = new Float32Array(n);
    this.size = new Float32Array(n);
    this.dSize = new Float32Array(n);
    this.rot = new Float32Array(n);
    this.dRot = new Float32Array(n);
    this.cr = new Float32Array(n);
    this.cg = new Float32Array(n);
    this.cb = new Float32Array(n);
    this.dr = new Float32Array(n);
    this.dg = new Float32Array(n);
    this.db = new Float32Array(n);
    this.life = new Float32Array(n);
    this.age = new Float32Array(n);

    this.fields = [
      this.px, this.py, this.vx, this.vy, this.radial, this.tangent,
      this.size, this.dSize, this.rot, this.dRot,
      this.cr, this.cg, this.cb, this.dr, this.dg, this.db,
      this.life, this.age,
    ];
  }

  /** cocos initParticle, straight down the list of fields */
  private spawn() {
    if (this.count >= this.max) return;
    const i = this.count++;
    const d = this.def;
    const g = d.GRAVITY ?? {};

    this.life[i] = Math.max(0.05, (d.life ?? 1) + (d.lifeVar ?? 0) * rnd());
    this.age[i] = 0;

    this.px[i] = (d.posX ?? 0) + (d.posVarX ?? 0) * rnd();
    this.py[i] = (d.posY ?? 0) + (d.posVarY ?? 0) * rnd();

    const start = rgb(d.startColor);
    const sVar = rgb(d.startColorVar);
    const end = rgb(d.endColor);
    const eVar = rgb(d.endColorVar);
    this.cr[i] = start.r + sVar.r * rnd();
    this.cg[i] = start.g + sVar.g * rnd();
    this.cb[i] = start.b + sVar.b * rnd();
    this.dr[i] = (end.r + eVar.r * rnd() - this.cr[i]) / this.life[i];
    this.dg[i] = (end.g + eVar.g * rnd() - this.cg[i]) / this.life[i];
    this.db[i] = (end.b + eVar.b * rnd() - this.cb[i]) / this.life[i];

    this.size[i] = Math.max(0, (d.startSize ?? 0) + (d.startSizeVar ?? 0) * rnd());
    // cocos reserves -1 for "same size all the way", and reading it as a real
    // target would shrink every particle to nothing
    this.dSize[i] =
      d.endSize === undefined || d.endSize < 0
        ? 0
        : (Math.max(0, d.endSize + (d.endSizeVar ?? 0) * rnd()) - this.size[i]) /
          this.life[i];

    this.rot[i] = (d.startSpin ?? 0) + (d.startSpinVar ?? 0) * rnd();
    this.dRot[i] =
      ((d.endSpin ?? 0) + (d.endSpinVar ?? 0) * rnd() - this.rot[i]) /
      this.life[i];

    // wz angles are degrees, and y runs down the screen the same way every
    // other map coordinate does
    const a = (((d.angle ?? 0) + (d.angleVar ?? 0) * rnd()) * Math.PI) / 180;
    const v = (g.speed ?? 0) + (g.speedVar ?? 0) * rnd();
    this.vx[i] = Math.cos(a) * v;
    this.vy[i] = Math.sin(a) * v;

    this.radial[i] = (g.radialAccel ?? 0) + (g.radialAccelVar ?? 0) * rnd();
    this.tangent[i] =
      (g.tangentialAccel ?? 0) + (g.tangentialAccelVar ?? 0) * rnd();

    if (g.rotationIsDir)
      this.rot[i] = (-Math.atan2(this.vy[i], this.vx[i]) * 180) / Math.PI;
  }

  private retire(i: number) {
    const last = --this.count;
    if (i === last) return;
    // the dead slot takes the last live one, so the array stays packed and the
    // caller re-reads index i
    for (const arr of this.fields) arr[i] = arr[last];
  }

  /** cocos update, gravity mode */
  step(dt: number) {
    const d = this.def;
    const g = d.GRAVITY ?? {};
    const gx = g.x ?? 0;
    const gy = g.y ?? 0;

    // a duration of -1 runs forever, anything else stops emitting when it is
    // up and lets what is already out live its life
    this.elapsed += dt;
    const done = (d.duration ?? -1) >= 0 && this.elapsed > (d.duration ?? -1);
    if (!done) {
      this.owed += this.rate * dt;
      while (this.owed >= 1) {
        this.owed -= 1;
        this.spawn();
      }
    }

    for (let i = 0; i < this.count; i++) {
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) {
        this.retire(i);
        i--;
        continue;
      }

      // radial is away from the emitter, tangential is a quarter turn off it.
      // both fall out of the particle's offset, so a particle sitting exactly
      // on the emitter gets neither
      let ax = gx;
      let ay = gy;
      const len = Math.hypot(this.px[i], this.py[i]);
      if (len > 0) {
        const nx = this.px[i] / len;
        const ny = this.py[i] / len;
        ax += nx * this.radial[i] - ny * this.tangent[i];
        ay += ny * this.radial[i] + nx * this.tangent[i];
      }
      this.vx[i] += ax * dt;
      this.vy[i] += ay * dt;

      // nexon's speed curve scales the travel rather than the velocity, so the
      // accelerations still build up underneath a particle that has stalled
      const t = this.age[i] / this.life[i];
      const scale = this.speed ? curveAt(this.speed, t) / 100 : 1;
      this.px[i] += this.vx[i] * scale * dt;
      this.py[i] += this.vy[i] * scale * dt;

      this.size[i] += this.dSize[i] * dt;
      this.rot[i] += this.dRot[i] * dt;
      this.cr[i] += this.dr[i] * dt;
      this.cg[i] += this.dg[i] * dt;
      this.cb[i] += this.db[i] * dt;
    }
  }

  /**
   * The texture with one colour laid over it.
   *
   * Multiply keeps whatever detail the texture's own rgb carries, and the
   * destination-in pass afterwards puts the original alpha back, since multiply
   * touches that too. A flat white glow comes out as a flat coloured one and a
   * textured sprite keeps its texture, without having to know which it was.
   */
  private tintOf(r: number, g: number, b: number) {
    const key = ((r >> TINT_SHIFT) << 12) | ((g >> TINT_SHIFT) << 6) | (b >> TINT_SHIFT);
    const hit = this.tints.get(key);
    if (hit) return hit;

    const { tw, th } = this.def;
    const c = document.createElement('canvas');
    c.width = tw;
    c.height = th;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.drawImage(this.tex, 0, 0, tw, th);
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, 0, tw, th);
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(this.tex, 0, 0, tw, th);
    }
    this.tints.set(key, c);
    return c;
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < this.count; i++) {
      const t = this.age[i] / this.life[i];
      const a = curveAt(this.alpha, t) / 255;
      const s = this.size[i];
      if (a <= 0 || s <= 0) continue;

      const tint = this.tintOf(
        clamp255(this.cr[i]),
        clamp255(this.cg[i]),
        clamp255(this.cb[i]),
      );
      const x = this.ox + this.px[i];
      const y = this.oy + this.py[i];

      ctx.globalAlpha = a > 1 ? 1 : a;
      // cocos builds a square quad from the size, so a texture that is not
      // square gets stretched into one. same as the game
      if (this.rot[i]) {
        const rad = (this.rot[i] * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        ctx.setTransform(cos, sin, -sin, cos, x, y);
        ctx.drawImage(tint, -s / 2, -s / 2, s, s);
      } else {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(tint, x - s / 2, y - s / 2, s, s);
      }
    }
  }

  /** true once nothing is left to draw and nothing more will be emitted */
  get spent() {
    const d = this.def.duration ?? -1;
    return this.count === 0 && d >= 0 && this.elapsed > d;
  }

  get live() {
    return this.count;
  }
}

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

/**
 * Runs a set of emitters and paints them.
 *
 * Additive and normal emitters are drawn in two passes rather than interleaved,
 * because switching the composite operation per emitter costs more than the
 * order is worth. Particles from one emitter never overlap another's in a way
 * that the order would show.
 */
export class ParticleField {
  private readonly emitters: Emitter[];

  constructor(emitters: Emitter[]) {
    this.emitters = emitters;
  }

  step(dt: number) {
    const d = dt > MAX_STEP ? MAX_STEP : dt;
    for (const e of this.emitters) e.step(d);
  }

  /** runs the simulation forward so the map opens already full of particles */
  warm(seconds: number, stepSize = 1 / 30) {
    for (let t = 0; t < seconds; t += stepSize) this.step(stepSize);
  }

  paint(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, w, h);

    for (const e of this.emitters) if (!e.additive) e.draw(ctx);
    ctx.globalCompositeOperation = 'lighter';
    for (const e of this.emitters) if (e.additive) e.draw(ctx);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  get count() {
    return this.emitters.reduce((n, e) => n + e.live, 0);
  }
}
