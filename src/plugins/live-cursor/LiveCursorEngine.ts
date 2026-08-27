/**
 * Stream Color Preset Identifiers.
 */
export type StreamPresetId = 'theme' | 'cyan-violet' | 'ice-blue' | 'emerald' | 'amber-rose' | 'sakura' | 'mono' | 'custom';

/**
 * Configuration options for the LiveCursorEngine.
 */
export interface LiveCursorConfig {
  enabled: boolean;
  shape: 'beam' | 'block' | 'underline';
  color: string;
  themeColor: string;
  animationLength: number;
  trailSize: number;
  vfxMode: 'pure' | 'embers' | 'ripples' | 'feather';
  blinkMode: 'smooth' | 'solid' | 'blink';
  breatheCycle: number;
  speedMode: 'gentle' | 'balanced' | 'snappy';
  physicsMode?: 'fluid' | 'ribbon' | 'quantum';
  luminescence?: boolean;
  inlineSkew?: boolean;
  streamPreset?: StreamPresetId;
  streamHeadColor?: string;
  streamTailColor?: string;
  glow: boolean;
}

interface Point2D {
  x: number;
  y: number;
}

interface EmberParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  phase: number;
}

interface WaterRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

/**
 * 1D Exact Closed-Form 2nd-Order Harmonic Spring Damper.
 * Invariant across 60Hz, 120Hz, 144Hz, and 240Hz frame rates.
 */
class Spring1D {
  public val: number = 0;
  public vel: number = 0;
  public target: number = 0;

  public reset(val: number): void {
    this.val = val;
    this.vel = 0;
    this.target = val;
  }

  public step(dt: number, omega: number, zeta: number): void {
    const d = this.val - this.target;
    if (Math.abs(d) < 0.001 && Math.abs(this.vel) < 0.001) {
      this.val = this.target;
      this.vel = 0;
      return;
    }

    if (zeta < 0.999) {
      const omegaD = omega * Math.sqrt(1 - zeta * zeta);
      const decay = Math.exp(-zeta * omega * dt);
      const cosVal = Math.cos(omegaD * dt);
      const sinVal = Math.sin(omegaD * dt);
      const factor = (this.vel + zeta * omega * d) / omegaD;

      this.val = this.target + decay * (d * cosVal + factor * sinVal);
      this.vel = decay * (this.vel * cosVal - (d * omegaD + zeta * omega * factor) * sinVal);
    } else {
      const decay = Math.exp(-omega * dt);
      const factor = this.vel + omega * d;
      this.val = this.target + decay * (d + factor * dt);
      this.vel = decay * (this.vel - factor * omega * dt);
    }
  }
}

/**
 * Multi-node spine element for 'ribbon' mode.
 */
class SpineNode {
  public x = new Spring1D();
  public y = new Spring1D();
  public w = new Spring1D();
  public h = new Spring1D();

  public reset(x: number, y: number, w: number, h: number): void {
    this.x.reset(x);
    this.y.reset(y);
    this.w.reset(w);
    this.h.reset(h);
  }
}

// Pre-allocated static buffers for zero GC pressure in 120fps rAF loop
const STATIC_POINTS: Point2D[] = [
  { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 },
  { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 },
  { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 },
  { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 },
];
const SORT_BUFFER: Point2D[] = [];
const LOWER_HULL: Point2D[] = [];
const UPPER_HULL: Point2D[] = [];
const RESULT_HULL: Point2D[] = [];

/**
 * Computes 2D convex hull of points using the Monotone Chain algorithm.
 * 100% Zero-allocation across all frame loops.
 */
