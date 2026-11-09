"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  ChevronsDown,
  ChevronsUp,
  Copy,
  Crop,
  Italic,
  Loader2,
  Trash2,
  Wand2,
} from "lucide-react";
import { useState } from "react";
import { useEditor } from "@/store/editor";
import { removeImageBackground } from "@/lib/background";
import { persistImage } from "@/lib/files";
import { AiCopy } from "./AiCopy";
import { DEFAULT_FILTERS } from "@/lib/types";
import type { CanvasElement, ElementPatch, ImageElement, ImageFilters, TextElement } from "@/lib/types";
import { ColorField, IconButton, NumberField, Section, SliderField } from "./ui";

const FONTS = [
  { label: "Inter", value: "Inter, Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Playfair", value: "'Playfair Display', Georgia, serif" },
  { label: "Courier", value: "'Courier New', monospace" },
  { label: "Impact", value: "Impact, 'Arial Black', sans-serif" },
  { label: "Comic", value: "'Comic Sans MS', cursive" },
];

function TextControls({ el, update }: { el: TextElement; update: (p: ElementPatch) => void }) {
  const bold = el.fontStyle.includes("bold");
  const italic = el.fontStyle.includes("italic");
  const setStyle = (b: boolean, i: boolean) =>
    update({ fontStyle: (i && b ? "italic bold" : i ? "italic" : b ? "bold" : "normal") as TextElement["fontStyle"] });

  return (
    <Section title="Text">
      <textarea
        value={el.text}
        onChange={(e) => update({ text: e.target.value })}
        rows={3}
        className="mb-3 w-full resize-y rounded-md border border-line bg-white px-2 py-1.5 text-sm outline-none focus:border-flesh-400 focus:ring-2 focus:ring-flesh-100"
      />
      <div className="mb-2 grid grid-cols-[1fr_88px] gap-2">
        <select
          value={el.fontFamily}
          onChange={(e) => update({ fontFamily: e.target.value })}
          className="h-8 rounded-md border border-line bg-white px-2 text-sm outline-none focus:border-flesh-400"
        >
          {FONTS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <NumberField label="pt" value={el.fontSize} min={4} max={800} onChange={(fontSize) => update({ fontSize })} />
      </div>
      <div className="mb-3 flex items-center gap-1 rounded-md border border-line bg-white p-0.5">
        <IconButton label="Bold" active={bold} onClick={() => setStyle(!bold, italic)}>
          <Bold size={15} />
        </IconButton>
        <IconButton label="Italic" active={italic} onClick={() => setStyle(bold, !italic)}>
          <Italic size={15} />
        </IconButton>
        <div className="mx-1 h-5 w-px bg-line" />
        {(["left", "center", "right"] as const).map((a) => {
          const Icon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : AlignRight;
          return (
            <IconButton key={a} label={`Align ${a}`} active={el.align === a} onClick={() => update({ align: a })}>
              <Icon size={15} />
            </IconButton>
          );
        })}
      </div>
      <ColorField value={el.fill} onChange={(fill) => update({ fill })} />
      <div className="mt-4 border-t border-line pt-3">
        <p className="mb-2 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted">AI copywriter</p>
        <AiCopy text={el.text} onPick={(text) => update({ text })} />
      </div>
    </Section>
  );
}

const FILTER_PRESETS: { label: string; filters: Partial<ImageFilters>; swatch: string }[] = [
  { label: "Original", filters: {}, swatch: "linear-gradient(135deg,#ffc9d2,#bfe5c9)" },
  { label: "Vivid", filters: { saturation: 0.6, contrast: 18 }, swatch: "linear-gradient(135deg,#ff4d6a,#3c9a5f)" },
  { label: "Mono", filters: { grayscale: true, contrast: 12 }, swatch: "linear-gradient(135deg,#231a1d,#d9d9d9)" },
  { label: "Vintage", filters: { sepia: true, contrast: -8, brightness: 0.04 }, swatch: "linear-gradient(135deg,#a1784f,#f3e1c4)" },
  { label: "Melon", filters: { hue: 340, saturation: 0.35, brightness: 0.05 }, swatch: "linear-gradient(135deg,#ff7a90,#ffe8ec)" },
  { label: "Fade", filters: { contrast: -25, brightness: 0.08, saturation: -0.4 }, swatch: "linear-gradient(135deg,#c8bfc1,#fffaf6)" },
];

function ImageControls({ el, update }: { el: ImageElement; update: (p: ElementPatch) => void }) {
  const setCropping = useEditor((s) => s.setCropping);
  const [bgState, setBgState] = useState<{ busy: boolean; progress: number; error?: string }>({ busy: false, progress: 0 });
  const f = el.filters;
  const setFilter = (patch: Partial<ImageFilters>) => update({ filters: { ...f, ...patch } });

  const removeBg = async () => {
    setBgState({ busy: true, progress: 0 });
    try {
      const cutout = await removeImageBackground(el.src, (progress) => setBgState({ busy: true, progress }));
      const src = await persistImage(cutout, "cutout.png");
      // Read the live element: the user may have edited it while the model ran.
      if (useEditor.getState().elements.some((x) => x.id === el.id)) update({ src });
      setBgState({ busy: false, progress: 0 });
    } catch (err) {
      console.error(err);
      setBgState({ busy: false, progress: 0, error: "Background removal failed. Try a smaller image." });
    }
  };

  return (
    <>
      <Section title="Photo tools">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setCropping(el.id)}
            disabled={el.rotation !== 0}
            title={el.rotation !== 0 ? "Reset rotation to 0° to crop" : "Crop image"}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-line bg-white text-sm hover:border-flesh-200 hover:bg-flesh-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Crop size={15} /> Crop
          </button>
          <button
            type="button"
            onClick={removeBg}
            disabled={bgState.busy}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-rind-700 text-sm font-medium text-white hover:bg-rind-800 disabled:opacity-70"
          >
            {bgState.busy ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
            {bgState.busy ? (bgState.progress ? `${bgState.progress}%` : "Working…") : "Remove BG"}
          </button>
        </div>
        {el.crop && (
          <button
            type="button"
            onClick={() => {
              const s = el.width / el.crop!.width;
              update({ crop: null, width: Math.round(el.naturalWidth * s), height: Math.round(el.naturalHeight * s) });
            }}
            className="mt-2 text-xs text-flesh-600 hover:underline"
          >
            Reset crop
          </button>
        )}
        {bgState.busy && (
          <p className="mt-2 text-[11px] text-muted">First run downloads the AI model (~40 MB). Runs privately in your browser.</p>
        )}
        {bgState.error && <p className="mt-2 text-xs text-flesh-600">{bgState.error}</p>}
      </Section>

      <Section title="Filters">
        <div className="mb-4 grid grid-cols-3 gap-2">
          {FILTER_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => update({ filters: { ...DEFAULT_FILTERS, ...p.filters } })}
              className="group flex flex-col items-center gap-1 text-[11px] text-muted hover:text-seed"
            >
              <span
                className="h-10 w-full rounded-md border border-line transition-transform group-hover:scale-105"
                style={{ background: p.swatch }}
              />
              {p.label}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          <SliderField label="Brightness" value={Math.round(f.brightness * 100)} min={-100} max={100} onChange={(v) => setFilter({ brightness: v / 100 })} />
          <SliderField label="Contrast" value={f.contrast} min={-100} max={100} onChange={(contrast) => setFilter({ contrast })} />
          <SliderField label="Saturation" value={Math.round(f.saturation * 100)} min={-100} max={200} onChange={(v) => setFilter({ saturation: v / 100 })} />
          <SliderField label="Hue" value={f.hue} min={0} max={359} format={(v) => `${v}°`} onChange={(hue) => setFilter({ hue })} />
          <SliderField label="Blur" value={f.blur} min={0} max={40} format={(v) => `${v}px`} onChange={(blur) => setFilter({ blur })} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(["grayscale", "sepia", "invert"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter({ [k]: !f[k] })}
              className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
                f[k] ? "border-flesh-400 bg-flesh-100 text-flesh-600" : "border-line bg-white text-seed hover:bg-flesh-100/60"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </Section>
    </>
  );
}

function ElementProperties({ el }: { el: CanvasElement }) {
  const updateElement = useEditor((s) => s.updateElement);
  const removeElement = useEditor((s) => s.removeElement);
  const duplicateElement = useEditor((s) => s.duplicateElement);
  const moveLayer = useEditor((s) => s.moveLayer);
  const update = (patch: ElementPatch) => updateElement(el.id, patch);

  return (
    <>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Selected</p>
          <p className="truncate text-sm font-medium">{el.name}</p>
        </div>
        <div className="flex gap-0.5">
          <IconButton label="Duplicate (Ctrl+D)" onClick={() => duplicateElement(el.id)}>
            <Copy size={15} />
          </IconButton>
          <IconButton label="Delete (Del)" onClick={() => removeElement(el.id)} className="hover:!bg-flesh-100 hover:text-flesh-600">
            <Trash2 size={15} />
          </IconButton>
        </div>
      </div>

      <Section title="Position & size">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="X" value={el.x} onChange={(x) => update({ x })} />
          <NumberField label="Y" value={el.y} onChange={(y) => update({ y })} />
          <NumberField label="W" value={el.width} min={4} onChange={(width) => update({ width })} />
          {el.type !== "text" ? (
            <NumberField label="H" value={el.height} min={4} onChange={(height) => update({ height })} />
          ) : (
            <div />
          )}
          <NumberField label="↻" value={el.rotation} min={-360} max={360} suffix="°" onChange={(rotation) => update({ rotation })} />
        </div>
      </Section>

      {el.type === "text" && <TextControls el={el} update={update} />}
      {el.type === "image" && <ImageControls el={el} update={update} />}
      {el.type === "draw" && el.mode === "brush" && (
        <Section title="Stroke">
          <SliderField
            label="Width"
            value={el.strokeWidth}
            min={1}
            max={120}
            format={(v) => `${v}px`}
            onChange={(strokeWidth) => update({ strokeWidth })}
          />
          <div className="mt-3">
            <ColorField value={el.stroke} onChange={(stroke) => update({ stroke })} />
          </div>
        </Section>
      )}

      {(el.type === "rect" || el.type === "ellipse" || el.type === "triangle" || el.type === "star") && (
        <>
          <Section title="Fill">
            <ColorField value={el.fill} onChange={(fill) => update({ fill })} />
          </Section>
          <Section title="Border">
            <SliderField
              label="Width"
              value={el.strokeWidth}
              min={0}
              max={40}
              format={(v) => `${v}px`}
              onChange={(strokeWidth) => update({ strokeWidth })}
            />
            {el.strokeWidth > 0 && (
              <div className="mt-3">
                <ColorField value={el.stroke} onChange={(stroke) => update({ stroke })} />
              </div>
            )}
            {el.type === "rect" && (
              <div className="mt-3">
                <SliderField
                  label="Corner radius"
                  value={el.cornerRadius}
                  min={0}
                  max={Math.round(Math.min(el.width, el.height) / 2)}
                  format={(v) => `${v}px`}
                  onChange={(cornerRadius) => update({ cornerRadius })}
                />
              </div>
            )}
          </Section>
        </>
      )}

      <Section title="Appearance">
        <SliderField
          label="Opacity"
          value={Math.round(el.opacity * 100)}
          min={0}
          max={100}
          format={(v) => `${v}%`}
          onChange={(v) => update({ opacity: v / 100 })}
        />
      </Section>

      <Section title="Arrange">
        <div className="grid grid-cols-4 gap-1">
          <IconButton label="Bring to front" onClick={() => moveLayer(el.id, "top")}>
            <ChevronsUp size={16} />
          </IconButton>
          <IconButton label="Bring forward (Ctrl+])" onClick={() => moveLayer(el.id, "up")}>
            <ArrowUp size={16} />
          </IconButton>
          <IconButton label="Send backward (Ctrl+[)" onClick={() => moveLayer(el.id, "down")}>
            <ArrowDown size={16} />
          </IconButton>
          <IconButton label="Send to back" onClick={() => moveLayer(el.id, "bottom")}>
            <ChevronsDown size={16} />
          </IconButton>
        </div>
      </Section>
    </>
  );
}

function CanvasProperties() {
  const artboard = useEditor((s) => s.artboard);
  const updateArtboard = useEditor((s) => s.updateArtboard);
  return (
    <>
      <div className="border-b border-line px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Canvas</p>
        <p className="text-sm font-medium">Design settings</p>
      </div>
      <Section title="Size">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="W" value={artboard.width} min={16} max={8000} onChange={(width) => updateArtboard({ width })} />
          <NumberField label="H" value={artboard.height} min={16} max={8000} onChange={(height) => updateArtboard({ height })} />
        </div>
      </Section>
      <Section title="Background">
        <ColorField value={artboard.background} onChange={(background) => updateArtboard({ background })} />
      </Section>
      <Section title="Shortcuts">
        <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 text-xs">
          {[
            ["Undo / Redo", "Ctrl Z / Ctrl ⇧ Z"],
            ["Duplicate", "Ctrl D"],
            ["Delete", "Del"],
            ["Nudge", "Arrows (⇧ ×10)"],
            ["Layer up / down", "Ctrl ] / Ctrl ["],
            ["Edit text", "Double-click"],
            ["Deselect", "Esc"],
          ].map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd className="font-mono text-seed">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </>
  );
}

export function RightPanel() {
  const selected = useEditor((s) => s.elements.find((e) => e.id === s.selectedId));
  return (
    <aside className="panel-scroll w-72 shrink-0 overflow-y-auto border-l border-line bg-cream">
      {selected ? <ElementProperties el={selected} /> : <CanvasProperties />}
    </aside>
  );
}
