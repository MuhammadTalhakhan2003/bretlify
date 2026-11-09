"use client";

import { useRef, useState } from "react";
import {
  Circle,
  Eye,
  EyeOff,
  Heading,
  ImagePlus,
  Image as ImageIcon,
  Eraser,
  Lock,
  LockOpen,
  MousePointer2,
  PenLine,
  Square,
  Star,
  Triangle,
  Type,
  type LucideIcon,
} from "lucide-react";
import { useEditor } from "@/store/editor";
import { addImageFile } from "@/lib/files";
import type { ElementType, Tool } from "@/lib/types";
import { ColorField, SliderField } from "./ui";

const TYPE_ICONS: Record<ElementType, LucideIcon> = {
  rect: Square,
  ellipse: Circle,
  triangle: Triangle,
  star: Star,
  text: Type,
  image: ImageIcon,
  draw: PenLine,
};

function InsertTile({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-3 text-xs text-seed transition-all hover:-translate-y-0.5 hover:border-flesh-200 hover:shadow-[0_4px_14px_-6px_rgba(232,48,79,0.35)]"
    >
      <Icon size={20} className="text-rind-700 transition-colors group-hover:text-flesh-500" />
      {label}
    </button>
  );
}

function LayerRow({ id, index }: { id: string; index: number }) {
  const el = useEditor((s) => s.elements.find((e) => e.id === id))!;
  const selected = useEditor((s) => s.selectedId === id);
  const select = useEditor((s) => s.select);
  const updateElement = useEditor((s) => s.updateElement);
  const reorderLayer = useEditor((s) => s.reorderLayer);
  const [renaming, setRenaming] = useState(false);
  const [dropHint, setDropHint] = useState<"above" | "below" | null>(null);
  const Icon = TYPE_ICONS[el.type];

  return (
    <li
      draggable={!renaming}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/layer-index", String(index));
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("text/layer-index")) return;
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        setDropHint(e.clientY < rect.top + rect.height / 2 ? "above" : "below");
      }}
      onDragLeave={() => setDropHint(null)}
      onDrop={(e) => {
        e.preventDefault();
        const from = Number(e.dataTransfer.getData("text/layer-index"));
        // The list is shown top-most first, so "above" means a higher z-index.
        let to = dropHint === "above" ? index + 1 : index;
        if (from < to) to -= 1;
        setDropHint(null);
        if (Number.isFinite(from)) reorderLayer(from, Math.max(0, to));
      }}
      onClick={() => select(id)}
      className={`group relative flex h-9 cursor-pointer items-center gap-2 rounded-md px-2 text-sm transition-colors ${
        selected ? "bg-flesh-100 text-flesh-600" : "hover:bg-rind-100/60"
      } ${el.visible ? "" : "opacity-50"}`}
    >
      {dropHint && (
        <span className={`absolute inset-x-1 h-0.5 rounded bg-flesh-500 ${dropHint === "above" ? "-top-px" : "-bottom-px"}`} />
      )}
      <Icon size={15} className={selected ? "text-flesh-500" : "text-rind-700"} />
      {renaming ? (
        <input
          autoFocus
          defaultValue={el.name}
          className="min-w-0 flex-1 rounded border border-flesh-200 bg-white px-1 text-sm text-seed outline-none"
          onBlur={(e) => {
            const name = e.currentTarget.value.trim();
            if (name && name !== el.name) updateElement(id, { name });
            setRenaming(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
          }}
        />
      ) : (
        <span className="min-w-0 flex-1 truncate" onDoubleClick={() => setRenaming(true)} title="Double-click to rename">
          {el.name}
        </span>
      )}
      <button
        type="button"
        title={el.locked ? "Unlock" : "Lock"}
        onClick={(e) => {
          e.stopPropagation();
          updateElement(id, { locked: !el.locked });
        }}
        className={`rounded p-1 hover:bg-white ${el.locked ? "text-flesh-500" : "text-muted opacity-0 group-hover:opacity-100"}`}
      >
        {el.locked ? <Lock size={13} /> : <LockOpen size={13} />}
      </button>
      <button
        type="button"
        title={el.visible ? "Hide" : "Show"}
        onClick={(e) => {
          e.stopPropagation();
          updateElement(id, { visible: !el.visible });
        }}
        className={`rounded p-1 hover:bg-white ${el.visible ? "text-muted opacity-0 group-hover:opacity-100" : "text-flesh-500"}`}
      >
        {el.visible ? <Eye size={13} /> : <EyeOff size={13} />}
      </button>
    </li>
  );
}

