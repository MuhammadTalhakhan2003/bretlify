"use client";

import { useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { TEMPLATES } from "@/lib/templates";
import { useEditor } from "@/store/editor";
import { DocPreview } from "./DocPreview";

export function TemplatesModal({ onClose }: { onClose: () => void }) {
  const loadDocument = useEditor((s) => s.loadDocument);
  const previews = useMemo(() => TEMPLATES.map((t) => ({ ...t, doc: t.build() })), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-seed/40 p-6 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label="Templates"
        className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-cream shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">Start from a template</h2>
            <p className="text-sm text-muted">Every element is fully editable. Undo brings your previous design back.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 hover:bg-flesh-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="panel-scroll grid grid-cols-2 gap-5 overflow-y-auto p-6 md:grid-cols-3">
          {previews.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                loadDocument(t.build());
                onClose();
              }}
              className="group text-left"
            >
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-line bg-workspace p-3 transition-all group-hover:-translate-y-0.5 group-hover:border-flesh-200 group-hover:shadow-[0_10px_30px_-12px_rgba(232,48,79,0.45)]">
                <DocPreview doc={t.doc} className="max-h-full max-w-full rounded shadow-sm" />
              </div>
              <p className="mt-2 text-sm font-medium">{t.name}</p>
              <p className="text-xs text-muted">{t.category}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
