"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { Loader2, Plus, Sparkles, Trash2, Users } from "lucide-react";
import { Logo } from "@/components/editor/Logo";
import { DocPreview } from "@/components/editor/DocPreview";
import { TEMPLATES } from "@/lib/templates";
import { DEFAULT_ARTBOARD } from "@/store/editor";
import { SIZE_PRESETS } from "@/lib/presets";
import type { DesignDocument } from "@/lib/types";

interface ProjectCard {
  id: string;
  title: string;
  shared: boolean;
  updated_at: string;
  document: DesignDocument;
}

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function Dashboard() {
  const router = useRouter();
  const { user } = useUser();
  const [projects, setProjects] = useState<ProjectCard[] | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Couldn't load your designs"))))
      .then((d) => setProjects(d.projects))
      .catch((e: Error) => setError(e.message));
  }, []);

  const create = async (key: string, title: string, document: DesignDocument) => {
    setCreating(key);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, document }),
      });
      if (!res.ok) throw new Error("Couldn't create design");
      const { id } = await res.json();
      router.push(`/editor/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setCreating(null);
    }
  };

  const remove = async (p: ProjectCard) => {
    if (!confirm(`Delete "${p.title}"? This can't be undone.`)) return;
    setProjects((list) => list?.filter((x) => x.id !== p.id) ?? null);
    const res = await fetch(`/api/projects/${p.id}`, { method: "DELETE" });
    if (!res.ok) {
      setProjects((list) => (list ? [p, ...list] : list));
      setError("Couldn't delete that design");
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-cream">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between bg-rind-800 px-6 text-white">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <span className="text-lg font-semibold tracking-tight">
            Bret<span className="text-flesh-400">lify</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/editor" className="text-sm text-rind-100 hover:text-white">
            Quick draft
          </Link>
          <UserButton />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          {user?.firstName ? `Hey ${user.firstName}, what are we making?` : "What are we making today?"}
        </h1>

        <section className="mt-8">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted">Start a blank design</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {SIZE_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                disabled={!!creating}
                onClick={() =>
                  create(`size-${p.label}`, p.label, {
                    version: 1,
                    artboard: { ...DEFAULT_ARTBOARD, width: p.width, height: p.height },
                    elements: [],
                  })
                }
                className="group flex w-36 shrink-0 flex-col items-center gap-2 rounded-xl border border-line bg-white p-3 text-center transition-all hover:-translate-y-0.5 hover:border-flesh-200 hover:shadow-md"
              >
                <div className="flex h-20 w-full items-center justify-center">
                  <div
                    className="flex items-center justify-center rounded border-2 border-dashed border-flesh-200 bg-flesh-100/50 text-flesh-500 group-hover:border-flesh-400"
                    style={{
                      width: p.width >= p.height ? 72 : (72 * p.width) / p.height,
                      height: p.height > p.width ? 72 : (72 * p.height) / p.width,
                    }}
                  >
                    {creating === `size-${p.label}` ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  </div>
                </div>
                <span className="text-xs font-medium">{p.label}</span>
                <span className="text-[11px] text-muted">
                  {p.width}×{p.height}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
            <Sparkles size={12} /> Templates
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={!!creating}
                onClick={() => create(t.id, t.name, t.build())}
                className="group text-left"
              >
                <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-line bg-workspace p-2 transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
                  <DocPreview doc={t.build()} className="max-h-full max-w-full rounded-sm" />
                  {creating === t.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                      <Loader2 className="animate-spin text-flesh-500" />
                    </div>
                  )}
                </div>
                <p className="mt-1.5 truncate text-xs font-medium">{t.name}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted">Your designs</h2>
          {error && <p className="mb-3 rounded-lg bg-flesh-100 px-3 py-2 text-sm text-flesh-600">{error}</p>}
          {projects === null && !error && (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-flesh-100/60" />
              ))}
            </div>
          )}
          {projects?.length === 0 && (
            <div className="rounded-2xl border border-dashed border-flesh-200 bg-white p-10 text-center">
              <p className="font-medium">No designs yet</p>
              <p className="mt-1 text-sm text-muted">Pick a size or template above, or try Magic Design in the editor.</p>
            </div>
          )}
          {projects && projects.length > 0 && (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {projects.map((p) => (
                <div key={p.id} className="group relative">
                  <Link href={`/editor/${p.id}`} className="block">
                    <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-line bg-workspace p-3 transition-all group-hover:-translate-y-0.5 group-hover:border-flesh-200 group-hover:shadow-[0_10px_30px_-12px_rgba(232,48,79,0.45)]">
                      <DocPreview doc={p.document} className="max-h-full max-w-full rounded-sm shadow-sm" />
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium">{p.title}</p>
                      {p.shared && <Users size={13} className="shrink-0 text-rind-500" aria-label="Shared" />}
                    </div>
                    <p className="text-xs text-muted">Edited {timeAgo(p.updated_at)}</p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(p)}
                    aria-label={`Delete ${p.title}`}
                    className="absolute right-2 top-2 rounded-md bg-white/90 p-1.5 text-muted opacity-0 shadow-sm transition-opacity hover:text-flesh-600 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
