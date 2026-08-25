import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import type { EditorView } from '@codemirror/view';
import { LiveCursorEngine } from './LiveCursorEngine';
import type { LiveCursorConfig } from './LiveCursorEngine';

export interface CursorOverlayHandle {
  syncTarget: (coords: { left: number; top: number; right: number; bottom: number }, immediate?: boolean) => void;
}

interface Props {
  editorView: EditorView | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  config: LiveCursorConfig;
}

export const LiveCursorOverlay = forwardRef<CursorOverlayHandle, Props>(({
  editorView,
  containerRef,
  config,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<LiveCursorEngine>(new LiveCursorEngine());
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const isVisibleRef = useRef<boolean>(true);

  // 🌟 High-performance cached container bounds to eliminate 100% DOM Layout Thrashing
  const containerRectRef = useRef<{ left: number; top: number; width: number; height: number }>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });

  const updateContainerBounds = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    containerRectRef.current = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  };

  useImperativeHandle(ref, () => ({
    syncTarget: (coords, immediate = false) => {
      const bounds = containerRectRef.current;
      if (bounds.width === 0) {
        updateContainerBounds();
      }

      const targetX = coords.left - containerRectRef.current.left;
      const targetY = coords.top - containerRectRef.current.top;
      const targetH = Math.max(18, coords.bottom - coords.top);

      let targetW = 2.6;
      if (config.shape === 'block') {
        targetW = Math.max(10, coords.right - coords.left || 12);
      } else if (config.shape === 'underline') {
        targetW = 12;
      }

      if (
        targetX < -100 ||
        targetX > containerRectRef.current.width + 100 ||
        targetY < -100 ||
        targetY > containerRectRef.current.height + 100
      ) {
        isVisibleRef.current = false;
        return;
      }

      isVisibleRef.current = true;
      if (immediate) {
        engineRef.current.teleport(targetX, targetY, targetW, targetH);
      } else {
        engineRef.current.setTarget(targetX, targetY, targetW, targetH);
      }
    },
  }));

  useEffect(() => {
    updateContainerBounds();

    if (!editorView || !containerRef.current) return;

    const syncCaret = (immediate = false) => {
      if (!editorView || !containerRef.current) return;
      updateContainerBounds();

      const state = editorView.state;
      const head = state.selection.main.head;
      const coords = editorView.coordsAtPos(head);

      if (!coords) return;

      const targetX = coords.left - containerRectRef.current.left;
      const targetY = coords.top - containerRectRef.current.top;
      const targetH = Math.max(18, coords.bottom - coords.top);

      let targetW = 2.6;
      if (config.shape === 'block') {
        const nextCoords = editorView.coordsAtPos(Math.min(state.doc.length, head + 1));
        targetW = nextCoords ? Math.max(10, nextCoords.left - coords.left) : 12;
      } else if (config.shape === 'underline') {
        targetW = 12;
      }

      isVisibleRef.current = true;
      if (immediate) {
        engineRef.current.teleport(targetX, targetY, targetW, targetH);
      } else {
        engineRef.current.setTarget(targetX, targetY, targetW, targetH);
      }
    };

    syncCaret(true);

    const scrollDOM = editorView.scrollDOM;
    const dom = editorView.dom;
    const handleScroll = () => syncCaret(false);

    scrollDOM.addEventListener('scroll', handleScroll, { passive: true });
    dom.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    editorView.contentDOM.addEventListener('focus', () => syncCaret(true));
    editorView.contentDOM.addEventListener('click', () => syncCaret(false));

    // Observe container resizing (e.g. sidebar toggle / window resize)
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(() => {
        syncCaret(true);
      });
      ro.observe(containerRef.current);
    }

    return () => {
      scrollDOM.removeEventListener('scroll', handleScroll);
      dom.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      editorView.contentDOM.removeEventListener('focus', () => syncCaret(true));
      editorView.contentDOM.removeEventListener('click', () => syncCaret(false));
      if (ro) ro.disconnect();
    };
  }, [editorView, containerRef, config.shape]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const handleResize = () => {
      if (!containerRef.current || !canvas) return;
      updateContainerBounds();
      const dpr = window.devicePixelRatio || 1;
      const bounds = containerRectRef.current;
      canvas.width = Math.round(bounds.width * dpr);
      canvas.height = Math.round(bounds.height * dpr);
      canvas.style.width = `${bounds.width}px`;
      canvas.style.height = `${bounds.height}px`;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    lastTimeRef.current = performance.now();

    const renderLoop = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (containerRef.current) {
        const dpr = window.devicePixelRatio || 1;
        const bounds = containerRectRef.current;

        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, bounds.width, bounds.height);

        const engine = engineRef.current;
        engine.update(dt, config);

        if (isVisibleRef.current && config.enabled) {
          engine.draw(ctx, config);
        }

        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(renderLoop);
    };

    rafRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [config, containerRef]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-30 h-full w-full"
      style={{ willChange: 'transform' }}
    />
  );
});