function ToolsSection() {
  const tool = useEditor((s) => s.tool);
  const setTool = useEditor((s) => s.setTool);
  const brushColor = useEditor((s) => s.brushColor);
  const brushSize = useEditor((s) => s.brushSize);
  const setBrush = useEditor((s) => s.setBrush);
  const tools: { id: Tool; label: string; icon: LucideIcon; key: string }[] = [
    { id: "select", label: "Select", icon: MousePointer2, key: "V" },
    { id: "brush", label: "Brush", icon: PenLine, key: "B" },
    { id: "eraser", label: "Eraser", icon: Eraser, key: "E" },
  ];
  return (
    <div className="border-b border-line p-4">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted">Tools</h3>
      <div className="grid grid-cols-3 gap-1 rounded-lg border border-line bg-white p-1">
        {tools.map(({ id, label, icon: Icon, key }) => (
          <button
            key={id}
            type="button"
            title={`${label} (${key})`}
            onClick={() => setTool(id)}
            className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
              tool === id ? "bg-rind-700 text-white" : "text-seed hover:bg-rind-100"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
      {tool !== "select" && (
        <div className="mt-3 space-y-3">
          <SliderField
            label={tool === "eraser" ? "Eraser size" : "Brush size"}
            value={brushSize}
            min={1}
            max={120}
            format={(v) => `${v}px`}
            onChange={(v) => setBrush({ brushSize: v })}
          />
          {tool === "brush" && <ColorField value={brushColor} onChange={(c) => setBrush({ brushColor: c })} />}
          <p className="text-[11px] leading-relaxed text-muted">
            {tool === "brush" ? "Drag on the canvas to paint." : "Drag to erase through layers. The background stays."} Press Esc when done.
          </p>
        </div>
      )}
    </div>
  );
}

export function LeftPanel() {
  const addShape = useEditor((s) => s.addShape);
  const addText = useEditor((s) => s.addText);
  const ids = useEditor((s) => s.elements.map((e) => e.id).join("|"));
  const fileInput = useRef<HTMLInputElement>(null);
  const layerIds = ids ? ids.split("|") : [];

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-cream">
      <ToolsSection />
      <div className="border-b border-line p-4">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted">Insert</h3>
        <div className="grid grid-cols-3 gap-2">
          <InsertTile icon={Heading} label="Heading" onClick={() => addText("heading")} />
          <InsertTile icon={Type} label="Text" onClick={() => addText("body")} />
          <InsertTile icon={ImagePlus} label="Image" onClick={() => fileInput.current?.click()} />
          <InsertTile icon={Square} label="Rectangle" onClick={() => addShape("rect")} />
          <InsertTile icon={Circle} label="Ellipse" onClick={() => addShape("ellipse")} />
          <InsertTile icon={Triangle} label="Triangle" onClick={() => addShape("triangle")} />
          <InsertTile icon={Star} label="Star" onClick={() => addShape("star")} />
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            Array.from(e.target.files ?? []).forEach(addImageFile);
            e.target.value = "";
          }}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted">Layers</h3>
          <span className="rounded-full bg-rind-100 px-2 text-[11px] font-medium text-rind-700">{layerIds.length}</span>
        </div>
        <ul className="panel-scroll flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
          {layerIds.length === 0 && (
            <li className="mx-2 rounded-lg border border-dashed border-flesh-200 p-4 text-center text-xs leading-relaxed text-muted">
              No layers yet. Add a shape, some text, or drop an image onto the canvas.
            </li>
          )}
          {layerIds
            .map((id, index) => ({ id, index }))
            .reverse()
            .map(({ id, index }) => (
              <LayerRow key={id} id={id} index={index} />
            ))}
        </ul>
      </div>
    </aside>
  );
}
