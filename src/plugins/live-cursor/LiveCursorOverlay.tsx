import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import type { EditorView } from '@codemirror/view';
import { LiveCursorEngine } from './LiveCursorEngine';
import type { LiveCursorConfig } from './LiveCursorEngine';
import { interactiveCanvasEngine } from '../../core/canvas/InteractiveCanvasEngine';

export interface CursorOverlayHandle {
  syncTarget: (coords: { left: number; top: number; right: number; bottom: number }, immediate?: boolean) => void;
}

interface Props {
  editorView: EditorView | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  config: LiveCursorConfig;
}

export const LiveCursorOverlay = React.memo(
  forwardRef<CursorOverlayHandle, Props>(({
    editorView,
    containerRef,
    config,
  }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const engineRef = useRef<LiveCursorEngine>(new LiveCursorEngine());
    const isVisibleRef = useRef<boolean>(true);
    const configRef = useRef<LiveCursorConfig>(config);

    useEffect(() => {
      configRef.current = config;
    }, [config]);

    // 🌟 High-performance cached container bounds to eliminate 100% DOM Layout Thrashing
    const containerRectRef = useRef<{ left: number; top: number; width: number; height: number }>({
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    });

    const updateContainerBounds = React.useCallback(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      containerRectRef.current = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
    }, [containerRef]);

    useImperativeHandle(ref, () => ({
      syncTarget: (coords, immediate = false) => {
        const bounds = containerRectRef.current;
        if (bounds.width === 0) {
          updateContainerBounds();
        }

        const targetX = coords.left - containerRectRef.current.left;
        const targetY = coords.top - containerRectRef.current.top;
        const targetH = Math.max(18, coords.bottom - coords.top);

        const currentShape = configRef.current.shape;
        let targetW = 2.6;
        if (currentShape === 'block') {
          targetW = Math.max(10, coords.right - coords.left || 12);
        } else if (currentShape === 'underline') {
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
        interactiveCanvasEngine.wakeUp();
      },
    }), [updateContainerBounds]);

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

        const currentShape = configRef.current.shape;
        let targetW = 2.6;
        if (currentShape === 'block') {
          const nextCoords = editorView.coordsAtPos(Math.min(state.doc.length, head + 1));
          targetW = nextCoords ? Math.max(10, nextCoords.left - coords.left) : 12;
        } else if (currentShape === 'underline') {
          targetW = 12;
        }

        isVisibleRef.current = true;
        if (immediate) {
          engineRef.current.teleport(targetX, targetY, targetW, targetH);
        } else {
          engineRef.current.setTarget(targetX, targetY, targetW, targetH);
        }
        interactiveCanvasEngine.wakeUp();
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
          interactiveCanvasEngine.resize();
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
    }, [editorView, containerRef, updateContainerBounds]);

    // 🌟 单一稳定生命周期：Canvas 附着与层注册仅在挂载时执行 1 次，零重建开销
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      interactiveCanvasEngine.attachCanvas(canvas);

      const unregisterLayer = interactiveCanvasEngine.registerLayer('layer-live-cursor', (ctx, dt) => {
        const engine = engineRef.current;
        const curConfig = configRef.current;
        engine.update(dt, curConfig);

        if (isVisibleRef.current && curConfig.enabled) {
          engine.draw(ctx, curConfig);
        }

        return engine.isAnimating();
      });

      const handleResize = () => {
        updateContainerBounds();
        interactiveCanvasEngine.resize();
      };

      window.addEventListener('resize', handleResize);

      return () => {
        unregisterLayer();
        interactiveCanvasEngine.detachCanvas();
        window.removeEventListener('resize', handleResize);
      };
    }, [updateContainerBounds]);

    return (
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-30 h-full w-full"
        style={{ willChange: 'transform' }}
      />
    );
  })
);