function computeConvexHullZeroAlloc(points: Point2D[], count: number): Point2D[] {
  if (count <= 3) {
    RESULT_HULL.length = 0;
    for (let i = 0; i < count; i++) RESULT_HULL.push(points[i]);
    return RESULT_HULL;
  }

  SORT_BUFFER.length = 0;
  for (let i = 0; i < count; i++) SORT_BUFFER.push(points[i]);
  SORT_BUFFER.sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));

  const cross = (o: Point2D, a: Point2D, b: Point2D) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  LOWER_HULL.length = 0;
  for (let i = 0; i < count; i++) {
    const p = SORT_BUFFER[i];
    while (LOWER_HULL.length >= 2 && cross(LOWER_HULL[LOWER_HULL.length - 2], LOWER_HULL[LOWER_HULL.length - 1], p) <= 0) {
      LOWER_HULL.pop();
    }
    LOWER_HULL.push(p);
  }

  UPPER_HULL.length = 0;
  for (let i = count - 1; i >= 0; i--) {
    const p = SORT_BUFFER[i];
    while (UPPER_HULL.length >= 2 && cross(UPPER_HULL[UPPER_HULL.length - 2], UPPER_HULL[UPPER_HULL.length - 1], p) <= 0) {
      UPPER_HULL.pop();
    }
    UPPER_HULL.push(p);
  }

  LOWER_HULL.pop();
  UPPER_HULL.pop();

  RESULT_HULL.length = 0;
  for (let i = 0; i < LOWER_HULL.length; i++) RESULT_HULL.push(LOWER_HULL[i]);
  for (let i = 0; i < UPPER_HULL.length; i++) RESULT_HULL.push(UPPER_HULL[i]);

  return RESULT_HULL;
}

/**
 * Live Physics Cursor Engine.
 * Supports:
 * 1. 3 switchable physics models ('fluid', 'ribbon', 'quantum')
 * 2. Inspiration Flow post-typing radiant illumination
 * 3. Directional multi-color stream gradient
 * 4. Inline Aerodynamic Skew Parallelogram (行内倾角切变平行四边形)
 * 5. Full support for beam, block, and underline cursor geometries
 */
export class LiveCursorEngine {
  public targetX: number = 0;
  public targetY: number = 0;
  public targetW: number = 2.6;
  public targetH: number = 24;

  // 2-Body Springs for 'fluid' / 'quantum'
  private leadX = new Spring1D();
  private leadY = new Spring1D();
  private leadW = new Spring1D();
  private leadH = new Spring1D();

  private trailX = new Spring1D();
  private trailY = new Spring1D();
  private trailW = new Spring1D();
  private trailH = new Spring1D();

  // 4-Node Springs for 'ribbon'
  private spineNodes: SpineNode[] = [
    new SpineNode(),
    new SpineNode(),
    new SpineNode(),
    new SpineNode(),
  ];

  // Dynamic typing aura intensity
  private typingAura: number = 0;

  private isInitialized: boolean = false;
  private isFocused: boolean = true;
  private lastActivityTime: number = performance.now();
  private lastJumpDist: number = 0;
  private renderedAlpha: number = 1.0;

  private embers: EmberParticle[] = [];
  private ripples: WaterRipple[] = [];

  public setFocused(focused: boolean): void {
    this.isFocused = focused;
    this.lastActivityTime = performance.now();
  }

