"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Loader2, Sparkles, X } from "lucide-react";
import { useEditor } from "@/store/editor";
import { aiBackground, layoutToElements, postJson } from "@/lib/ai-layout";
import type { AiLayout } from "@/app/api/ai/design/route";

const EXAMPLES = [
  "Instagram post for a summer watermelon festival, playful and bold",
  "Minimal poster for a jazz night on Friday, dark and elegant",
  "YouTube thumbnail: 'I built Photoshop in a weekend', high energy",
  "Hiring announcement for a frontend engineer at a startup",
];

export function MagicModal({ onClose }: { onClose: () => void }) {
  const { isSignedIn } = useAuth();
  const artboard = useEditor((s) => s.artboard);
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"replace" | "add">(useEditor.getState().elements.length ? "add" : "replace");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const { layout } = await postJson<{ layout: AiLayout }>("/api/ai/design", {
        prompt,
        width: artboard.width,
        height: artboard.height,
      });
      const elements = layoutToElements(layout, artboard);
      const store = useEditor.getState();
      if (mode === "replace") {
        store.loadDocument({ version: 1, artboard: { ...artboard, background: aiBackground(layout, artboard.background) }, elements });
      } else {
        store.addElements(elements);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-seed/40 p-6 backdrop-blur-sm" onMouseDown={() => !busy && onClose()}>
      <div
        role="dialog"
        aria-label="Magic Design"
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-cream text-seed shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between bg-gradient-to-br from-flesh-500 to-flesh-400 px-6 py-5 text-white">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles size={18} /> Magic Design
            </h2>
            <p className="text-sm text-white/85">Describe it. Get an editable layout in seconds.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 hover:bg-white/15" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {!isSignedIn ? (
          <div className="p-6 text-sm">
            <p className="mb-4 text-muted">AI features need a free account, which also keeps the API from being abused.</p>
            <Link href="/sign-in" className="inline-flex rounded-lg bg-flesh-500 px-4 py-2 font-semibold text-white hover:bg-flesh-600">
              Sign in to use AI
            </Link>
          </div>
        ) : (
          <div className="space-y-4 p-6">
            <textarea
              autoFocus
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && prompt.trim().length > 2 && generate()}
              rows={3}
              maxLength={600}
              placeholder="e.g. A bold Instagram post announcing our summer sale, 30% off"
              className="w-full resize-none rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-flesh-400 focus:ring-2 focus:ring-flesh-100"
            />
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setPrompt(ex)}
                  className="rounded-full border border-line bg-white px-2.5 py-1 text-xs text-muted hover:border-flesh-200 hover:text-seed"
                >
                  {ex.length > 44 ? ex.slice(0, 42) + "…" : ex}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex rounded-lg border border-line bg-white p-0.5 text-xs">
                {(["replace", "add"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`rounded-md px-3 py-1.5 ${mode === m ? "bg-rind-700 text-white" : "text-seed hover:bg-rind-100"}`}
                  >
                    {m === "replace" ? "New design" : "Add to canvas"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={busy || prompt.trim().length < 3}
                onClick={generate}
                className="inline-flex items-center gap-2 rounded-lg bg-flesh-500 px-4 py-2 text-sm font-semibold text-white hover:bg-flesh-600 disabled:opacity-50"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {busy ? "Designing…" : "Generate"}
              </button>
            </div>
            {error && <p className="text-sm text-flesh-600">{error}</p>}
            <p className="text-[11px] text-muted">{artboard.width}×{artboard.height} canvas · Ctrl+Enter to generate · Undo reverts it</p>
          </div>
        )}
      </div>
    </div>
  );
}
