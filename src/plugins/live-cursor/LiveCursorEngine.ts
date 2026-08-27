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
 * Closed-form analytical integration invariant across 60Hz, 120Hz, 144Hz, and 240Hz.
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

// Pre-allocated static buffers for zero GC pressure in 120fps rAF loop
const STATIC_POINTS: Point2D[] = [
  { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 },
  { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 },
];
const LOWER_HULL: Point2D[] = [];
const UPPER_HULL: Point2D[] = [];
const RESULT_HULL: Point2D[] = [];

/**
 * Computes the 2D convex hull of 8 boundary points using the Monotone Chain algorithm.
 * 100% guarantees non-self-intersecting, perfectly manifold fluid polygons.
 */
function computeConvexHullZeroAlloc(points: Point2D[]): Point2D[] {
  const n = points.length;
  if (n <= 3) return points;

  points.sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));

  const cross = (o: Point2D, a: Point2D, b: Point2D) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  LOWER_HULL.length = 0;
  for (let i = 0; i < n; i++) {
    const p = points[i];
    while (LOWER_HULL.length >= 2 && cross(LOWER_HULL[LOWER_HULL.length - 2], LOWER_HULL[LOWER_HULL.length - 1], p) <= 0) {
      LOWER_HULL.pop();
    }
    LOWER_HULL.push(p);
  }

  UPPER_HULL.length = 0;
  for (let i = n - 1; i >= 0; i--) {
    const p = points[i];
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
 * Beyond-Neovide SOTA Live Physics Cursor Engine.
 * Features:
 * 1. 0ms Feedforward Velocity Injection (前馈初速度注入，触键即达极速跟手)
 * 2. Dual-Regime Distance-Adaptive Non-Linear Kinematics (双模态自适应动力学)
 * 3. Continuous Curvature Liquid Fillet Rounding (流体液态微圆角润滑)
 * 4. Aerodynamic Parallelogram Convex Hull Deformation (空气动力学单调流体平行四边形)
 */
export class LiveCursorEngine {
  // Destination Target in Document Space
  public targetX: number = 0;
  public targetY: number = 0;
  public targetW: number = 2.6;
  public targetH: number = 24;

  // Leading Spring (Ultra-fast, crisp 0ms response)
  private leadX = new Spring1D();
  private leadY = new Spring1D();
  private leadW = new Spring1D();
  private leadH = new Spring1D();

  // Trailing Spring (Fluid inertial trailing edge creating Neovide parallelogram)
  private trailX = new Spring1D();
  private trailY = new Spring1D();
  private trailW = new Spring1D();
  private trailH = new Spring1D();

  private isInitialized: boolean = false;
  private isFocused: boolean = true;
  private lastActivityTime: number = performance.now();
  private lastJumpDist: number = 0;

  private embers: EmberParticle[] = [];
  private ripples: WaterRipple[] = [];

  public setFocused(focused: boolean): void {
    this.isFocused = focused;
    this.lastActivityTime = performance.now();
  }

  public setTarget(x: number, y: number, width: number, height: number, immediate = false): void {
    const w = Math.max(2.2, width);
    const h = Math.max(16, height);

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

    if (immediate || !this.isInitialized) {
      this.teleport(x, y, w, h);
      this.isInitialized = true;
      return;
    }

    // 🌟 核心突破 1：前馈初速度注入（0ms Feedforward Velocity Injection）
    // 消除二阶弹簧起步时的 0 速度惯性迟滞，让按键在第一帧即以峰值初速度启动，实现绝对跟手感！
    const deltaX = x - this.leadX.val;
    const deltaY = y - this.leadY.val;
    if (jumpDist > 0.5 && jumpDist < 48) {
      // 短距离打字/方向键：注入精准临界前馈速度
      this.leadX.vel += Math.max(-650, Math.min(650, deltaX * 24));
      this.leadY.vel += Math.max(-650, Math.min(650, deltaY * 24));
    } else if (jumpDist >= 48) {
      // 中长距离跳跃/点击：注入高速喷射初速度
      this.leadX.vel += Math.max(-1800, Math.min(1800, deltaX * 16));
      this.leadY.vel += Math.max(-1800, Math.min(1800, deltaY * 16));
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
    this.leadX.val += dx;
    this.leadY.val += dy;
    this.leadX.target += dx;
    this.leadY.target += dy;

    this.trailX.val += dx;
    this.trailY.val += dy;
    this.trailX.target += dx;
    this.trailY.target += dy;

    this.targetX += dx;
    this.targetY += dy;
  }

  public teleport(x: number, y: number, width: number, height: number): void {
    const w = Math.max(2.2, width);
    const h = Math.max(16, height);
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

    let speedMultiplier = 1.0;
    if (config.speedMode === 'gentle') {
      speedMultiplier = 0.85;
    } else if (config.speedMode === 'snappy') {
      speedMultiplier = 1.30;
    }

    const timeScale = 0.08 / animLength;

    // 🌟 核心突破 2：双模态非线性自适应频率（Dual-Regime Adaptive Frequency）
    // 短距离打字区间采用高频临界阻尼（56 rad/s, 0延迟）；中长距离跳跃采用流体大阻尼（24 rad/s，奢华平行四边形）
    let omegaLead = 52.0 * timeScale * speedMultiplier;
    let omegaTrail = (26.0 - trailFactor * 6.0) * timeScale * speedMultiplier;
    let zetaLead = 0.98;
    let zetaTrail = 0.90;

    if (this.lastJumpDist <= 32) {
      // 微距打字区间：临界阻尼极致跟手，无过冲
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
    const isMoving =
      Math.abs(this.targetX - this.leadX.val) > 0.05 ||
      Math.abs(this.targetY - this.leadY.val) > 0.05 ||
      Math.abs(this.targetX - this.trailX.val) > 0.05 ||
      Math.abs(this.targetY - this.trailY.val) > 0.05 ||
      Math.abs(this.leadX.vel) > 0.06 ||
      Math.abs(this.leadY.vel) > 0.06 ||
      Math.abs(this.trailX.vel) > 0.06 ||
      Math.abs(this.trailY.vel) > 0.06;

    const hasParticles = this.embers.length > 0 || this.ripples.length > 0;
    const shouldBlink = this.isFocused && config.enabled && config.blinkMode !== 'solid';

    return isMoving || hasParticles || shouldBlink;
  }

  public draw(ctx: CanvasRenderingContext2D, config: LiveCursorConfig): void {
    const isMoving =
      Math.abs(this.targetX - this.leadX.val) > 0.15 ||
      Math.abs(this.targetY - this.leadY.val) > 0.15 ||
      Math.abs(this.targetX - this.trailX.val) > 0.15 ||
      Math.abs(this.targetY - this.trailY.val) > 0.15;

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

    let idleAlpha = 1.0;
    if (!this.isFocused) {
      idleAlpha = 0.4;
    } else if (!isMoving) {
      const elapsed = (performance.now() - this.lastActivityTime) / 1000;
      
      if (config.blinkMode === 'blink') {
        const cycle = Math.max(0.4, config.breatheCycle || 1.0);
        if (elapsed < 0.35) {
          idleAlpha = 1.0;
        } else {
          const phase = (elapsed - 0.35) % cycle;
          idleAlpha = phase < (cycle * 0.52) ? 1.0 : 0.0;
        }
      } else if (config.blinkMode === 'smooth') {
        const cycle = Math.max(0.5, config.breatheCycle || 1.2);
        if (elapsed < 0.30) {
          idleAlpha = 1.0;
        } else {
          const phase = ((elapsed - 0.30) / cycle) * Math.PI * 2;
          idleAlpha = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(phase - Math.PI / 2));
        }
      } else {
        idleAlpha = 1.0;
      }
    }

    if (idleAlpha <= 0.01) return;

    const cursorColorHex =
      config.color === 'auto' || !config.color
        ? resolvedThemeColor
        : config.color;

    ctx.save();
    ctx.globalAlpha = idleAlpha;

    // Lead Box Corners
    const lx1 = this.leadX.val;
    const ly1 = this.leadY.val;
    const lx2 = this.leadX.val + this.leadW.val;
    const ly2 = this.leadY.val + this.leadH.val;

    // Trail Box Corners
    const tx1 = this.trailX.val;
    const ty1 = this.trailY.val;
    const tx2 = this.trailX.val + this.trailW.val;
    const ty2 = this.trailY.val + this.trailH.val;

    // Aerodynamic velocity skew for pure vertical jumps
    const vy = this.leadY.vel;
    const skewX = Math.max(-10, Math.min(10, vy * 0.010));

    STATIC_POINTS[0].x = lx1; STATIC_POINTS[0].y = ly1;
    STATIC_POINTS[1].x = lx2; STATIC_POINTS[1].y = ly1;
    STATIC_POINTS[2].x = lx2; STATIC_POINTS[2].y = ly2;
    STATIC_POINTS[3].x = lx1; STATIC_POINTS[3].y = ly2;

    STATIC_POINTS[4].x = tx1 - skewX; STATIC_POINTS[4].y = ty1;
    STATIC_POINTS[5].x = tx2 - skewX; STATIC_POINTS[5].y = ty1;
    STATIC_POINTS[6].x = tx2 + skewX; STATIC_POINTS[6].y = ty2;
    STATIC_POINTS[7].x = tx1 + skewX; STATIC_POINTS[7].y = ty2;

    const hull = computeConvexHullZeroAlloc(STATIC_POINTS);

    if (config.glow) {
      ctx.shadowColor = cursorColorHex;
      ctx.shadowBlur = isMoving ? 14 : 8;
    }

    ctx.fillStyle = cursorColorHex;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // 🌟 核心突破 3：水银流体连续圆角连接（Liquid Mercury Fillet Rendering）
    // 相比 Neovide 锋利锯齿直角，注入柔和流体圆角微倒角，丝滑度拉满
    const cornerRadius = Math.min(2.5, this.leadW.val * 0.5);

    if (hull.length >= 3) {
      ctx.beginPath();
      const hLen = hull.length;
      for (let i = 0; i < hLen; i++) {
        const p0 = hull[(i - 1 + hLen) % hLen];
        const p1 = hull[i];
        const p2 = hull[(i + 1) % hLen];

        // Compute corner rounding control points
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
        ctx.roundRect(lx1, ly1, this.leadW.val, this.leadH.val, cornerRadius);
        ctx.fill();
      } else {
        ctx.fillRect(lx1, ly1, this.leadW.val, this.leadH.val);
      }
    }

    ctx.restore();
  }

  public render(ctx: CanvasRenderingContext2D, config: LiveCursorConfig): void {
    this.draw(ctx, config);
  }
}