  public setTarget(x: number, y: number, width: number, height: number, immediate = false): void {
    const w = Math.max(2.2, width);
    const h = Math.max(2.2, height);

    const dx = Math.abs(x - this.targetX);
    const dy = Math.abs(y - this.targetY);
    if (this.isInitialized && dx < 0.2 && dy < 0.2 && Math.abs(w - this.targetW) < 0.2 && Math.abs(h - this.targetH) < 0.2) {
      return;
    }

    const prevX = this.targetX;
    const prevY = this.targetY;
    const jumpDist = Math.hypot(x - prevX, y - prevY);
    this.lastJumpDist = jumpDist;

    this.targetX = x;
    this.targetY = y;
    this.targetW = w;
    this.targetH = h;
    this.lastActivityTime = performance.now();

    this.leadX.target = x;
    this.leadY.target = y;
    this.leadW.target = w;
    this.leadH.target = h;

    this.trailX.target = x;
    this.trailY.target = y;
    this.trailW.target = w;
    this.trailH.target = h;

    this.spineNodes[0].x.target = x;
    this.spineNodes[0].y.target = y;
    this.spineNodes[0].w.target = w;
    this.spineNodes[0].h.target = h;

    if (immediate || !this.isInitialized) {
      this.teleport(x, y, w, h);
      this.isInitialized = true;
      return;
    }

    // 0ms Feedforward Velocity Injection
    const deltaX = x - this.leadX.val;
    const deltaY = y - this.leadY.val;
    if (jumpDist > 0.5 && jumpDist < 48) {
      const vX = Math.max(-650, Math.min(650, deltaX * 24));
      const vY = Math.max(-650, Math.min(650, deltaY * 24));
      this.leadX.vel += vX;
      this.leadY.vel += vY;
      this.spineNodes[0].x.vel += vX;
      this.spineNodes[0].y.vel += vY;
    } else if (jumpDist >= 48) {
      const vX = Math.max(-1800, Math.min(1800, deltaX * 16));
      const vY = Math.max(-1800, Math.min(1800, deltaY * 16));
      this.leadX.vel += vX;
      this.leadY.vel += vY;
      this.spineNodes[0].x.vel += vX;
      this.spineNodes[0].y.vel += vY;
    }

    const lineJump = Math.abs(y - prevY) > h * 0.6;

    if (jumpDist >= 6) {
      const count = Math.min(3, Math.max(1, Math.floor(jumpDist / 20) + 1));
      this.spawnEmbers(x + w / 2, y + h / 2, count);
    }

    if (lineJump || jumpDist >= 32) {
      this.addWaterRipple(x + w / 2, y + h / 2);
    }
  }

  public shift(dx: number, dy: number): void {
    this.targetX += dx;
    this.targetY += dy;

    this.leadX.val += dx;
    this.leadY.val += dy;
    this.leadX.target += dx;
    this.leadY.target += dy;

    this.trailX.val += dx;
    this.trailY.val += dy;
    this.trailX.target += dx;
    this.trailY.target += dy;

    for (let i = 0; i < 4; i++) {
      const n = this.spineNodes[i];
      n.x.val += dx;
      n.y.val += dy;
      n.x.target += dx;
      n.y.target += dy;
    }
  }

  public teleport(x: number, y: number, width: number, height: number): void {
    const w = Math.max(2.2, width);
    const h = Math.max(2.2, height);
    this.targetX = x;
    this.targetY = y;
    this.targetW = w;
    this.targetH = h;

    this.leadX.reset(x);
    this.leadY.reset(y);
    this.leadW.reset(w);
    this.leadH.reset(h);

    this.trailX.reset(x);
    this.trailY.reset(y);
    this.trailW.reset(w);
    this.trailH.reset(h);

    for (let i = 0; i < 4; i++) {
      this.spineNodes[i].reset(x, y, w, h);
    }

    this.typingAura = 0;
    this.lastActivityTime = performance.now();
  }

  private spawnEmbers(x: number, y: number, count = 2): void {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      const speed = 0.6 + Math.random() * 1.6;
      const life = 20 + Math.random() * 16;
      this.embers.push({
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.2 + Math.random() * 1.2,
        alpha: 0.9,
        life,
        maxLife: life,
        phase: Math.random() * Math.PI * 2,
      });
    }

