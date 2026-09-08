export type CanvasRenderLayer = (
  ctx: CanvasRenderingContext2D,
  dt: number,
  width: number,
  height: number
) => boolean; // Return true if layer is actively animating, false if completely idle

export class InteractiveCanvasEngine {
  private static instance: InteractiveCanvasEngine;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private layers: Map<string, CanvasRenderLayer> = new Map();

  private isRunning: boolean = false;
  private rafId: number | null = null;
  private lastTime: number = 0;
  private idleFrameCount: number = 0;
  private readonly IDLE_THRESHOLD: number = 45; // ~0.75s of zero motion before pausing rAF to save CPU/battery

  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;

  private constructor() {}

  public static getInstance(): InteractiveCanvasEngine {
    if (!InteractiveCanvasEngine.instance) {
      InteractiveCanvasEngine.instance = new InteractiveCanvasEngine();
    }
    return InteractiveCanvasEngine.instance;
  }

  public attachCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.resize();
    this.wakeUp();
  }

  public detachCanvas(): void {
    this.stop();
    this.canvas = null;
    this.ctx = null;
  }

  public resize(): void {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (!parent) return;

    this.dpr = typeof window !== 'undefined' ? Math.max(1, window.devicePixelRatio || 1) : 1;
    const rect = parent.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = Math.floor(rect.width * this.dpr);
    this.canvas.height = Math.floor(rect.height * this.dpr);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    if (this.ctx) {
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
    this.wakeUp();
  }

  public registerLayer(id: string, layer: CanvasRenderLayer): () => void {
    this.layers.set(id, layer);
    this.wakeUp();
    return () => {
      this.layers.delete(id);
    };
  }

  public wakeUp(): void {
    this.idleFrameCount = 0;
    if (!this.isRunning && this.canvas && this.ctx) {
      this.isRunning = true;
      this.lastTime = performance.now();
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
      }
      this.rafId = requestAnimationFrame(this.renderLoop);
    }
  }

  private stop(): void {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private renderLoop = (currentTime: number): void => {
    if (!this.isRunning || !this.ctx || !this.canvas) return;

    const dt = Math.max(0.001, Math.min((currentTime - this.lastTime) / 1000, 0.05));
    this.lastTime = currentTime;

    // Clear Screen
    this.ctx.clearRect(0, 0, this.width, this.height);

    let anyLayerActive = false;
    for (const layer of this.layers.values()) {
      try {
        const isActive = layer(this.ctx, dt, this.width, this.height);
        if (isActive) {
          anyLayerActive = true;
        }
      } catch (err) {
        console.error('[InteractiveCanvasEngine] Error in render layer:', err);
      }
    }

    if (!anyLayerActive) {
      this.idleFrameCount++;
      if (this.idleFrameCount > this.IDLE_THRESHOLD) {
        // ✨ Auto-Sleep: No active animation, pause rAF loop to drop CPU to 0%
        this.stop();
        return;
      }
    } else {
      this.idleFrameCount = 0;
    }

    this.rafId = requestAnimationFrame(this.renderLoop);
  };
}

export const interactiveCanvasEngine = InteractiveCanvasEngine.getInstance();
