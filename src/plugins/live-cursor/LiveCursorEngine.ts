export interface LiveCursorConfig {
  enabled: boolean;
  shape: 'beam' | 'block' | 'underline';
  color: string; // 'auto' or hex code
  themeColor: string; // resolved theme color fallback
  animationLength: number; // in seconds, e.g. 0.08s
  trailSize: number;        // trail factor, e.g. 0.75
  vfxMode: 'pure' | 'embers' | 'ripples' | 'feather';
  blinkMode: 'smooth' | 'solid' | 'blink';
  breatheCycle: number;     // breathing cycle in seconds (e.g. 0.5s - 2.5s)
  speedMode: 'gentle' | 'balanced' | 'snappy'; // movement cadence
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
 * 2D 凸包计算 (Monotone Chain Convex Hull)
 */
function computeConvexHull(points: Point2D[]): Point2D[] {
  if (points.length <= 3) return points;

  const sorted = [...points].sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));

  const cross = (o: Point2D, a: Point2D, b: Point2D) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: Point2D[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Point2D[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * 🌟 Novelite 自研 Live 灵感光标物理引擎
 * - 匀速平顺垂直巡航：连续按上下键时不会越跳越快或失控暴冲
 * - 临界阻尼柔和阻尼：微字符瞬态响应，长距离平稳滑行
 */
export class LiveCursorEngine {
  // Destination
  public targetX: number = 0;
  public targetY: number = 0;
  public targetW: number = 2.6;
  public targetH: number = 24;

  // Lead Box (Leading Edge)
  public lx: number = 0;
  public ly: number = 0;
  public lw: number = 2.6;
  public lh: number = 24;

  // Trail Box (Trailing Edge)
  public tx: number = 0;
  public ty: number = 0;
  public tw: number = 2.6;
  public th: number = 24;

  private isInitialized: boolean = false;
  private lastActivityTime: number = performance.now();

  // Particle systems
  private embers: EmberParticle[] = [];
  private ripples: WaterRipple[] = [];

  public setTarget(x: number, y: number, width: number, height: number, immediate = false): void {
    const w = Math.max(2.2, width);
    const h = Math.max(16, height);
    this.targetX = x;
    this.targetY = y;
    this.targetW = w;
    this.targetH = h;
    this.lastActivityTime = performance.now();

    if (immediate || !this.isInitialized) {
      this.teleport(x, y, w, h);
      this.isInitialized = true;
      return;
    }

    const dist = Math.hypot(x - this.lx, y - this.ly);
    const lineJump = Math.abs(y - this.ly) > h * 0.6;

    // Embers Particle Spawning on motion
    if (dist >= 3) {
      const count = Math.min(3, Math.max(1, Math.floor(dist / 14) + 1));
      this.spawnEmbers(x, y + h / 2, count);
    }

    // Inkstone Water Ripples on line wraps / jumps
    if (lineJump || dist >= 22) {
      this.addWaterRipple(x + w / 2, y + h / 2);
    }
  }

  public teleport(x: number, y: number, width: number, height: number): void {
    const w = Math.max(2.2, width);
    const h = Math.max(16, height);
    this.targetX = x;
    this.targetY = y;
    this.targetW = w;
    this.targetH = h;

    this.lx = x;
    this.ly = y;
    this.lw = w;
    this.lh = h;

    this.tx = x;
    this.ty = y;
    this.tw = w;
    this.th = h;

    this.lastActivityTime = performance.now();
  }

  private spawnEmbers(x: number, y: number, count = 2): void {
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      const speed = 0.5 + Math.random() * 1.4;
      const life = 24 + Math.random() * 18;
      this.embers.push({
        x: x + (Math.random() - 0.5) * 4,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.2 + Math.random() * 1.3,
        alpha: 0.9,
        life,
        maxLife: life,
        phase: Math.random() * Math.PI * 2,
      });
    }

    if (this.embers.length > 40) {
      this.embers.splice(0, this.embers.length - 40);
    }
  }

  private addWaterRipple(x: number, y: number): void {
    this.ripples.push({
      x,
      y,
      radius: 3,
      maxRadius: 26,
      alpha: 0.8,
    });

    if (this.ripples.length > 5) {
      this.ripples.splice(0, this.ripples.length - 5);
    }
  }

  public update(dt: number, config: LiveCursorConfig): void {
    const animLength = Math.max(0.03, config.animationLength || 0.08);
    const trailSize = Math.max(0.2, config.trailSize || 0.75);
    const clampedDt = Math.min(dt, 0.033);

    // 🌟 运动手感速度模式调节 (Gentle, Balanced, Snappy)
    let speedMultiplier = 1.0;
    if (config.speedMode === 'gentle') {
      speedMultiplier = 0.75;
    } else if (config.speedMode === 'snappy') {
      speedMultiplier = 1.35;
    }

    // 🌟 解决多次按上下键“越跳越快/过于灵敏暴冲”的核心算法：
    // 采用恒定阻尼常数与最大巡航速率限制 (Velocity Clamping)，保证连续快速按键时位移稳健自如
    const tauLeadX = (animLength * 0.45) / speedMultiplier;
    const tauLeadY = (animLength * 0.48) / speedMultiplier;
    const tauTrailX = (animLength * (0.45 + trailSize * 0.75)) / speedMultiplier;
    const tauTrailY = (animLength * (0.48 + trailSize * 0.6)) / speedMultiplier;

    const leadFactorX = 1.0 - Math.exp(-clampedDt / tauLeadX);
    const leadFactorY = 1.0 - Math.exp(-clampedDt / tauLeadY);
    const trailFactorX = 1.0 - Math.exp(-clampedDt / tauTrailX);
    const trailFactorY = 1.0 - Math.exp(-clampedDt / tauTrailY);

    // 计算步进量并施加平滑最大位移约束 (Max Slew Rate)，防止连续跳行时的过载冲量堆积
    const rawDx = (this.targetX - this.lx) * leadFactorX;
    const rawDy = (this.targetY - this.ly) * leadFactorY;

    // 垂直方向平滑限速（每秒最大位移限制，给用户清晰舒适的视觉跟踪）
    const maxSpeedY = 1800 * speedMultiplier; // px/s
    const maxDy = maxSpeedY * clampedDt;
    const clampedDy = Math.max(-maxDy, Math.min(maxDy, rawDy));

    this.lx += rawDx;
    this.ly += clampedDy;
    this.lw += (this.targetW - this.lw) * leadFactorX;
    this.lh += (this.targetH - this.lh) * leadFactorY;

    // 尾部跟随
    const rawTdx = (this.targetX - this.tx) * trailFactorX;
    const rawTdy = (this.targetY - this.ty) * trailFactorY;
    const clampedTdy = Math.max(-maxDy * 1.1, Math.min(maxDy * 1.1, rawTdy));

    this.tx += rawTdx;
    this.ty += clampedTdy;
    this.tw += (this.targetW - this.tw) * trailFactorX;
    this.th += (this.targetH - this.th) * trailFactorY;

    // Update Embers
    for (let i = this.embers.length - 1; i >= 0; i--) {
      const p = this.embers[i];
      p.phase += 0.08;
      p.x += p.vx + Math.sin(p.phase) * 0.2;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.96;
      p.life -= 1;
      p.alpha = Math.pow(p.life / p.maxLife, 1.2);
      if (p.life <= 0) {
        this.embers.splice(i, 1);
      }
    }

    // Update Water Ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += (r.maxRadius - r.radius) * 0.16 + 0.5;
      r.alpha *= 0.89;
      if (r.alpha <= 0.02 || r.radius >= r.maxRadius) {
        this.ripples.splice(i, 1);
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D, config: LiveCursorConfig): void {
    if (!config.enabled) return;

    const effectiveColor =
      config.color && config.color !== 'auto'
        ? config.color
        : config.themeColor || '#a78bfa';

    const now = performance.now();
    const idleTime = now - this.lastActivityTime;

    // 可调节周期的呼吸脉冲动力学
    const breatheCycle = Math.max(0.5, config.breatheCycle || 1.2);
    let baseAlpha = 1.0;
    if (idleTime > 400) {
      if (config.blinkMode === 'smooth') {
        const t = (idleTime - 400) / 1000;
        baseAlpha = 0.45 + 0.55 * Math.cos(t * ((Math.PI * 2) / breatheCycle));
      } else if (config.blinkMode === 'blink') {
        const halfPeriod = (breatheCycle / 2) * 1000;
        const t = Math.floor((idleTime - 400) / halfPeriod);
        baseAlpha = t % 2 === 0 ? 1.0 : 0.0;
      }
    }

    if (baseAlpha <= 0.01) return;

    // 1. 砚池水纹 (Ripples)
    if (config.vfxMode === 'ripples') {
      for (const r of this.ripples) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, r.alpha * baseAlpha * 0.8);
        ctx.strokeStyle = effectiveColor;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = effectiveColor;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.6, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 2. 灵感微星 (Embers)
    if (config.vfxMode === 'embers') {
      for (const p of this.embers) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha * baseAlpha);
        ctx.fillStyle = effectiveColor;
        ctx.shadowColor = effectiveColor;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 3. 羽落轻芒 (Feather Aura)
    if (config.vfxMode === 'feather') {
      ctx.save();
      const auraAlpha = 0.22 * baseAlpha;
      ctx.globalAlpha = auraAlpha;
      ctx.fillStyle = effectiveColor;
      ctx.filter = 'blur(6px)';
      ctx.beginPath();
      ctx.roundRect(this.lx - 5, this.ly - 3, this.lw + 10, this.lh + 6, 6);
      ctx.fill();
      ctx.restore();
    }

    const dx = this.lx - this.tx;
    const dy = this.ly - this.ty;
    const dist = Math.hypot(dx, dy);

    ctx.save();
    ctx.fillStyle = effectiveColor;
    if (config.glow) {
      ctx.shadowColor = effectiveColor;
      ctx.shadowBlur = 10;
    }

    if (config.shape === 'block') {
      // Live 极简色块 (Block)
      if (dist < 0.6) {
        ctx.globalAlpha = 0.75 * baseAlpha;
        ctx.beginPath();
        ctx.roundRect(this.lx, this.ly, this.lw, this.lh, 2.5);
        ctx.fill();
      } else {
        const points: Point2D[] = [
          { x: this.tx, y: this.ty },
          { x: this.tx + this.tw, y: this.ty },
          { x: this.tx + this.tw, y: this.ty + this.th },
          { x: this.tx, y: this.ty + this.th },
          { x: this.lx, y: this.ly },
          { x: this.lx + this.lw, y: this.ly },
          { x: this.lx + this.lw, y: this.ly + this.lh },
          { x: this.lx, y: this.ly + this.lh },
        ];

        const hull = computeConvexHull(points);

        ctx.globalAlpha = 0.65 * baseAlpha;
        ctx.beginPath();
        ctx.moveTo(hull[0].x, hull[0].y);
        for (let i = 1; i < hull.length; i++) {
          ctx.lineTo(hull[i].x, hull[i].y);
        }
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 0.85 * baseAlpha;
        ctx.beginPath();
        ctx.roundRect(this.lx, this.ly, this.lw, this.lh, 2.5);
        ctx.fill();
      }
    } else if (config.shape === 'underline') {
      // Live 水平基准线 (Underline)
      const uH = 3.5;
      const tuy = this.ty + this.th - uH;
      const luy = this.ly + this.lh - uH;

      if (dist < 0.6) {
        ctx.globalAlpha = baseAlpha;
        ctx.beginPath();
        ctx.roundRect(this.lx, luy, this.lw, uH, 1.5);
        ctx.fill();
      } else {
        const points: Point2D[] = [
          { x: this.tx, y: tuy },
          { x: this.tx + this.tw, y: tuy },
          { x: this.tx + this.tw, y: tuy + uH },
          { x: this.tx, y: tuy + uH },
          { x: this.lx, y: luy },
          { x: this.lx + this.lw, y: luy },
          { x: this.lx + this.lw, y: luy + uH },
          { x: this.lx, y: luy + uH },
        ];

        const hull = computeConvexHull(points);

        ctx.globalAlpha = baseAlpha;
        ctx.beginPath();
        ctx.moveTo(hull[0].x, hull[0].y);
        for (let i = 1; i < hull.length; i++) {
          ctx.lineTo(hull[i].x, hull[i].y);
        }
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // Live 平滑光柱 (2.6px Vertical Beam)
      if (dist < 0.6) {
        ctx.globalAlpha = baseAlpha;
        ctx.beginPath();
        ctx.roundRect(this.lx, this.ly, this.lw, this.lh, this.lw / 2);
        ctx.fill();
      } else {
        const points: Point2D[] = [
          { x: this.tx, y: this.ty },
          { x: this.tx + this.tw, y: this.ty },
          { x: this.tx + this.tw, y: this.ty + this.th },
          { x: this.tx, y: this.ty + this.th },
          { x: this.lx, y: this.ly },
          { x: this.lx + this.lw, y: this.ly },
          { x: this.lx + this.lw, y: this.ly + this.lh },
          { x: this.lx, y: this.ly + this.lh },
        ];

        const hull = computeConvexHull(points);

        ctx.beginPath();
        ctx.moveTo(hull[0].x, hull[0].y);
        for (let i = 1; i < hull.length; i++) {
          ctx.lineTo(hull[i].x, hull[i].y);
        }
        ctx.closePath();

        const grad = ctx.createLinearGradient(this.tx, this.ty, this.lx, this.ly);
        grad.addColorStop(0, `${effectiveColor}35`);
        grad.addColorStop(1, effectiveColor);
        ctx.fillStyle = grad;
        ctx.globalAlpha = baseAlpha;
        ctx.fill();

        ctx.fillStyle = effectiveColor;
        ctx.beginPath();
        ctx.roundRect(this.lx, this.ly, this.lw, this.lh, this.lw / 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}

export { LiveCursorEngine as NeovideEngine };
export type { LiveCursorConfig as NeovideCursorConfig };