    if (this.embers.length > 30) {
      this.embers.splice(0, this.embers.length - 30);
    }
  }

  private addWaterRipple(x: number, y: number): void {
    this.ripples.push({
      x,
      y,
      radius: 3,
      maxRadius: 24,
      alpha: 0.75,
    });

    if (this.ripples.length > 4) {
      this.ripples.splice(0, this.ripples.length - 4);
    }
  }

  public update(dt: number, config: LiveCursorConfig): void {
    const animLength = Math.max(0.02, config.animationLength || 0.08);
    const trailFactor = Math.max(0.2, config.trailSize || 0.75);
    const clampedDt = Math.max(0.001, Math.min(dt, 0.05));
    const frameScale = clampedDt * 60;
    const mode = config.physicsMode || 'fluid';

    let speedMultiplier = 1.0;
    if (config.speedMode === 'gentle') {
      speedMultiplier = 0.85;
    } else if (config.speedMode === 'snappy') {
      speedMultiplier = 1.30;
    }

    const timeScale = 0.08 / animLength;

    // Decay typing aura
    if (this.typingAura > 0.001) {
      this.typingAura = Math.max(0, this.typingAura - clampedDt * 1.6);
    }

    // Leader step
    let omega0 = 54.0 * timeScale * speedMultiplier;
    let zeta0 = 0.98;
    if (this.lastJumpDist <= 32) {
      omega0 = 60.0 * timeScale * speedMultiplier;
      zeta0 = 1.0;
    }

    this.spineNodes[0].x.step(clampedDt, omega0, zeta0);
    this.spineNodes[0].y.step(clampedDt, omega0, zeta0);
    this.spineNodes[0].w.step(clampedDt, omega0, 0.98);
    this.spineNodes[0].h.step(clampedDt, omega0, 0.98);

    // Spine Cascade
    const omegas = [
      omega0,
      (40.0 - trailFactor * 3.0) * timeScale * speedMultiplier,
      (30.0 - trailFactor * 5.0) * timeScale * speedMultiplier,
      (22.0 - trailFactor * 6.0) * timeScale * speedMultiplier,
    ];
    const zetas = [zeta0, 0.94, 0.90, 0.86];

    for (let i = 1; i < 4; i++) {
      const parent = this.spineNodes[i - 1];
      const current = this.spineNodes[i];
      current.x.target = parent.x.val;
      current.y.target = parent.y.val;
      current.w.target = parent.w.val;
      current.h.target = parent.h.val;
      current.x.step(clampedDt, omegas[i], zetas[i]);
      current.y.step(clampedDt, omegas[i], zetas[i]);
      current.w.step(clampedDt, omegas[i], 0.94);
      current.h.step(clampedDt, omegas[i], 0.94);
    }

    // 2-Body Step for Fluid / Quantum (always synchronized)
    let omegaLead = 52.0 * timeScale * speedMultiplier;
    let omegaTrail = (26.0 - trailFactor * 6.0) * timeScale * speedMultiplier;
    let zetaLead = 0.98;
    let zetaTrail = 0.90;

    if (mode === 'quantum') {
      omegaLead = 64.0 * timeScale * speedMultiplier;
      omegaTrail = 50.0 * timeScale * speedMultiplier;
      zetaLead = 1.0;
      zetaTrail = 0.98;
    } else if (this.lastJumpDist <= 32) {
      omegaLead = 58.0 * timeScale * speedMultiplier;
      omegaTrail = 38.0 * timeScale * speedMultiplier;
      zetaLead = 1.0;
      zetaTrail = 0.95;
    }

    this.leadX.step(clampedDt, omegaLead, zetaLead);
    this.leadY.step(clampedDt, omegaLead, zetaLead);
    this.leadW.step(clampedDt, omegaLead, 0.98);
    this.leadH.step(clampedDt, omegaLead, 0.98);

    this.trailX.step(clampedDt, omegaTrail, zetaTrail);
    this.trailY.step(clampedDt, omegaTrail, zetaTrail);
    this.trailW.step(clampedDt, omegaTrail, 0.94);
    this.trailH.step(clampedDt, omegaTrail, 0.94);

    // Update Embers
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const p = this.embers[i];
      p.phase += 0.08 * frameScale;
      p.x += (p.vx + Math.sin(p.phase) * 0.2) * frameScale;
      p.y += p.vy * frameScale;
      p.vx *= Math.pow(0.95, frameScale);
      p.vy *= Math.pow(0.96, frameScale);
      p.life -= frameScale;
      p.alpha = Math.pow(Math.max(0, p.life) / p.maxLife, 1.2);
      if (p.life <= 0) {
        this.embers.splice(i, 1);
      }
    }

    // Update Water Ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      const radiusStep = ((r.maxRadius - r.radius) * 0.18 + 0.5) * frameScale;
      r.radius += radiusStep;
      r.alpha *= Math.pow(0.88, frameScale);
      if (r.alpha <= 0.02 || r.radius >= r.maxRadius) {
        this.ripples.splice(i, 1);
      }
    }
  }

  public isAnimating(config: LiveCursorConfig): boolean {
    const mode = config.physicsMode || 'fluid';
    let isMoving = false;

    if (mode === 'ribbon') {
      for (let i = 0; i < 4; i++) {
        const n = this.spineNodes[i];
        if (
          Math.abs(n.x.target - n.x.val) > 0.05 ||
          Math.abs(n.y.target - n.y.val) > 0.05 ||
          Math.abs(n.x.vel) > 0.06 ||
          Math.abs(n.y.vel) > 0.06
        ) {
          isMoving = true;
          break;
        }
      }
    } else {
      isMoving =
        Math.abs(this.targetX - this.leadX.val) > 0.05 ||
        Math.abs(this.targetY - this.leadY.val) > 0.05 ||
        Math.abs(this.targetX - this.trailX.val) > 0.05 ||
        Math.abs(this.targetY - this.trailY.val) > 0.05 ||
        Math.abs(this.leadX.vel) > 0.06 ||
        Math.abs(this.leadY.vel) > 0.06 ||
        Math.abs(this.trailX.vel) > 0.06 ||
        Math.abs(this.trailY.vel) > 0.06;
    }

    const hasParticles = this.embers.length > 0 || this.ripples.length > 0;
    const hasAura = this.typingAura > 0.01;
    const shouldBlink = this.isFocused && config.enabled && config.blinkMode !== 'solid';

    return isMoving || hasParticles || hasAura || shouldBlink;
  }

  public draw(ctx: CanvasRenderingContext2D, config: LiveCursorConfig): void {
    const mode = config.physicsMode || 'fluid';
    let isMoving = false;

    if (mode === 'ribbon') {
      for (let i = 0; i < 4; i++) {
        const n = this.spineNodes[i];
        if (Math.abs(n.x.target - n.x.val) > 0.15 || Math.abs(n.y.target - n.y.val) > 0.15) {
          isMoving = true;
          break;
        }
      }
    } else {
      isMoving =
        Math.abs(this.targetX - this.leadX.val) > 0.15 ||
        Math.abs(this.targetY - this.leadY.val) > 0.15 ||
        Math.abs(this.targetX - this.trailX.val) > 0.15 ||
        Math.abs(this.targetY - this.trailY.val) > 0.15;
    }

    const resolvedThemeColor = config.themeColor || '#a78bfa';

    if (this.ripples.length > 0 && config.vfxMode === 'ripples') {
      ctx.save();
      for (const r of this.ripples) {
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `${resolvedThemeColor}${Math.floor(r.alpha * 120).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      ctx.restore();
    }

    if (this.embers.length > 0 && (config.vfxMode === 'embers' || config.vfxMode === 'feather')) {
      ctx.save();
      for (const p of this.embers) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${resolvedThemeColor}${Math.floor(p.alpha * 220).toString(16).padStart(2, '0')}`;
        ctx.shadowColor = resolvedThemeColor;
        ctx.shadowBlur = 6;
        ctx.fill();
      }
      ctx.restore();
    }

    const isBlock = config.shape === 'block';
    const baseAlpha = isBlock ? 0.48 : (config.shape === 'underline' ? 0.90 : 1.0);

    let targetIdleAlpha = 1.0;
    if (!this.isFocused) {
      targetIdleAlpha = 0.45;
    } else {
      const elapsed = (performance.now() - this.lastActivityTime) / 1000;
      
      if (config.blinkMode === 'blink') {
        const cycle = Math.max(0.4, config.breatheCycle || 1.0);
        if (elapsed < 0.25) {
          targetIdleAlpha = 1.0;
        } else {
          const phase = (elapsed - 0.25) % cycle;
          targetIdleAlpha = phase < (cycle * 0.52) ? 1.0 : 0.0;
        }
      } else if (config.blinkMode === 'smooth') {
        const cycle = Math.max(0.6, config.breatheCycle || 1.2);
        // Pure gentle breathing pulse (0.76 -> 1.0), zero sudden dimming
        const phase = (elapsed / cycle) * Math.PI * 2;
        const sineFactor = 0.5 + 0.5 * Math.cos(phase);
        if (isBlock) {
          targetIdleAlpha = 0.86 + 0.14 * sineFactor;
        } else {
          targetIdleAlpha = 0.76 + 0.24 * sineFactor;
        }
      } else {
        targetIdleAlpha = 1.0;
      }
    }

    const finalTargetAlpha = Math.max(0, Math.min(1, baseAlpha * targetIdleAlpha));
    this.renderedAlpha = this.renderedAlpha + (finalTargetAlpha - this.renderedAlpha) * 0.25;

    if (this.renderedAlpha <= 0.01) return;

    const cursorColorHex =
      config.color === 'auto' || !config.color
        ? resolvedThemeColor
        : config.color;

    ctx.save();
    ctx.globalAlpha = this.renderedAlpha;

    let hull: Point2D[];
    let headW = this.leadW.val;
    let headH = this.leadH.val;
    let headX = this.leadX.val;
    let headY = this.leadY.val;
    let tailX = this.trailX.val;
    let tailY = this.trailY.val;

    if (mode === 'ribbon') {
      headW = this.spineNodes[0].w.val;
      headH = this.spineNodes[0].h.val;
      headX = this.spineNodes[0].x.val;
      headY = this.spineNodes[0].y.val;
      tailX = this.spineNodes[3].x.val;
      tailY = this.spineNodes[3].y.val;

      for (let i = 0; i < 4; i++) {
        const n = this.spineNodes[i];
        const nx1 = n.x.val;
        const ny1 = n.y.val;
        const nx2 = nx1 + n.w.val;
        const ny2 = ny1 + n.h.val;
        const skew = i === 3 ? Math.max(-10, Math.min(10, this.spineNodes[0].y.vel * 0.010)) : 0;

        STATIC_POINTS[i * 4 + 0].x = nx1 - skew; STATIC_POINTS[i * 4 + 0].y = ny1;
        STATIC_POINTS[i * 4 + 1].x = nx2 - skew; STATIC_POINTS[i * 4 + 1].y = ny1;
        STATIC_POINTS[i * 4 + 2].x = nx2 + skew; STATIC_POINTS[i * 4 + 2].y = ny2;
        STATIC_POINTS[i * 4 + 3].x = nx1 + skew; STATIC_POINTS[i * 4 + 3].y = ny2;
      }
      hull = computeConvexHullZeroAlloc(STATIC_POINTS, 16);
    } else {
      const lx1 = this.leadX.val;
      const ly1 = this.leadY.val;
      const lx2 = lx1 + this.leadW.val;
      const ly2 = ly1 + this.leadH.val;

      const tx1 = this.trailX.val;
      const ty1 = this.trailY.val;
      const tx2 = tx1 + this.trailW.val;
      const ty2 = ty1 + this.trailH.val;

      const vx = this.leadX.vel;
      const vy = this.leadY.vel;

      // 🌟 2D Aerodynamic Skew:
      // Vertical leap induces horizontal trail skew
      const skewXFromY = Math.max(-10, Math.min(10, vy * 0.010));
      // Horizontal typing induces forward italic aerodynamic parallelogram skew
      const enableInlineSkew = config.inlineSkew !== false && config.shape !== 'underline';
      const skewXFromX = enableInlineSkew ? Math.max(-7, Math.min(7, vx * 0.010)) : 0;

      STATIC_POINTS[0].x = lx1 + skewXFromX; STATIC_POINTS[0].y = ly1;
      STATIC_POINTS[1].x = lx2 + skewXFromX; STATIC_POINTS[1].y = ly1;
      STATIC_POINTS[2].x = lx2 - skewXFromX; STATIC_POINTS[2].y = ly2;
      STATIC_POINTS[3].x = lx1 - skewXFromX; STATIC_POINTS[3].y = ly2;

      STATIC_POINTS[4].x = tx1 - skewXFromY; STATIC_POINTS[4].y = ty1;
      STATIC_POINTS[5].x = tx2 - skewXFromY; STATIC_POINTS[5].y = ty1;
      STATIC_POINTS[6].x = tx2 + skewXFromY; STATIC_POINTS[6].y = ty2;
      STATIC_POINTS[7].x = tx1 + skewXFromY; STATIC_POINTS[7].y = ty2;

      hull = computeConvexHullZeroAlloc(STATIC_POINTS, 8);
    }

    if (config.glow) {
      ctx.shadowColor = cursorColorHex;
      ctx.shadowBlur = isBlock ? 3 : 6;
    }

    // 🌟 可配置流光色彩渐变 (Configurable Stream Gradient)
    let fillStyle: string | CanvasGradient = cursorColorHex;
    const flightDist = Math.hypot(headX - tailX, headY - tailY);
    if (isMoving && flightDist > 14 && config.luminescence !== false) {
      const grad = ctx.createLinearGradient(headX, headY, tailX, tailY);
      
      const preset = config.streamPreset || 'theme';
      let hColor = resolvedThemeColor;
      let mColor = resolvedThemeColor;
      let tColor = `${resolvedThemeColor}44`;

      if (preset === 'theme') {
        hColor = resolvedThemeColor;
        mColor = `${resolvedThemeColor}cc`;
        tColor = `${resolvedThemeColor}33`;
      } else if (preset === 'cyan-violet') {
        hColor = '#38bdf8'; mColor = '#c084fc'; tColor = '#a78bfa';
      } else if (preset === 'ice-blue') {
        hColor = '#67e8f9'; mColor = '#38bdf8'; tColor = '#3b82f6';
      } else if (preset === 'emerald') {
        hColor = '#6ee7b7'; mColor = '#10b981'; tColor = '#059669';
      } else if (preset === 'amber-rose') {
        hColor = '#fde047'; mColor = '#fb923c'; tColor = '#f43f5e';
      } else if (preset === 'sakura') {
        hColor = '#fbcfe8'; mColor = '#f472b6'; tColor = '#db2777';
      } else if (preset === 'mono') {
        hColor = cursorColorHex; mColor = `${cursorColorHex}dd`; tColor = `${cursorColorHex}44`;
      } else if (preset === 'custom') {
        hColor = config.streamHeadColor || '#38bdf8';
        tColor = config.streamTailColor || '#a78bfa';
        mColor = `${hColor}cc`;
      }

      grad.addColorStop(0, hColor);
      grad.addColorStop(0.55, mColor);
      grad.addColorStop(1, tColor);
      fillStyle = grad;
    }

    ctx.fillStyle = fillStyle;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const cornerRadius = Math.min(2.5, headW * 0.5, headH * 0.5);

    if (hull.length >= 3) {
      ctx.beginPath();
      const hLen = hull.length;
      for (let i = 0; i < hLen; i++) {
        const p0 = hull[(i - 1 + hLen) % hLen];
        const p1 = hull[i];
        const p2 = hull[(i + 1) % hLen];

        const v1x = p0.x - p1.x;
        const v1y = p0.y - p1.y;
        const v2x = p2.x - p1.x;
        const v2y = p2.y - p1.y;
        const len1 = Math.hypot(v1x, v1y) || 1;
        const len2 = Math.hypot(v2x, v2y) || 1;

        const r = Math.min(cornerRadius, len1 * 0.35, len2 * 0.35);
        const startX = p1.x + (v1x / len1) * r;
        const startY = p1.y + (v1y / len1) * r;
        const endX = p1.x + (v2x / len2) * r;
        const endY = p1.y + (v2y / len2) * r;

        if (i === 0) {
          ctx.moveTo(startX, startY);
        } else {
          ctx.lineTo(startX, startY);
        }
        ctx.quadraticCurveTo(p1.x, p1.y, endX, endY);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(headX, headY, headW, headH, cornerRadius);
        ctx.fill();
      } else {
        ctx.fillRect(headX, headY, headW, headH);
      }
    }

    ctx.restore();
  }

  public render(ctx: CanvasRenderingContext2D, config: LiveCursorConfig): void {
    this.draw(ctx, config);
  }
}
