"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ImagePlus } from "lucide-react";
import { useEditor } from "@/store/editor";
import { addImageFile } from "@/lib/files";
import { TopBar } from "./TopBar";
import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import Link from "next/link";
import { useCloudPersistence, useLocalPersistence, useProject } from "@/lib/persistence";
import { useCollaboration } from "@/lib/collab";

// Konva needs the browser canvas, so the stage only renders client-side.
const CanvasStage = dynamic(() => import("./CanvasStage"), {
  ssr: false,
  loading: () => <div className="workspace-dots h-full w-full" />,
});

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const s = useEditor.getState();
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if (mod && key === "y") {
        e.preventDefault();
        s.redo();
        return;
      }

      if (s.croppingId) return; // crop mode handles its own keys
      const id = s.selectedId;
      if (key === "escape") return s.tool !== "select" ? s.setTool("select") : s.select(null);
      if (!mod && !id) {
        if (key === "v") return s.setTool("select");
        if (key === "b") return s.setTool("brush");
        if (key === "e") return s.setTool("eraser");
      }
      if (!id) return;

      if (key === "delete" || key === "backspace") {
        e.preventDefault();
        s.removeElement(id);
      } else if (mod && key === "d") {
        e.preventDefault();
        s.duplicateElement(id);
      } else if (mod && e.key === "]") {
        e.preventDefault();
        s.moveLayer(id, e.shiftKey ? "top" : "up");
      } else if (mod && e.key === "[") {
        e.preventDefault();
        s.moveLayer(id, e.shiftKey ? "bottom" : "down");
      } else if (key.startsWith("arrow")) {
        const el = s.elements.find((x) => x.id === id);
        if (!el || el.locked) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = key === "arrowleft" ? -step : key === "arrowright" ? step : 0;
        const dy = key === "arrowup" ? -step : key === "arrowdown" ? step : 0;
        s.updateElement(id, { x: el.x + dx, y: el.y + dy });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

function LocalSession() {
  useLocalPersistence();
  return null;
}

function CloudSession({ projectId }: { projectId: string }) {
  useCloudPersistence(projectId);
  useCollaboration(projectId);
  return null;
}

export default function Editor({ projectId }: { projectId?: string }) {
  useShortcuts();
  const [dragging, setDragging] = useState(false);
  const loadError = useProject((s) => s.loadError);

  if (loadError) {
    return (
      <div className="workspace-dots flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-lg font-semibold">{loadError}</p>
        <Link href="/dashboard" className="rounded-lg bg-flesh-500 px-4 py-2 text-sm font-semibold text-white hover:bg-flesh-600">
          Back to your designs
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {projectId ? <CloudSession projectId={projectId} /> : <LocalSession />}
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <LeftPanel />
        <main
          className="relative min-w-0 flex-1"
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            Array.from(e.dataTransfer.files).forEach(addImageFile);
          }}
        >
          <CanvasStage />
          {dragging && (
            <div className="pointer-events-none absolute inset-3 flex items-center justify-center rounded-2xl border-2 border-dashed border-flesh-400 bg-flesh-100/70 backdrop-blur-[1px]">
              <div className="flex flex-col items-center gap-2 text-flesh-600">
                <ImagePlus size={36} />
                <p className="font-semibold">Drop images to add them</p>
              </div>
            </div>
          )}
        </main>
        <RightPanel />
      </div>
    </div>
  );
}
