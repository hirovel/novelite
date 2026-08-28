import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Check,
  Move,
  Sparkles,
  Maximize2,
  Minimize2,
  AlignCenter,
  ArrowUpToLine,
  ArrowDownToLine,
  RotateCcw,
} from 'lucide-react';
import type { Theme } from '../../core/themes/types';

export interface CropParams {
  scale: number;
  x: number;
  y: number;
  rotation: number;
  aspectRatio: 'screen' | '16:9' | '16:10' | '4:3' | 'original';
}

interface Props {
  isOpen: boolean;
  imageSrc: string | null;
  initialParams?: CropParams | null;
  theme: Theme;
  onClose: () => void;
  onApply: (croppedDataUrl: string, params: CropParams) => void;
}

export const ImageCropModal: React.FC<Props> = ({
  isOpen,
  imageSrc,
  initialParams,
  theme,
  onClose,
  onApply,
}) => {
  const [scale, setScale] = useState<number>(initialParams?.scale ?? 1.0);
  const [rotation, setRotation] = useState<number>(initialParams?.rotation ?? 0);
  const [aspectRatio, setAspectRatio] = useState<'screen' | '16:9' | '16:10' | '4:3' | 'original'>(
    initialParams?.aspectRatio ?? 'screen'
  );
  const [isSnappedCenter, setIsSnappedCenter] = useState<boolean>(false);
  const [imgNaturalSize, setImgNaturalSize] = useState<{ width: number; height: number }>({ width: 1920, height: 1080 });
  const [stageSize, setStageSize] = useState<{ width: number; height: number }>({ width: 720, height: 380 });

  // 120fps High-performance coordinates (ref-based for zero render latency during mouse drag)
  const posRef = useRef<{ x: number; y: number }>({
    x: initialParams?.x ?? 0,
    y: initialParams?.y ?? 0,
  });
  const scaleRef = useRef<number>(initialParams?.scale ?? 1.0);
  const rotationRef = useRef<number>(initialParams?.rotation ?? 0);

  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const posStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rafIdRef = useRef<number | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const imgLayerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Transition animation state
  const [shouldRender, setShouldRender] = useState<boolean>(isOpen);
  const [isAnimatingIn, setIsAnimatingIn] = useState<boolean>(false);

  // Directly update DOM transform in RAF for 120fps smooth feedback
  const updateTransformDOM = useCallback(() => {
    if (imgLayerRef.current) {
      imgLayerRef.current.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0) scale(${scaleRef.current}) rotate(${rotationRef.current}deg)`;
    }
  }, []);

  useEffect(() => {
    scaleRef.current = scale;
    updateTransformDOM();
  }, [scale, updateTransformDOM]);

  useEffect(() => {
    rotationRef.current = rotation;
    updateTransformDOM();
  }, [rotation, updateTransformDOM]);

  // Measure stage dimensions
  useEffect(() => {
    if (!stageRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setStageSize({ width: Math.round(width), height: Math.round(height) });
        }
      }
    });
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [shouldRender]);

  useEffect(() => {
    let enterTimer: ReturnType<typeof setTimeout>;
    let exitTimer: ReturnType<typeof setTimeout>;

    if (isOpen && imageSrc) {
      enterTimer = setTimeout(() => {
        setShouldRender(true);
        setIsAnimatingIn(true);
        if (initialParams) {
          setScale(initialParams.scale);
          scaleRef.current = initialParams.scale;
          posRef.current = { x: initialParams.x, y: initialParams.y };
          setRotation(initialParams.rotation);
          rotationRef.current = initialParams.rotation;
          setAspectRatio(initialParams.aspectRatio);
        } else {
          setScale(1.0);
          scaleRef.current = 1.0;
          posRef.current = { x: 0, y: 0 };
          setRotation(0);
          rotationRef.current = 0;
          setAspectRatio('screen');
        }
        updateTransformDOM();
      }, 0);
    } else {
      enterTimer = setTimeout(() => {
        setIsAnimatingIn(false);
      }, 0);
      exitTimer = setTimeout(() => {
        setShouldRender(false);
      }, 240);
    }

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [isOpen, imageSrc, initialParams, updateTransformDOM]);

  // Load natural image dimensions
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
  };

  // High performance dragging
  const handleStartDrag = (clientX: number, clientY: number) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: clientX, y: clientY };
    posStartRef.current = { ...posRef.current };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    handleStartDrag(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleStartDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleMoveDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDraggingRef.current) return;
      const dx = clientX - dragStartRef.current.x;
      const dy = clientY - dragStartRef.current.y;
      let targetX = posStartRef.current.x + dx;
      let targetY = posStartRef.current.y + dy;

      // 🧲 Magnetic Snapping to Absolute Center (Within 12px)
      let snapped = false;
      if (Math.abs(targetX) < 12) {
        targetX = 0;
        snapped = true;
      }
      if (Math.abs(targetY) < 12) {
        targetY = 0;
        snapped = true;
      }
      setIsSnappedCenter(snapped);

      posRef.current = { x: targetX, y: targetY };

      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = requestAnimationFrame(updateTransformDOM);
    },
    [updateTransformDOM]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      handleMoveDrag(e.clientX, e.clientY);
    },
    [handleMoveDrag]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleMoveDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    [handleMoveDrag]
  );

  const handleEndDrag = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleEndDrag);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleEndDrag);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEndDrag);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEndDrag);
    };
  }, [handleMouseMove, handleTouchMove, handleEndDrag]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setScale((prev) => {
      const next = Math.max(0.2, Math.min(4.0, Number((prev + delta).toFixed(2))));
      scaleRef.current = next;
      updateTransformDOM();
      return next;
    });
  };

  const handleRotate = () => {
    setRotation((prev) => {
      const next = (prev + 90) % 360;
      rotationRef.current = next;
      updateTransformDOM();
      return next;
    });
  };

  // Calculate target aspect ratio number
  const targetRatio = useMemo(() => {
    switch (aspectRatio) {
      case 'screen':
        return window.innerWidth / Math.max(1, window.innerHeight);
      case '16:9':
        return 16 / 9;
      case '16:10':
        return 16 / 10;
      case '4:3':
        return 4 / 3;
      case 'original':
        return imgNaturalSize.width / Math.max(1, imgNaturalSize.height);
    }
  }, [aspectRatio, imgNaturalSize]);

  // Exact Pixel Calculation for Crop Box & Image Geometry
  const geometry = useMemo(() => {
    const maxW = Math.max(100, stageSize.width * 0.88);
    const maxH = Math.max(100, stageSize.height * 0.84);

    let boxW: number;
    let boxH: number;

    if (maxW / targetRatio <= maxH) {
      boxW = maxW;
      boxH = boxW / targetRatio;
    } else {
      boxH = maxH;
      boxW = boxH * targetRatio;
    }

    boxW = Math.round(boxW);
    boxH = Math.round(boxH);

    // Calculate base image dimensions to cover the crop box at scale = 1.0
    const imgAspect = imgNaturalSize.width / Math.max(1, imgNaturalSize.height);
    let baseW: number;
    let baseH: number;

    if (imgAspect > targetRatio) {
      baseH = boxH;
      baseW = boxH * imgAspect;
    } else {
      baseW = boxW;
      baseH = boxW / imgAspect;
    }

    baseW = Math.round(baseW);
    baseH = Math.round(baseH);

    return { boxW, boxH, baseW, baseH };
  }, [stageSize, targetRatio, imgNaturalSize]);

  // Smart Alignment Actions
  const handleAlignCenter = () => {
    posRef.current = { x: 0, y: 0 };
    setIsSnappedCenter(true);
    updateTransformDOM();
  };

  const handleAlignTop = () => {
    const imgH = geometry.baseH * scaleRef.current;
    const offset = (imgH - geometry.boxH) / 2;
    posRef.current = { x: posRef.current.x, y: offset };
    updateTransformDOM();
  };

  const handleAlignBottom = () => {
    const imgH = geometry.baseH * scaleRef.current;
    const offset = -(imgH - geometry.boxH) / 2;
    posRef.current = { x: posRef.current.x, y: offset };
    updateTransformDOM();
  };

  const handleFitCover = () => {
    setScale(1.0);
    scaleRef.current = 1.0;
    posRef.current = { x: 0, y: 0 };
    setIsSnappedCenter(true);
    updateTransformDOM();
  };

  const handleFitContain = () => {
    const imgAspect = imgNaturalSize.width / imgNaturalSize.height;
    let fitScale = 1.0;
    if (imgAspect > targetRatio) {
      fitScale = targetRatio / imgAspect;
    } else {
      fitScale = imgAspect / targetRatio;
    }
    const finalScale = Number(Math.max(0.2, fitScale).toFixed(2));
    setScale(finalScale);
    scaleRef.current = finalScale;
    posRef.current = { x: 0, y: 0 };
    setIsSnappedCenter(true);
    updateTransformDOM();
  };

  const handleResetOriginal = () => {
    setScale(1.0);
    scaleRef.current = 1.0;
    posRef.current = { x: 0, y: 0 };
    setRotation(0);
    rotationRef.current = 0;
    setAspectRatio('screen');
    setIsSnappedCenter(true);
    updateTransformDOM();
  };

  // 100% Exact WYSIWYG Canvas Export
  const handleExportCropped = () => {
    if (!imgRef.current) return;

    const img = imgRef.current;
    const { boxW, baseW, baseH } = geometry;

    // Full HD 1080p target resolution
    const targetWidth = 1920;
    const targetHeight = Math.round(targetWidth / targetRatio);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = theme.colors.bg;
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    // Exact scale factor from on-screen box to output canvas
    const R = targetWidth / boxW;

    ctx.save();
    // Origin at output center
    ctx.translate(targetWidth / 2, targetHeight / 2);

    // User transformation
    ctx.translate(posRef.current.x * R, posRef.current.y * R);
    ctx.rotate((rotationRef.current * Math.PI) / 180);
    ctx.scale(scaleRef.current * R, scaleRef.current * R);

    // Draw base-scaled image
    ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH);
    ctx.restore();

    const resultUrl = canvas.toDataURL('image/jpeg', 0.88);
    const params: CropParams = {
      scale: scaleRef.current,
      x: posRef.current.x,
      y: posRef.current.y,
      rotation: rotationRef.current,
      aspectRatio,
    };
    onApply(resultUrl, params);
    onClose();
  };

  if (!shouldRender || !imageSrc) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-all duration-200 select-none ${
        isAnimatingIn
          ? 'bg-black/85 backdrop-blur-xl opacity-100'
          : 'bg-black/0 backdrop-blur-none opacity-0 pointer-events-none'
      }`}
      onClick={onClose}
    >
      <div
        className={`flex w-full max-w-4xl max-h-[92vh] flex-col rounded-3xl border shadow-2xl overflow-hidden transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isAnimatingIn ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
        }`}
        style={{
          backgroundColor: theme.colors.bgSecondary,
          borderColor: `${theme.colors.border}cc`,
          boxShadow: `0 30px 90px -15px rgba(0, 0, 0, 0.9), 0 0 60px ${theme.colors.accentGlow}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-6 py-3.5 bg-black/25 shrink-0"
          style={{ borderColor: `${theme.colors.border}80` }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="h-7 w-7 rounded-xl flex items-center justify-center shadow-xs"
              style={{ backgroundColor: `${theme.colors.accent}20`, color: theme.colors.accent }}
            >
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold tracking-tight" style={{ color: theme.colors.text }}>
                背景图片裁剪
              </h3>
              <p className="text-[10px] font-mono opacity-50" style={{ color: theme.colors.textMuted }}>
                调整图片位置、缩放与显示比例
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetOriginal}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-[11px] font-mono opacity-70 hover:opacity-100 transition-all"
              style={{ color: theme.colors.text }}
              title="重置为初始状态"
            >
              <RotateCcw className="h-3 w-3" />
              <span>恢复初始</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-white/10 opacity-60 hover:opacity-100 hover:bg-white/10 transition-all"
              style={{ color: theme.colors.text }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 🖼️ Main Visual Crop Stage (Full Raw Image visible with Exact Cutout Box) */}
        <div
          ref={stageRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="relative flex-1 p-6 flex items-center justify-center bg-[#070709] overflow-hidden min-h-[340px] max-h-[52vh] cursor-grab active:cursor-grabbing select-none"
        >
          {/* Layer 1: The Raw Image (sized to baseW x baseH, transformed at 120fps) */}
          <div
            ref={imgLayerRef}
            style={{
              width: `${geometry.baseW}px`,
              height: `${geometry.baseH}px`,
            }}
            className="absolute flex items-center justify-center pointer-events-none will-change-transform"
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Raw source"
              onLoad={handleImageLoad}
              className="w-full h-full object-fill pointer-events-none"
              draggable={false}
            />
          </div>

          {/* Layer 2: Visual Crop Cutout Box with 9999px Dark Backdrop Shadow */}
          <div
            style={{
              width: `${geometry.boxW}px`,
              height: `${geometry.boxH}px`,
            }}
            className="relative pointer-events-none rounded-2xl border-2 border-cyan-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.68),0_0_35px_rgba(34,211,238,0.4)] transition-all duration-200 ease-out z-20"
          >
            {/* Rule of Thirds Guides inside Crop Box */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-25">
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-r border-b border-white" />
              <div className="border-b border-white" />
              <div className="border-r border-white" />
              <div className="border-r border-white" />
              <div />
            </div>

            {/* 🎯 Crosshair Center Magnet Target */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className={`w-6 h-6 rounded-full border border-dashed flex items-center justify-center transition-all duration-150 ${
                  isSnappedCenter
                    ? 'border-cyan-400 bg-cyan-400/25 scale-125 shadow-[0_0_12px_#22d3ee]'
                    : 'border-white/20 opacity-40'
                }`}
              >
                <div className={`w-1 h-1 rounded-full ${isSnappedCenter ? 'bg-cyan-400' : 'bg-white/40'}`} />
              </div>
            </div>

            {/* Hint & Snap Badges inside Cutout */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md text-[10px] font-mono text-white/80 border border-white/10 shadow-sm">
                <Move className="h-3 w-3" />
                <span>拖拽移动 · 滚轮缩放</span>
              </div>

              {isSnappedCenter && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/30 backdrop-blur-md text-[10px] font-mono text-cyan-300 border border-cyan-400/40 shadow-xs animate-in fade-in zoom-in duration-150">
                  <AlignCenter className="h-3 w-3" />
                  <span>已居中</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 🎛️ Alignment Toolbar & Aspect Ratio Switcher */}
        <div
          className="border-t px-6 py-4 space-y-4 bg-black/20 shrink-0"
          style={{ borderColor: `${theme.colors.border}80` }}
        >
          {/* Row 1: Aspect Ratio Pills + Alignment Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Aspect Ratio Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium opacity-60 mr-1" style={{ color: theme.colors.text }}>
                比例:
              </span>
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                {[
                  { id: 'screen', label: '自适应' },
                  { id: '16:9', label: '16:9' },
                  { id: '16:10', label: '16:10' },
                  { id: '4:3', label: '4:3' },
                  { id: 'original', label: '原始比例' },
                ].map((ratio) => (
                  <button
                    key={ratio.id}
                    onClick={() => setAspectRatio(ratio.id as any)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                      aspectRatio === ratio.id
                        ? 'bg-cyan-500/25 text-cyan-400 font-semibold border border-cyan-400/40 shadow-xs'
                        : 'opacity-60 hover:opacity-100 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Smart Align Tools */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium opacity-60 mr-1" style={{ color: theme.colors.text }}>
                对齐:
              </span>
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                <button
                  onClick={handleAlignCenter}
                  title="居中对齐"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono opacity-70 hover:opacity-100 hover:bg-white/10 transition-all"
                  style={{ color: theme.colors.text }}
                >
                  <AlignCenter className="h-3.5 w-3.5 text-cyan-400" />
                  <span>居中</span>
                </button>
                <button
                  onClick={handleFitCover}
                  title="填满裁剪框"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono opacity-70 hover:opacity-100 hover:bg-white/10 transition-all"
                  style={{ color: theme.colors.text }}
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>填满</span>
                </button>
                <button
                  onClick={handleFitContain}
                  title="完整适应"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono opacity-70 hover:opacity-100 hover:bg-white/10 transition-all"
                  style={{ color: theme.colors.text }}
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                  <span>适应</span>
                </button>
                <button
                  onClick={handleAlignTop}
                  title="靠顶对齐"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono opacity-70 hover:opacity-100 hover:bg-white/10 transition-all"
                  style={{ color: theme.colors.text }}
                >
                  <ArrowUpToLine className="h-3.5 w-3.5" />
                  <span>靠顶</span>
                </button>
                <button
                  onClick={handleAlignBottom}
                  title="靠底对齐"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono opacity-70 hover:opacity-100 hover:bg-white/10 transition-all"
                  style={{ color: theme.colors.text }}
                >
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                  <span>靠底</span>
                </button>
              </div>

              <button
                onClick={handleRotate}
                title="顺时针旋转 90 度"
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-white/10 bg-black/40 hover:bg-white/10 text-xs font-mono transition-all"
                style={{ color: theme.colors.text }}
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span>旋转</span>
              </button>
            </div>
          </div>

          {/* Row 2: Zoom Slider & Confirmation */}
          <div className="flex items-center justify-between gap-6 pt-2 border-t border-white/5">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <ZoomOut className="h-3.5 w-3.5 opacity-40 shrink-0" />
              <input
                type="range"
                min="0.2"
                max="3.5"
                step="0.05"
                value={scale}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setScale(val);
                  scaleRef.current = val;
                  updateTransformDOM();
                }}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <ZoomIn className="h-3.5 w-3.5 opacity-40 shrink-0" />
              <span className="font-mono text-cyan-400 font-bold text-xs min-w-[44px]">
                {Math.round(scale * 100)}%
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs font-mono opacity-60 hover:opacity-100 hover:bg-white/5 transition-all"
                style={{ color: theme.colors.text }}
              >
                取消
              </button>
              <button
                onClick={handleExportCropped}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl border text-xs font-semibold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  backgroundColor: theme.colors.accent,
                  borderColor: `${theme.colors.accent}40`,
                  color: theme.colors.bg,
                }}
              >
                <Check className="h-3.5 w-3.5" />
                <span>保存并应用</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


