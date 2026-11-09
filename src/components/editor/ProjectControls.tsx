"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, UserButton } from "@clerk/nextjs";
import { Check, CloudOff, CloudUpload, Link2, Loader2, Share2, TriangleAlert, Users } from "lucide-react";
import { createCloudProject, patchProject, useProject } from "@/lib/persistence";
import { useCollab } from "@/lib/collab";

export function ProjectTitle() {
  const { mode, title, isOwner, status, projectId } = useProject();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [saving, setSaving] = useState(false);

  if (mode === "local") {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-rind-200/80 md:inline">Browser draft</span>
        {isSignedIn ? (
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                const id = await createCloudProject();
                router.push(`/editor/${id}`);
              } catch (err) {
                alert((err as Error).message);
                setSaving(false);
              }
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-white/10 px-2.5 text-sm text-rind-100 hover:bg-white/15"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <CloudUpload size={15} />}
            Save to cloud
          </button>
        ) : (
          <Link href="/sign-in" className="inline-flex h-8 items-center gap-1.5 rounded-md bg-white/10 px-2.5 text-sm text-rind-100 hover:bg-white/15">
            <CloudUpload size={15} /> Sign in to save
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <input
        key={title}
        defaultValue={title}
        readOnly={!isOwner}
        aria-label="Design title"
        onBlur={(e) => {
          const next = e.currentTarget.value.trim();
          if (!next || next === title || !projectId) return;
          useProject.getState().set({ title: next });
          patchProject(projectId, { title: next }).catch(() => useProject.getState().set({ status: "error" }));
        }}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className="w-44 min-w-0 truncate rounded-md bg-transparent px-2 py-1 text-sm font-medium text-white outline-none hover:bg-white/10 focus:bg-white/15"
      />
      <SaveBadge status={status} />
    </div>
  );
}

function SaveBadge({ status }: { status: ReturnType<typeof useProject.getState>["status"] }) {
  const map = {
    idle: null,
    saving: { icon: <Loader2 size={13} className="animate-spin" />, text: "Saving…" },
    saved: { icon: <Check size={13} />, text: "Saved" },
    error: { icon: <TriangleAlert size={13} />, text: "Save failed" },
    offline: { icon: <CloudOff size={13} />, text: "Offline" },
  } as const;
  const item = map[status];
  if (!item) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${status === "error" ? "text-flesh-200" : "text-rind-200/80"}`}>
      {item.icon}
      <span className="hidden lg:inline">{item.text}</span>
    </span>
  );
}

export function CollabAndAccount() {
  const { isSignedIn } = useAuth();
  const { mode, isOwner, shared, projectId } = useProject();
  const { status, peers } = useCollab();
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {mode === "cloud" && (
        <>
          <div className="flex items-center -space-x-2" title={status === "live" ? "Live collaboration on" : undefined}>
            {peers.slice(0, 4).map((p) => (
              <span
                key={p.connectionId}
                title={p.name}
                className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 text-[11px] font-semibold text-white"
                style={{ borderColor: p.color, background: p.color }}
              >
                {p.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  p.name.slice(0, 1).toUpperCase()
                )}
              </span>
            ))}
            {peers.length > 4 && (
              <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-rind-800 bg-white/20 text-[11px]">
                +{peers.length - 4}
              </span>
            )}
          </div>
          {status === "live" && (
            <span className="hidden items-center gap-1 text-xs text-rind-200 xl:inline-flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rind-200" /> Live
            </span>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShareOpen((o) => !o)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-white/10 px-2.5 text-sm text-rind-100 hover:bg-white/15"
            >
              <Share2 size={15} /> <span className="hidden md:inline">Share</span>
            </button>
            {shareOpen && (
              <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-line bg-white p-4 text-seed shadow-xl">
                <p className="mb-1 flex items-center gap-1.5 font-semibold">
                  <Users size={16} className="text-rind-700" /> Collaborate
                </p>
                <p className="mb-3 text-xs text-muted">
                  Anyone signed in with the link can edit together in real time.
                  {status === "unavailable" && " Live cursors need LIVEBLOCKS_SECRET_KEY to be set."}
                </p>
                <label className={`mb-3 flex items-center justify-between rounded-lg border border-line p-2.5 text-sm ${isOwner ? "" : "opacity-60"}`}>
                  Link sharing
                  <input
                    type="checkbox"
                    checked={shared}
                    disabled={!isOwner}
                    onChange={async (e) => {
                      const next = e.target.checked;
                      useProject.getState().set({ shared: next });
                      try {
                        await patchProject(projectId!, { shared: next });
                      } catch {
                        useProject.getState().set({ shared: !next });
                      }
                    }}
                    className="h-4 w-4 accent-flesh-500"
                  />
                </label>
                <button
                  type="button"
                  disabled={!shared}
                  onClick={async () => {
                    await navigator.clipboard.writeText(window.location.href);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-flesh-500 py-2 text-sm font-semibold text-white hover:bg-flesh-600 disabled:opacity-40"
                >
                  {copied ? <Check size={15} /> : <Link2 size={15} />}
                  {copied ? "Copied!" : "Copy invite link"}
                </button>
              </div>
            )}
          </div>
        </>
      )}
      {isSignedIn ? (
        <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
      ) : (
        <Link href="/sign-in" className="text-sm text-rind-100 hover:text-white">
          Sign in
        </Link>
      )}
    </div>
  );
}
