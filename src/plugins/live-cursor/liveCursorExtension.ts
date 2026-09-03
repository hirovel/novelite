import type { Extension } from '@codemirror/state';
import { ViewPlugin, ViewUpdate, EditorView } from '@codemirror/view';
import { LiveCursorEngine } from './LiveCursorEngine';
import type { LiveCursorConfig } from './LiveCursorEngine';

/**
 * Creates the native CodeMirror 6 extension that mounts and drives the live physics cursor.
 * Features 0ms zero-latency synchronous caret reading with continuous focus-aware breathing/blinking,
 * exact CJK & ASCII character width matching, and Neovide fluid parallelogram deformation.
 *
 * @param getConfig Callback returning the latest live cursor configuration.
 */
export function createLiveCursorPluginExtension(
  getConfig: () => LiveCursorConfig
): Extension {
  return ViewPlugin.define((view: EditorView) => {
    const canvas = document.createElement('canvas');
    canvas.className = 'cm-live-cursor-canvas';
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '2';
    canvas.style.willChange = 'transform';

    view.scrollDOM.style.position = 'relative';
    view.scrollDOM.appendChild(canvas);

    const ctx = canvas.getContext('2d', { alpha: true });
    const engine = new LiveCursorEngine();
    engine.setFocused(view.hasFocus);

    let isRunning = false;
    let lastTime = performance.now();
    let dpr = typeof window !== 'undefined' ? Math.max(1, window.devicePixelRatio || 1) : 1;

    let viewportW = 1000;
    let viewportH = 800;
    let lastScrollLeft = -1;
    let lastScrollTop = -1;

    const resize = () => {
      if (!ctx) return;
      dpr = typeof window !== 'undefined' ? Math.max(1, window.devicePixelRatio || 1) : 1;

      const w = view.scrollDOM.clientWidth || 1000;
      const h = view.scrollDOM.clientHeight || 800;
      const targetW = Math.floor(w * dpr);
      const targetH = Math.floor(h * dpr);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        viewportW = w;
        viewportH = h;
        canvas.width = targetW;
        canvas.height = targetH;
        canvas.style.width = `${viewportW}px`;
        canvas.style.height = `${viewportH}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    };

    const applyCoords = (coords: { left: number; top: number; right: number; bottom: number }, head: number, immediate: boolean) => {
      const config = getConfig();
      if (!config.enabled) return;

      const scrollRect = view.scrollDOM.getBoundingClientRect();
      const targetX = coords.left - scrollRect.left + view.scrollDOM.scrollLeft;
      let targetY = coords.top - scrollRect.top + view.scrollDOM.scrollTop;
      let targetH = Math.max(18, coords.bottom - coords.top);

      let targetW = 2.6;
      if (config.shape === 'block') {
        try {
          const char = view.state.doc.sliceString(head, head + 1);
          const isCJK = /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(char);
          const nextCoords = view.coordsAtPos(Math.min(view.state.doc.length, head + 1));
          
          if (nextCoords && Math.abs(nextCoords.top - coords.top) < 6 && nextCoords.left > coords.left) {
            targetW = Math.max(8, nextCoords.left - coords.left);
          } else {
            // End of line or CJK fallback (perfect square for Chinese, half-width for ASCII)
            targetW = isCJK ? targetH * 0.95 : targetH * 0.55;
          }
        } catch {
          targetW = 18;
        }
      } else if (config.shape === 'underline') {
        try {
          const char = view.state.doc.sliceString(head, head + 1);
          const isCJK = /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(char);
          const nextCoords = view.coordsAtPos(Math.min(view.state.doc.length, head + 1));
          if (nextCoords && Math.abs(nextCoords.top - coords.top) < 6 && nextCoords.left > coords.left) {
            targetW = Math.max(10, nextCoords.left - coords.left);
          } else {
            targetW = isCJK ? targetH * 0.85 : 12;
          }
        } catch {
          targetW = 14;
        }
        targetY = targetY + targetH - 2.8;
        targetH = 2.6;
      }

      if (immediate) {
        engine.teleport(targetX, targetY, targetW, targetH);
      } else {
        engine.setTarget(targetX, targetY, targetW, targetH);
      }

      wakeUp();
    };

    const syncCaretInstant = (immediate = false): boolean => {
      try {
        const head = view.state.selection.main.head;
        const coords = view.coordsAtPos(head);
        if (coords) {
          applyCoords(coords, head, immediate);
          return true;
        }
      } catch {
        // Fallback to requestMeasure
      }
      return false;
    };

    const measureCaretSafe = (immediate = false) => {
      view.requestMeasure({
        read(v) {
          try {
            const head = v.state.selection.main.head;
            const coords = v.coordsAtPos(head);
            return coords ? { coords, head, immediate } : null;
          } catch {
            return null;
          }
        },
        write(data) {
          if (data) {
            applyCoords(data.coords, data.head, data.immediate);
          }
        },
      });
    };

    const loop = (time: number) => {
      if (!isRunning || !ctx) return;
      const dt = Math.max(0.001, Math.min((time - lastTime) / 1000, 0.05));
      lastTime = time;

      const config = getConfig();
      engine.update(dt, config);

      const scrollLeft = view.scrollDOM.scrollLeft;
      const scrollTop = view.scrollDOM.scrollTop;

      if (scrollLeft !== lastScrollLeft || scrollTop !== lastScrollTop) {
        lastScrollLeft = scrollLeft;
        lastScrollTop = scrollTop;
        canvas.style.transform = `translate3d(${scrollLeft}px, ${scrollTop}px, 0)`;
      }

      ctx.clearRect(0, 0, viewportW, viewportH);

      if (config.enabled) {
        ctx.save();
        ctx.translate(-scrollLeft, -scrollTop);
        engine.draw(ctx, config);
        ctx.restore();
      }

      if (engine.isAnimating(config)) {
        requestAnimationFrame(loop);
      } else {
        isRunning = false;
      }
    };

    const wakeUp = () => {
      if (!isRunning && ctx) {
        isRunning = true;
        lastTime = performance.now();
        requestAnimationFrame(loop);
      }
    };

    const handleScroll = () => {
      wakeUp();
    };

    const handleFocus = () => {
      engine.setFocused(true);
      if (!syncCaretInstant(false)) {
        measureCaretSafe(false);
      }
      wakeUp();
    };

    const handleBlur = () => {
      engine.setFocused(false);
      wakeUp();
    };

    view.scrollDOM.addEventListener('scroll', handleScroll, { passive: true });
    view.contentDOM.addEventListener('focus', handleFocus);
    view.contentDOM.addEventListener('blur', handleBlur);

    resize();
    measureCaretSafe(true);

    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(() => {
        resize();
        measureCaretSafe(true);
      });
    }

    const handleResize = () => {
      resize();
      measureCaretSafe(false);
    };

    window.addEventListener('resize', handleResize);

    return {
      update(u: ViewUpdate) {
        if (u.focusChanged) {
          engine.setFocused(view.hasFocus);
          if (view.hasFocus) {
            if (!syncCaretInstant(false)) {
              measureCaretSafe(false);
            }
          }
          wakeUp();
        }
        if (u.docChanged || u.selectionSet || u.geometryChanged) {
          const synced = syncCaretInstant(false);
          if (!synced) {
            measureCaretSafe(false);
          }
        }
        if (u.geometryChanged) {
          resize();
        }
      },
      destroy() {
        isRunning = false;
        view.scrollDOM.removeEventListener('scroll', handleScroll);
        view.contentDOM.removeEventListener('focus', handleFocus);
        view.contentDOM.removeEventListener('blur', handleBlur);
        window.removeEventListener('resize', handleResize);
        canvas.remove();
      },
    };
  });
}
