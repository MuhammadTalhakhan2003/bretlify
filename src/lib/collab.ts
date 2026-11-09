"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { createClient, LiveMap, type Json } from "@liveblocks/client";
import { useEditor } from "@/store/editor";
import { useProject } from "@/lib/persistence";
import { roomIdFor } from "@/lib/collab-shared";
import type { Artboard, CanvasElement } from "@/lib/types";

type Presence = { cursor: { x: number; y: number } | null; selectedId: string | null };
type Storage = {
  elements: LiveMap<string, Json>;
  order: string[];
  artboard: Json | null;
  seeded: boolean;
};
type UserMeta = { id: string; info: { name: string; color: string; avatar: string } };

export interface Peer {
  connectionId: number;
  name: string;
  color: string;
  avatar: string;
  cursor: Presence["cursor"];
  selectedId: string | null;
}

interface CollabState {
  status: "off" | "connecting" | "live" | "unavailable";
  peers: Peer[];
}

export const useCollab = create<CollabState>(() => ({ status: "off", peers: [] }));

let activeRoom: { updatePresence: (patch: Partial<Presence>) => void } | null = null;

/** Called by the canvas with the pointer position in artboard coordinates (or null on leave). */
export function reportCursor(cursor: Presence["cursor"]) {
  activeRoom?.updatePresence({ cursor });
}

const client = typeof window !== "undefined" ? createClient({ authEndpoint: "/api/liveblocks-auth", throttle: 50 }) : null;

const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b);

/**
 * Two-way sync between the local Zustand store and a Liveblocks room.
 * Elements are stored per id (last-writer-wins per element), so two people
 * editing different layers never clobber each other.
 */
export function useCollaboration(projectId: string) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/liveblocks-auth")
      .then((r) => r.json())
      .then((d: { enabled?: boolean }) => {
        if (cancelled) return;
        setEnabled(!!d.enabled);
        if (!d.enabled) useCollab.setState({ status: "unavailable" });
      })
      .catch(() => !cancelled && useCollab.setState({ status: "unavailable" }));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!client || !enabled) return;
    useCollab.setState({ status: "connecting", peers: [] });

    const { room, leave } = client.enterRoom<Presence, Storage>(roomIdFor(projectId), {
      initialPresence: { cursor: null, selectedId: null },
      initialStorage: { elements: new LiveMap(), order: [], artboard: null, seeded: false },
    });
    activeRoom = room;
    const cleanups: Array<() => void> = [];
    let applyingRemote = false;
    let pushingLocal = false;
    let disposed = false;

    cleanups.push(
      room.subscribe("status", (status) => {
        if (status === "connected") useCollab.setState({ status: "live" });
        else if (status === "connecting" || status === "reconnecting") useCollab.setState({ status: "connecting" });
      }),
      room.subscribe("error", () => useCollab.setState({ status: "unavailable" })),
      room.subscribe("others", (others) => {
        useCollab.setState({
          peers: others.map((o) => {
            const info = o.info as UserMeta["info"] | undefined;
            return {
            connectionId: o.connectionId,
            name: info?.name ?? "Guest",
            color: info?.color ?? "#ff4d6a",
            avatar: info?.avatar ?? "",
            cursor: o.presence.cursor,
            selectedId: o.presence.selectedId,
            };
          }),
        });
      }),
      useEditor.subscribe((s, prev) => {
        if (s.selectedId !== prev.selectedId) room.updatePresence({ selectedId: s.selectedId });
      }),
    );

    // Wait until the project document has loaded from the database before syncing.
    const whenLoaded = new Promise<void>((resolve) => {
      if (useProject.getState().status === "saved") return resolve();
      const unsub = useProject.subscribe((p) => {
        if (p.status === "saved") {
          unsub();
          resolve();
        }
      });
      cleanups.push(unsub);
    });

    Promise.all([room.getStorage(), whenLoaded]).then(([{ root }]) => {
      if (disposed) return;
      const elementsMap = root.get("elements");

      const pullRemote = () => {
        if (pushingLocal) return;
        const local = useEditor.getState();
        const localById = new Map(local.elements.map((e) => [e.id, e]));
        const elements = root
          .get("order")
          .map((id) => {
            const remote = elementsMap.get(id) as unknown as CanvasElement | undefined;
            if (!remote) return null;
            const mine = localById.get(id);
            return mine && same(mine, remote) ? mine : remote; // keep references stable when unchanged
          })
          .filter((e): e is CanvasElement => e !== null);
        const remoteArtboard = root.get("artboard") as unknown as Artboard | null;
        const artboard = remoteArtboard && !same(remoteArtboard, local.artboard) ? remoteArtboard : local.artboard;
        const changed =
          artboard !== local.artboard ||
          elements.length !== local.elements.length ||
          elements.some((e, i) => e !== local.elements[i]);
        if (!changed) return;
        applyingRemote = true;
        useEditor.getState().replaceDocument({ elements, artboard });
        applyingRemote = false;
      };

      const pushAll = () => {
        const { elements, artboard } = useEditor.getState();
        room.batch(() => {
          elementsMap.forEach((_, id) => elementsMap.delete(id));
          for (const e of elements) elementsMap.set(e.id, e as unknown as Json);
          root.set("order", elements.map((e) => e.id));
          root.set("artboard", artboard as unknown as Json);
          root.set("seeded", true);
        });
      };

      // First person in seeds the room from the saved design; later joiners adopt the live state.
      if (!root.get("seeded")) pushAll();
      else pullRemote();

      cleanups.push(
        room.subscribe(root, pullRemote, { isDeep: true }),
        useEditor.subscribe((s, prev) => {
          if (applyingRemote) return;
          if (s.elements === prev.elements && s.artboard === prev.artboard) return;
          pushingLocal = true;
          room.batch(() => {
            const prevById = new Map(prev.elements.map((e) => [e.id, e]));
            for (const e of s.elements) if (prevById.get(e.id) !== e) elementsMap.set(e.id, e as unknown as Json);
            const ids = new Set(s.elements.map((e) => e.id));
            for (const e of prev.elements) if (!ids.has(e.id)) elementsMap.delete(e.id);
            const order = s.elements.map((e) => e.id);
            if (order.join("|") !== prev.elements.map((e) => e.id).join("|")) root.set("order", order);
            if (s.artboard !== prev.artboard) root.set("artboard", s.artboard as unknown as Json);
          });
          pushingLocal = false;
        }),
      );
    }).catch(() => useCollab.setState({ status: "unavailable" }));

    return () => {
      disposed = true;
      cleanups.forEach((fn) => fn());
      activeRoom = null;
      leave();
      useCollab.setState({ status: "off", peers: [] });
    };
  }, [projectId, enabled]);
}
