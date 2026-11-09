"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Konva from "konva";
import { Ellipse, Group, Image as KonvaImage, Layer, Line, Rect, Shape, Stage, Text, Transformer } from "react-konva";
import { Check, X } from "lucide-react";
import { useEditor } from "@/store/editor";
import { stageHandle } from "@/lib/stage";
import { reportCursor, useCollab } from "@/lib/collab";
import type { CanvasElement, ElementPatch, ImageElement, ImageFilters, ShapeElement, TextElement } from "@/lib/types";

const PADDING = 80;

function useHtmlImage(src: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.src = src;
    return () => {
      img.onload = null;
    };
  }, [src]);
  return image;
}

function drawTriangle(ctx: Konva.Context, shape: Konva.Shape) {
  const w = shape.width();
  const h = shape.height();
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStrokeShape(shape);
}

function drawStar(ctx: Konva.Context, shape: Konva.Shape) {
  const w = shape.width();
  const h = shape.height();
  const points = 5;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? 1 : 0.45;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const px = w / 2 + Math.cos(angle) * r * (w / 2);
    const py = h / 2 + Math.sin(angle) * r * (h / 2) * 1.05 + h * 0.03;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStrokeShape(shape);
}

function filterList(f: ImageFilters) {
  const list: Array<(typeof Konva.Filters)[keyof typeof Konva.Filters]> = [];
  if (f.brightness) list.push(Konva.Filters.Brighten);
  if (f.contrast) list.push(Konva.Filters.Contrast);
  if (f.saturation || f.hue) list.push(Konva.Filters.HSL);
  if (f.blur) list.push(Konva.Filters.Blur);
  if (f.grayscale) list.push(Konva.Filters.Grayscale);
  if (f.sepia) list.push(Konva.Filters.Sepia);
  if (f.invert) list.push(Konva.Filters.Invert);
  return list;
}

function ImageNode({ el, common }: { el: ImageElement; common: Record<string, unknown> }) {
  const image = useHtmlImage(el.src);
  const ref = useRef<Konva.Image>(null);
  const filters = filterList(el.filters);

  // Konva filters operate on a cached bitmap; re-cache whenever inputs change.
  useEffect(() => {
    const node = ref.current;
    if (!node || !image) return;
    if (filters.length) {
      const sourceW = el.crop?.width ?? el.naturalWidth;
      node.cache({ pixelRatio: Math.min(3, Math.max(1, sourceW / el.width)) });
    } else {
      node.clearCache();
    }
    node.getLayer()?.batchDraw();
  }, [image, el.filters, el.width, el.height, el.crop, filters.length, el.naturalWidth]);

  return (
    <KonvaImage
      ref={ref}
      {...common}
      image={image ?? undefined}
      width={el.width}
      height={el.height}
      crop={el.crop ?? undefined}
      filters={filters}
      brightness={el.filters.brightness}
      contrast={el.filters.contrast}
      saturation={el.filters.saturation}
      hue={el.filters.hue}
      blurRadius={el.filters.blur}
    />
  );
}

function shapePaint(el: ShapeElement) {
  return {
    fill: el.fill,
    stroke: el.strokeWidth > 0 ? el.stroke : undefined,
    strokeWidth: el.strokeWidth,
    strokeScaleEnabled: false,
  };
}

