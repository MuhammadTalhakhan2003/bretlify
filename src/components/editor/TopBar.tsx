"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { ChevronDown, Download, LayoutTemplate, Sparkles, FilePlus2, FolderOpen, Maximize, Redo2, Save, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { useEditor } from "@/store/editor";
import { exportImage } from "@/lib/stage";
import { openDocumentFile, saveDocumentFile } from "@/lib/files";
import { Logo } from "./Logo";
import { SIZE_PRESETS } from "@/lib/presets";
import { TemplatesModal } from "./TemplatesModal";
import { MagicModal } from "./MagicModal";
import { CollabAndAccount, ProjectTitle } from "./ProjectControls";


const ZOOM_STEPS = [0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4];

function DarkButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-md px-2 text-sm text-rind-100 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function useClickOutside(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onClose]);
  return ref;
}

export function TopBar() {
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const zoom = useEditor((s) => s.zoom);
  const fitScale = useEditor((s) => s.fitScale);
  const setZoom = useEditor((s) => s.setZoom);
  const artboard = useEditor((s) => s.artboard);
  const updateArtboard = useEditor((s) => s.updateArtboard);
  const newDocument = useEditor((s) => s.newDocument);

  const [exportOpen, setExportOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [magicOpen, setMagicOpen] = useState(false);
  const { isSignedIn } = useAuth();
  const exportRef = useClickOutside(() => setExportOpen(false));
  const sizeRef = useClickOutside(() => setSizeOpen(false));
  const openInput = useRef<HTMLInputElement>(null);

  const current = zoom || fitScale;
  const stepZoom = (dir: 1 | -1) => {
    const next = dir > 0 ? ZOOM_STEPS.find((z) => z > current + 0.001) : [...ZOOM_STEPS].reverse().find((z) => z < current - 0.001);
    if (next) setZoom(next);
  };

  const preset = SIZE_PRESETS.find((p) => p.width === artboard.width && p.height === artboard.height);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 bg-rind-800 px-3 text-white shadow-[0_1px_0_rgba(0,0,0,0.2)]">
      <Link href={isSignedIn ? "/dashboard" : "/"} className="flex items-center gap-2 pr-1" title="Back to your designs">
        <Logo />
        <span className="hidden text-lg font-semibold tracking-tight lg:inline">
          Bret<span className="text-flesh-400">lify</span>
        </span>
      </Link>

      <ProjectTitle />

      <div className="h-6 w-px bg-white/15" />

      <DarkButton
        label="New design"
        onClick={() => {
          if (useEditor.getState().elements.length === 0 || confirm("Start a new design? Unsaved work will be cleared.")) {
            newDocument({ width: artboard.width, height: artboard.height });
          }
        }}
      >
        <FilePlus2 size={17} />
      </DarkButton>
      <DarkButton label="Open design file" onClick={() => openInput.current?.click()}>
        <FolderOpen size={17} />
      </DarkButton>
      <DarkButton label="Save design file" onClick={saveDocumentFile}>
        <Save size={17} />
      </DarkButton>
      <input
        ref={openInput}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) openDocumentFile(file);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => setTemplatesOpen(true)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-rind-100 hover:bg-white/10"
      >
        <LayoutTemplate size={16} />
        <span className="hidden xl:inline">Templates</span>
      </button>
      {templatesOpen && <TemplatesModal onClose={() => setTemplatesOpen(false)} />}

      <button
        type="button"
        onClick={() => setMagicOpen(true)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-gradient-to-r from-flesh-500 to-flesh-400 px-3 text-sm font-semibold text-white shadow-sm hover:brightness-105"
      >
        <Sparkles size={15} />
        <span className="hidden lg:inline">Magic Design</span>
      </button>
      {magicOpen && <MagicModal onClose={() => setMagicOpen(false)} />}

      <div className="relative" ref={sizeRef}>
        <button
          type="button"
          onClick={() => setSizeOpen((o) => !o)}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-white/10 px-3 text-sm text-rind-100 hover:bg-white/15"
        >
          <span className="hidden 2xl:inline">{preset?.label ?? "Custom"}</span>
          <span className="tabular-nums text-rind-200/80">
            {artboard.width}Ã—{artboard.height}
          </span>
          <ChevronDown size={14} />
        </button>
        {sizeOpen && (
          <div className="absolute left-0 top-10 z-50 w-64 overflow-hidden rounded-lg border border-line bg-white py-1 text-seed shadow-xl">
            {SIZE_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  updateArtboard({ width: p.width, height: p.height });
                  setZoom(0);
                  setSizeOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-flesh-100"
              >
                <span>{p.label}</span>
                <span className="text-xs tabular-nums text-muted">
                  {p.width}Ã—{p.height}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-0.5">
        <DarkButton label="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo}>
          <Undo2 size={17} />
        </DarkButton>
        <DarkButton label="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!canRedo}>
          <Redo2 size={17} />
        </DarkButton>
      </div>

      <div className="h-6 w-px bg-white/15" />

      <div className="flex items-center gap-0.5">
        <DarkButton label="Zoom out" onClick={() => stepZoom(-1)}>
          <ZoomOut size={17} />
        </DarkButton>
        <button
          type="button"
          title="Fit to screen"
          onClick={() => setZoom(0)}
          className="w-14 rounded-md py-1 text-center text-sm tabular-nums text-rind-100 hover:bg-white/10"
        >
          {Math.round(current * 100)}%
        </button>
        <DarkButton label="Zoom in" onClick={() => stepZoom(1)}>
          <ZoomIn size={17} />
        </DarkButton>
        <DarkButton label="Fit to screen" onClick={() => setZoom(0)}>
          <Maximize size={16} />
        </DarkButton>
      </div>

      <div className="relative" ref={exportRef}>
        <button
          type="button"
          onClick={() => setExportOpen((o) => !o)}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-flesh-500 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-flesh-600"
        >
          <Download size={16} />
          Export
        </button>
        {exportOpen && (
          <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-lg border border-line bg-white py-1 text-seed shadow-xl">
            {[
              { label: "PNG", hint: "Best quality", run: () => exportImage("png") },
              { label: "PNG @2x", hint: "Retina / print", run: () => exportImage("png", 2) },
              { label: "JPG", hint: "Smaller file", run: () => exportImage("jpeg") },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  useEditor.getState().select(null);
                  // Wait a frame so the selection handles are gone before capture.
                  requestAnimationFrame(() => {
                    item.run();
                    setExportOpen(false);
                  });
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-flesh-100"
              >
                <span className="font-medium">{item.label}</span>
                <span className="text-xs text-muted">{item.hint}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <CollabAndAccount />
    </header>
  );
}
