"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { STORAGE_KEY, useEditor } from "@/store/editor";

export type SaveStatus = "idle" | "saving" | "saved" | "error" | "offline";

interface ProjectSession {
  mode: "local" | "cloud";
  projectId: string | null;
  title: string;
  shared: boolean;
  isOwner: boolean;
  status: SaveStatus;
  loadError: string | null;
  set: (patch: Partial<Omit<ProjectSession, "set">>) => void;
}

/** Metadata about where the open design lives (browser vs. cloud project). */
export const useProject = create<ProjectSession>((set) => ({
  mode: "local",
  projectId: null,
  title: "Untitled design",
  shared: false,
  isOwner: true,
  status: "idle",
  loadError: null,
  set: (patch) => set(patch),
}));

/** Debounced autosave whenever the document changes. */
function onDocumentChange(save: () => void, delay: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const unsubscribe = useEditor.subscribe((state, prev) => {
    if (state.elements === prev.elements && state.artboard === prev.artboard) return;
    clearTimeout(timer);
    timer = setTimeout(save, delay);
  });
  return () => {
    clearTimeout(timer);
    unsubscribe();
  };
}

export function useLocalPersistence() {
  useEffect(() => {
    useProject.getState().set({ mode: "local", projectId: null, title: "Untitled design", status: "idle" });
    useEditor.getState().hydrateFromStorage();
    return onDocumentChange(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(useEditor.getState().toDocument()));
      } catch {
        // Storage full or blocked (large images); local autosave is best-effort.
      }
    }, 400);
  }, []);
}

export async function patchProject(projectId: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/projects/${projectId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Save failed");
}

export function useCloudPersistence(projectId: string) {
  useEffect(() => {
    const session = useProject.getState();
    session.set({ mode: "cloud", projectId, status: "idle", loadError: null });
    let cancelled = false;
    let ready = false;

    fetch(`/api/projects/${projectId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "This design doesn't exist or isn't shared with you." : "Couldn't load design.");
        const { project } = await res.json();
        if (cancelled) return;
        useEditor.getState().replaceDocument(project.document, { resetHistory: true });
        useEditor.getState().setZoom(0);
        useProject.getState().set({ title: project.title, shared: project.shared, isOwner: project.isOwner, status: "saved" });
        ready = true;
      })
      .catch((err: Error) => !cancelled && useProject.getState().set({ loadError: err.message }));

    const save = async () => {
      if (!ready) return;
      useProject.getState().set({ status: "saving" });
      try {
        await patchProject(projectId, { document: useEditor.getState().toDocument() });
        useProject.getState().set({ status: "saved" });
      } catch {
        useProject.getState().set({ status: navigator.onLine ? "error" : "offline" });
      }
    };
    const stop = onDocumentChange(save, 1200);

    // Flush pending work when the tab is hidden or closed.
    const flush = () => {
      if (ready && useProject.getState().status !== "saved") {
        navigator.sendBeacon?.(
          `/api/projects/${projectId}`,
          new Blob([JSON.stringify({ document: useEditor.getState().toDocument() })], { type: "application/json" }),
        );
      }
    };
    window.addEventListener("pagehide", flush);

    return () => {
      cancelled = true;
      stop();
      window.removeEventListener("pagehide", flush);
    };
  }, [projectId]);
}

/** Copy the current browser-only design into a new cloud project and return its id. */
export async function createCloudProject(title?: string) {
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, document: useEditor.getState().toDocument() }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Couldn't create project");
  return (await res.json()).id as string;
}