function ElementNode({
  el,
  hidden,
  interactive,
  onSelect,
  onChange,
  onEditText,
}: {
  el: CanvasElement;
  hidden: boolean;
  interactive: boolean;
  onSelect: (id: string) => void;
  onChange: (id: string, patch: ElementPatch) => void;
  onEditText: (id: string) => void;
}) {
  const common = {
    id: el.id,
    name: "element",
    x: el.x,
    y: el.y,
    rotation: el.rotation,
    opacity: hidden ? 0 : el.opacity,
    visible: el.visible,
    draggable: interactive && !el.locked,
    listening: interactive && !el.locked,
    onMouseDown: () => onSelect(el.id),
    onTap: () => onSelect(el.id),
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) =>
      onChange(el.id, { x: Math.round(e.target.x()), y: Math.round(e.target.y()) }),
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target;
      const sx = node.scaleX();
      const sy = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      const base = {
        x: Math.round(node.x()),
        y: Math.round(node.y()),
        rotation: Math.round(node.rotation() * 10) / 10,
      };
      if (el.type === "text") {
        // Corner drags scale the type; side drags only reflow the text box.
        const fontScale = Math.abs(sy - 1) > 0.001 ? sy : 1;
        onChange(el.id, {
          ...base,
          width: Math.max(20, Math.round(el.width * sx)),
          fontSize: Math.max(4, Math.round(el.fontSize * fontScale)),
        });
      } else if (el.type === "draw") {
        onChange(el.id, {
          ...base,
          width: Math.max(1, Math.round(el.width * sx)),
          height: Math.max(1, Math.round(el.height * sy)),
          points: el.points.map((p, i) => Math.round(p * (i % 2 === 0 ? sx : sy) * 10) / 10),
        });
      } else {
        onChange(el.id, {
          ...base,
          width: Math.max(4, Math.round(el.width * sx)),
          height: Math.max(4, Math.round(el.height * sy)),
        });
      }
    },
  };

  switch (el.type) {
    case "rect":
      return <Rect {...common} {...shapePaint(el)} width={el.width} height={el.height} cornerRadius={el.cornerRadius} />;
    case "ellipse":
      return (
        <Ellipse
          {...common}
          {...shapePaint(el)}
          radiusX={el.width / 2}
          radiusY={el.height / 2}
          offsetX={-el.width / 2}
          offsetY={-el.height / 2}
        />
      );
    case "triangle":
      return <Shape {...common} {...shapePaint(el)} width={el.width} height={el.height} sceneFunc={drawTriangle} />;
    case "star":
      return <Shape {...common} {...shapePaint(el)} width={el.width} height={el.height} sceneFunc={drawStar} />;
    case "text":
      return (
        <Text
          {...common}
          text={el.text}
          width={el.width}
          fontSize={el.fontSize}
          fontFamily={el.fontFamily}
          fontStyle={el.fontStyle}
          align={el.align}
          fill={el.fill}
          lineHeight={1.15}
          onDblClick={() => onEditText(el.id)}
          onDblTap={() => onEditText(el.id)}
        />
      );
    case "image":
      return <ImageNode el={el} common={common} />;
    case "draw":
      return (
        <Line
          {...common}
          points={el.points}
          stroke={el.mode === "eraser" ? "#000" : el.stroke}
          strokeWidth={el.strokeWidth}
          lineCap="round"
          lineJoin="round"
          tension={0.4}
          hitStrokeWidth={Math.max(12, el.strokeWidth)}
          globalCompositeOperation={el.mode === "eraser" ? "destination-out" : "source-over"}
        />
      );
  }
}

