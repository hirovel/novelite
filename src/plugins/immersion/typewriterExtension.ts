import type { Extension } from '@codemirror/state';
import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';

export interface TypewriterConfig {
  enabled: boolean;
  anchorRatio?: number; // 0.38 (golden), 0.50 (center), 0.60 (lower)
  speedMode?: 'gentle' | 'balanced' | 'snappy' | 'instant';
}

/**
 * 1D Exact Closed-Form 2nd-Order Harmonic Spring Damper for smooth scrolling.
 * Frame-rate invariant across 60Hz, 120Hz, 144Hz, and 240Hz displays.
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
    if (Math.abs(d) < 0.15 && Math.abs(this.vel) < 0.3) {
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
 * Creates the CodeMirror 6 Typewriter mode extension with:
 * 1. 120fps Closed-form Physics Spring Damper Smooth Scrolling
 * 2. Smart Gesture Detection (Auto-pause when user scrolls wheel/trackpad)
 * 3. Configurable Vertical Eye-Level Anchor Ratio (38% Golden, 50% Center, 60% Lower)
 * 4. Zero-jank requestMeasure DOM batching
 */
export function createTypewriterExtension(getConfig: () => TypewriterConfig): Extension {
  const plugin = ViewPlugin.fromClass(
    class {
      private view: EditorView;
      private spring = new Spring1D();
      private isAnimating: boolean = false;
      private rafId: number | null = null;
      private lastTime: number = 0;
      private isUserManualScrolling: boolean = false;
      private userScrollTimeout: ReturnType<typeof setTimeout> | null = null;
      private wasEnabled: boolean = false;
      private lastLineNumber: number = -1;

      // Event listener references for clean cleanup
      private onWheelBound: (e: WheelEvent) => void;
      private onTouchMoveBound: (e: TouchEvent) => void;
      private onKeyDownBound: (e: KeyboardEvent) => void;

      constructor(view: EditorView) {
        this.view = view;
        this.spring.reset(view.scrollDOM.scrollTop);

        this.onWheelBound = this.handleUserScroll.bind(this);
        this.onTouchMoveBound = this.handleUserScroll.bind(this);
        this.onKeyDownBound = this.handleKeyDown.bind(this);

        const scrollDOM = view.scrollDOM;
        scrollDOM.addEventListener('wheel', this.onWheelBound, { passive: true });
        scrollDOM.addEventListener('touchmove', this.onTouchMoveBound, { passive: true });
        view.contentDOM.addEventListener('keydown', this.onKeyDownBound, { passive: true });

        this.view.dom.classList.toggle('cm-typewriter-active', !!getConfig().enabled);

        // Initial centering on initialization if enabled
        setTimeout(() => {
          const config = getConfig();
          if (config.enabled) {
            this.wasEnabled = true;
            this.scheduleCentering(config);
          }
        }, 60);
      }

      private handleUserScroll() {
        // User is manually scrolling to read context -> pause typewriter auto-locking
        this.isUserManualScrolling = true;
        this.stopAnimation();
        this.spring.reset(this.view.scrollDOM.scrollTop);

        if (this.userScrollTimeout) {
          clearTimeout(this.userScrollTimeout);
        }

        // Auto-resume after 2.5 seconds of no manual scroll gestures
        this.userScrollTimeout = setTimeout(() => {
          this.isUserManualScrolling = false;
        }, 2500);
      }

      private handleKeyDown(_e: KeyboardEvent) {
        // Any navigation or typing key immediately wakes typewriter mode
        if (this.isUserManualScrolling) {
          this.isUserManualScrolling = false;
          if (this.userScrollTimeout) {
            clearTimeout(this.userScrollTimeout);
            this.userScrollTimeout = null;
          }
        }
      }

      update(update: ViewUpdate) {
        const config = getConfig();
        this.view.dom.classList.toggle('cm-typewriter-active', !!config.enabled);

        if (!config.enabled) {
          this.wasEnabled = false;
          this.stopAnimation();
          return;
        }

        const justEnabled = !this.wasEnabled && config.enabled;
        this.wasEnabled = true;

        if (justEnabled || update.docChanged || update.selectionSet || update.geometryChanged) {
          const head = this.view.state.selection.main.head;
          const currentLine = this.view.state.doc.lineAt(head).number;

          const isLineChanged = this.lastLineNumber !== currentLine;
          this.lastLineNumber = currentLine;

          // If just enabled, doc changed (typing) or line changed, trigger centering
          if (justEnabled || update.docChanged || isLineChanged) {
            this.isUserManualScrolling = false;
            this.scheduleCentering(config);
          } else if (update.selectionSet && !this.isUserManualScrolling) {
            this.scheduleCentering(config);
          }
        }
      }

      private scheduleCentering(config: TypewriterConfig) {
        if (!this.view.hasFocus || this.isUserManualScrolling) return;

        this.view.requestMeasure({
          read: (v) => {
            const head = v.state.selection.main.head;
            const coords = v.coordsAtPos(head);
            if (!coords) return null;

            const scrollDOM = v.scrollDOM;
            const rect = scrollDOM.getBoundingClientRect();
            const anchorRatio = Math.max(0.2, Math.min(0.8, config.anchorRatio ?? 0.38));
            const targetScreenY = rect.top + rect.height * anchorRatio;

            const currentCaretY = (coords.top + coords.bottom) / 2;
            const diff = currentCaretY - targetScreenY;

            // Smooth threshold (ignore micro sub-pixel rounding jitter < 1px)
            if (Math.abs(diff) < 1.0) return null;

            const maxScroll = Math.max(0, scrollDOM.scrollHeight - scrollDOM.clientHeight);
            const rawTargetScroll = scrollDOM.scrollTop + diff;
            const clampedTargetScroll = Math.max(0, Math.min(maxScroll, rawTargetScroll));

            return { targetScroll: clampedTargetScroll, diff };
          },
          write: (measure) => {
            if (!measure) return;

            if (config.speedMode === 'instant') {
              this.stopAnimation();
              this.view.scrollDOM.scrollTop = measure.targetScroll;
              this.spring.reset(measure.targetScroll);
              return;
            }

            this.spring.target = measure.targetScroll;

            // If spring is not running, sync start position and start loop
            if (!this.isAnimating) {
              this.spring.val = this.view.scrollDOM.scrollTop;
              this.startAnimation(config);
            }
          },
        });
      }

      private startAnimation(config: TypewriterConfig) {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.lastTime = performance.now();

        const speedMode = config.speedMode || 'balanced';
        let omega = 40; // Frequency (rad/s)
        let zeta = 1.0; // Critical damping (no overshoot)

        if (speedMode === 'gentle') {
          omega = 26;
        } else if (speedMode === 'snappy') {
          omega = 60;
        }

        const step = (time: number) => {
          if (!this.isAnimating) return;

          const dt = Math.max(0.001, Math.min((time - this.lastTime) / 1000, 0.05));
          this.lastTime = time;

          this.spring.step(dt, omega, zeta);
          this.view.scrollDOM.scrollTop = this.spring.val;

          const isAtRest =
            Math.abs(this.spring.val - this.spring.target) < 0.2 && Math.abs(this.spring.vel) < 0.4;

          if (isAtRest) {
            this.view.scrollDOM.scrollTop = this.spring.target;
            this.isAnimating = false;
            this.rafId = null;
          } else {
            this.rafId = requestAnimationFrame(step);
          }
        };

        this.rafId = requestAnimationFrame(step);
      }

      private stopAnimation() {
        this.isAnimating = false;
        if (this.rafId !== null) {
          cancelAnimationFrame(this.rafId);
          this.rafId = null;
        }
      }

      destroy() {
        this.stopAnimation();
        this.view.dom.classList.remove('cm-typewriter-active');
        if (this.userScrollTimeout) {
          clearTimeout(this.userScrollTimeout);
        }
        const scrollDOM = this.view.scrollDOM;
        scrollDOM.removeEventListener('wheel', this.onWheelBound);
        scrollDOM.removeEventListener('touchmove', this.onTouchMoveBound);
        this.view.contentDOM.removeEventListener('keydown', this.onKeyDownBound);
      }
    }
  );

  const typewriterTheme = EditorView.theme({
    '&.cm-typewriter-active .cm-content': {
      paddingBottom: '60vh !important',
    },
  });

  return [plugin, typewriterTheme];
}
