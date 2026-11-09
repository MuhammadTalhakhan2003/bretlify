"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Loader2, Sparkles } from "lucide-react";
import { postJson } from "@/lib/ai-layout";

const QUICK = ["Make it punchier", "Shorter", "More professional", "Add urgency", "Make it playful"];

export function AiCopy({ text, onPick }: { text: string; onPick: (text: string) => void }) {
  const { isSignedIn } = useAuth();
  const [instruction, setInstruction] = useState("");
  const [variants, setVariants] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (ask: string) => {
    if (ask.trim().length < 2) return;
    setBusy(true);
    setError(null);
    try {
      const res = await postJson<{ variants: string[] }>("/api/ai/copy", { text, instruction: ask });
      setVariants(res.variants);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!isSignedIn) {
    return <p className="text-xs text-muted">Sign in to rewrite text with AI.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <input
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run(instruction)}
          placeholder="Ask AI to rewrite…"
          className="h-8 min-w-0 flex-1 rounded-md border border-line bg-white px-2 text-sm outline-none focus:border-flesh-400 focus:ring-2 focus:ring-flesh-100"
        />
        <button
          type="button"
          onClick={() => run(instruction)}
          disabled={busy}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-flesh-500 text-white hover:bg-flesh-600 disabled:opacity-60"
          aria-label="Rewrite with AI"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            disabled={busy}
            onClick={() => run(q)}
            className="rounded-full border border-line bg-white px-2 py-0.5 text-[11px] text-muted hover:border-flesh-200 hover:text-seed"
          >
            {q}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-flesh-600">{error}</p>}
      {variants.length > 0 && (
        <ul className="space-y-1">
          {variants.map((v, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => onPick(v)}
                className="w-full rounded-md border border-flesh-200 bg-flesh-100/60 px-2 py-1.5 text-left text-xs leading-snug hover:bg-flesh-100"
              >
                {v}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