/** Crop editor: shows the full source image dimmed with a resizable crop window on top. */
function CropOverlay({ el, scale, onDone }: { el: ImageElement; scale: number; onDone: () => void }) {
  const image = useHtmlImage(el.src);
  const applyCrop = useEditor((s) => s.applyCrop);
  const rectRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const crop = el.crop ?? { x: 0, y: 0, width: el.naturalWidth, height: el.naturalHeight };
  const s = el.width / crop.width; // design px per source px
  const full = { x: el.x - crop.x * s, y: el.y - crop.y * s, width: el.naturalWidth * s, height: el.naturalHeight * s };
  const [box, setBox] = useState({ x: el.x, y: el.y, width: el.width, height: el.height });

  useEffect(() => {
    if (rectRef.current && trRef.current) {
      trRef.current.nodes([rectRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [image]);

  const clamp = (b: typeof box) => {
    const width = Math.min(b.width, full.width);
    const height = Math.min(b.height, full.height);
    return {
      width,
      height,
      x: Math.min(Math.max(b.x, full.x), full.x + full.width - width),
      y: Math.min(Math.max(b.y, full.y), full.y + full.height - height),
    };
  };

  const apply = () => {
    applyCrop(
      el.id,
      {
        x: Math.round((box.x - full.x) / s),
        y: Math.round((box.y - full.y) / s),
        width: Math.round(box.width / s),
        height: Math.round(box.height / s),
      },
      { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) },
    );
    onDone();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") apply();
      if (e.key === "Escape") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <>
      <KonvaImage image={image ?? undefined} {...full} opacity={0.35} listening={false} />
      <Group
        clipX={box.x}
        clipY={box.y}
        clipWidth={box.width}
        clipHeight={box.height}
        listening={false}
      >
        <KonvaImage image={image ?? undefined} {...full} />
      </Group>
      <Rect
        ref={rectRef}
        {...box}
        draggable
        stroke="#ff4d6a"
        strokeWidth={2 / scale}
        dash={[6 / scale, 4 / scale]}
        onDragMove={(e) => {
          const next = clamp({ ...box, x: e.target.x(), y: e.target.y() });
          e.target.position({ x: next.x, y: next.y });
          setBox(next);
        }}
        onTransform={(e) => {
          const n = e.target;
          const next = clamp({ x: n.x(), y: n.y(), width: n.width() * n.scaleX(), height: n.height() * n.scaleY() });
          n.setAttrs({ ...next, scaleX: 1, scaleY: 1 });
          setBox(next);
        }}
      />
      <Transformer
        ref={trRef}
        rotateEnabled={false}
        anchorSize={10}
        anchorStroke="#e8304f"
        anchorFill="#fff"
        borderEnabled={false}
        keepRatio={false}
      />
    </>
  );
}

export default function CanvasStage() {
  const elements = useEditor((s) => s.elements);
  const artboard = useEditor((s) => s.artboard);
  const selectedId = useEditor((s) => s.selectedId);
  const zoom = useEditor((s) => s.zoom);
  const tool = useEditor((s) => s.tool);
  const brushColor = useEditor((s) => s.brushColor);
  const brushSize = useEditor((s) => s.brushSize);
  const croppingId = useEditor((s) => s.croppingId);
  const select = useEditor((s) => s.select);
  const updateElement = useEditor((s) => s.updateElement);
  const addDrawing = useEditor((s) => s.addDrawing);
  const setCropping = useEditor((s) => s.setCropping);
  const peers = useCollab((s) => s.peers);

  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stroke, setStroke] = useState<number[] | null>(null);

  useLayoutEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    stageHandle.current = stageRef.current;
    return () => {
      stageHandle.current = null;
    };
  }, [viewport.width]);

  const fitScale = Math.max(
    0.05,
    Math.min((viewport.width - PADDING) / artboard.width, (viewport.height - PADDING) / artboard.height),
  );
  const scale = zoom || fitScale;
  const scaledW = artboard.width * scale;
  const scaledH = artboard.height * scale;
  const stageW = Math.max(viewport.width, scaledW + PADDING);
  const stageH = Math.max(viewport.height, scaledH + PADDING);
  const offsetX = (stageW - scaledW) / 2;
  const offsetY = (stageH - scaledH) / 2;

  useEffect(() => {
    useEditor.getState().setFitScale(fitScale);
  }, [fitScale]);

  const selected = elements.find((e) => e.id === selectedId);
  const cropping = elements.find((e): e is ImageElement => e.id === croppingId && e.type === "image");
  const drawing = tool === "brush" || tool === "eraser";

  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage) return;
    const node =
      selected && !selected.locked && selected.visible && editingId !== selected.id && !cropping && !drawing
        ? stage.findOne(`#${selected.id}`)
        : null;
    transformer.nodes(node ? [node] : []);
    transformer.getLayer()?.batchDraw();
  }, [selected, editingId, elements, cropping, drawing]);

  /** Pointer position in artboard (design) coordinates. */
  const designPointer = () => {
    const pos = layerRef.current?.getRelativePointerPosition();
    return pos ? [Math.round(pos.x * 10) / 10, Math.round(pos.y * 10) / 10] : null;
  };

  const editing = elements.find((e): e is TextElement => e.id === editingId && e.type === "text");
  const cropBtnPos = cropping
    ? { left: offsetX + (cropping.x + cropping.width / 2) * scale, top: offsetY + (cropping.y + cropping.height) * scale + 16 }
    : null;

  return (
    <div
      ref={viewportRef}
      className="workspace-dots relative h-full w-full overflow-auto"
      style={{ cursor: drawing ? "crosshair" : undefined }}
    >
      {viewport.width > 0 && (
        <div className="relative" style={{ width: stageW, height: stageH }}>
          <Stage
            ref={stageRef}
            width={stageW}
            height={stageH}
            onMouseDown={(e) => {
              if (drawing) {
                const p = designPointer();
                if (p) setStroke(p);
                return;
              }
              const target = e.target;
              if (target === target.getStage() || target.id() === "artboard-bg") select(null);
            }}
            onTouchStart={() => {
              if (!drawing) return;
              const p = designPointer();
              if (p) setStroke(p);
            }}
            onMouseLeave={() => reportCursor(null)}
            onMouseMove={() => {
              const pos = layerRef.current?.getRelativePointerPosition();
              if (pos) reportCursor({ x: Math.round(pos.x), y: Math.round(pos.y) });
              if (!stroke) return;
              const p = designPointer();
              if (p) setStroke((s) => (s ? [...s, ...p] : s));
            }}
            onTouchMove={() => {
              if (!stroke) return;
              const p = designPointer();
              if (p) setStroke((s) => (s ? [...s, ...p] : s));
            }}
            onMouseUp={() => {
              if (stroke) addDrawing(stroke.length === 2 ? [...stroke, stroke[0] + 0.1, stroke[1]] : stroke, tool === "eraser" ? "eraser" : "brush");
              setStroke(null);
            }}
            onTouchEnd={() => {
              if (stroke) addDrawing(stroke, tool === "eraser" ? "eraser" : "brush");
              setStroke(null);
            }}
          >
            {/* Background lives on its own layer so eraser strokes reveal it instead of cutting through it. */}
            <Layer x={offsetX} y={offsetY} scaleX={scale} scaleY={scale}>
              <Rect
                id="artboard-bg"
                width={artboard.width}
                height={artboard.height}
                fill={artboard.background}
                shadowColor="#5a1a28"
                shadowOpacity={0.16}
                shadowBlur={40 / scale}
                shadowOffsetY={12 / scale}
              />
            </Layer>
            <Layer ref={layerRef} x={offsetX} y={offsetY} scaleX={scale} scaleY={scale}>
              <Group clipX={0} clipY={0} clipWidth={artboard.width} clipHeight={artboard.height}>
                {elements.map((el) => (
                  <ElementNode
                    key={el.id}
                    el={el}
                    hidden={el.id === editingId || el.id === croppingId}
                    interactive={!drawing && !cropping}
                    onSelect={select}
                    onChange={updateElement}
                    onEditText={setEditingId}
                  />
                ))}
                {stroke && (
                  <Line
                    points={stroke}
                    stroke={tool === "eraser" ? "#000" : brushColor}
                    strokeWidth={brushSize}
                    lineCap="round"
                    lineJoin="round"
                    tension={0.4}
                    globalCompositeOperation={tool === "eraser" ? "destination-out" : "source-over"}
                    listening={false}
                  />
                )}
              </Group>
              {peers.map((p) => {
                const el = p.selectedId ? elements.find((e) => e.id === p.selectedId) : null;
                if (!el) return null;
                return (
                  <Rect
                    key={`peer-sel-${p.connectionId}`}
                    x={el.x}
                    y={el.y}
                    width={el.width}
                    height={el.type === "text" ? el.fontSize * 1.15 * el.text.split("\n").length : el.height}
                    rotation={el.rotation}
                    stroke={p.color}
                    strokeWidth={2 / scale}
                    dash={[8 / scale, 4 / scale]}
                    listening={false}
                  />
                );
              })}
              {cropping && <CropOverlay key={cropping.id} el={cropping} scale={scale} onDone={() => setCropping(null)} />}
              <Transformer
                ref={transformerRef}
                rotateAnchorOffset={28}
                anchorSize={10}
                anchorCornerRadius={5}
                anchorStroke="#e8304f"
                anchorFill="#ffffff"
                borderStroke="#e8304f"
                borderStrokeWidth={1.5}
                rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
                keepRatio={selected?.type === "image"}
                enabledAnchors={
                  selected?.type === "image" ? ["top-left", "top-right", "bottom-left", "bottom-right"] : undefined
                }
                ignoreStroke
                boundBoxFunc={(oldBox, newBox) =>
                  Math.abs(newBox.width) < 8 || Math.abs(newBox.height) < 8 ? oldBox : newBox
                }
              />
            </Layer>
          </Stage>

          {peers.map((p) =>
            p.cursor ? (
              <div
                key={p.connectionId}
                className="pointer-events-none absolute z-20 transition-transform duration-75 ease-linear"
                style={{ transform: `translate(${offsetX + p.cursor.x * scale}px, ${offsetY + p.cursor.y * scale}px)`, left: 0, top: 0 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,.3))" }}>
                  <path d="M4 2l16 9-7 2-3 7z" fill={p.color} stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
                <span
                  className="ml-3 inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium text-white shadow"
                  style={{ background: p.color }}
                >
                  {p.name}
                </span>
              </div>
            ) : null,
          )}

          {cropping && cropBtnPos && (
            <div
              className="absolute z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border border-line bg-white p-1 shadow-lg"
              style={cropBtnPos}
            >
              <button
                type="button"
                onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }))}
                className="inline-flex items-center gap-1.5 rounded-full bg-flesh-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-flesh-600"
              >
                <Check size={15} /> Apply crop
              </button>
              <button
                type="button"
                onClick={() => setCropping(null)}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-seed hover:bg-flesh-100"
              >
                <X size={15} /> Cancel
              </button>
            </div>
          )}

          {editing && (
            <textarea
              autoFocus
              defaultValue={editing.text}
              onFocus={(e) => e.currentTarget.select()}
              onBlur={(e) => {
                updateElement(editing.id, { text: e.currentTarget.value || " " });
                setEditingId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
                  e.currentTarget.blur();
                }
              }}
              className="absolute resize-none overflow-hidden bg-transparent outline-2 outline-flesh-500"
              style={{
                left: offsetX + editing.x * scale,
                top: offsetY + editing.y * scale,
                width: editing.width * scale,
                minHeight: editing.fontSize * scale * 1.3,
                fontSize: editing.fontSize * scale,
                fontFamily: editing.fontFamily,
                fontWeight: editing.fontStyle.includes("bold") ? 700 : 400,
                fontStyle: editing.fontStyle.includes("italic") ? "italic" : "normal",
                textAlign: editing.align,
                color: editing.fill,
                lineHeight: 1.15,
                transform: `rotate(${editing.rotation}deg)`,
                transformOrigin: "top left",
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
