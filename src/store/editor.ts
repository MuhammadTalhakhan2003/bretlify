import { create } from "zustand";
import { nanoid } from "nanoid";
import type {
  Artboard,
  CanvasElement,
  CropRect,
  DesignDocument,
  DrawElement,
  ElementPatch,
  ElementType,
  ImageElement,
  ShapeElement,
  TextElement,
  Tool,
} from "@/lib/types";
import { DEFAULT_FILTERS } from "@/lib/types";

const HISTORY_LIMIT = 100;
/** Edits to the same element+fields within this window merge into one undo step. */
const COALESCE_MS = 600;
export const STORAGE_KEY = "bretlify:document";

interface Snapshot {
  elements: CanvasElement[];
  artboard: Artboard;
}

interface EditorState extends Snapshot {
  selectedId: string | null;
  zoom: number; // 0 = fit to screen; otherwise explicit scale
  fitScale: number; // scale that fits the artboard in the viewport
  past: Snapshot[];
  future: Snapshot[];
  lastCommit: { key: string; at: number } | null;
  tool: Tool;
  brushColor: string;
  brushSize: number;
  croppingId: string | null;

  setTool: (tool: Tool) => void;
  setBrush: (patch: { brushColor?: string; brushSize?: number }) => void;
  addDrawing: (points: number[], mode: DrawElement["mode"]) => void;
  setCropping: (id: string | null) => void;
  applyCrop: (id: string, crop: CropRect, box: { x: number; y: number; width: number; height: number }) => void;
  addElements: (elements: CanvasElement[]) => void;

  select: (id: string | null) => void;
  addShape: (type: ShapeElement["type"]) => void;
  addText: (preset?: "heading" | "body") => void;
  addImage: (src: string, naturalWidth: number, naturalHeight: number) => void;
  updateElement: (id: string, patch: ElementPatch) => void;
  removeElement: (id: string) => void;
  duplicateElement: (id: string) => void;
  moveLayer: (id: string, direction: "up" | "down" | "top" | "bottom") => void;
  reorderLayer: (fromIndex: number, toIndex: number) => void;
  updateArtboard: (patch: Partial<Artboard>) => void;
  setZoom: (zoom: number) => void;
  setFitScale: (fitScale: number) => void;
  undo: () => void;
  redo: () => void;
  loadDocument: (doc: DesignDocument) => void;
  newDocument: (artboard?: Partial<Artboard>) => void;
  toDocument: () => DesignDocument;
  hydrateFromStorage: () => void;
  /** Replace the document without touching undo history (initial load, remote sync). */
  replaceDocument: (doc: Snapshot, opts?: { resetHistory?: boolean }) => void;
}

export const DEFAULT_ARTBOARD: Artboard = { width: 1080, height: 1080, background: "#ffffff" };

const PALETTE = ["#ff4d6a", "#3c9a5f", "#ffc9d2", "#22603c", "#231a1d", "#ff7a90"];

const SHAPE_LABELS: Record<ElementType, string> = {
  rect: "Rectangle",
  ellipse: "Ellipse",
  triangle: "Triangle",
  star: "Star",
  text: "Text",
  image: "Image",
  draw: "Drawing",
};

function nextName(elements: CanvasElement[], type: ElementType) {
  const count = elements.filter((e) => e.type === type).length + 1;
  return `${SHAPE_LABELS[type]} ${count}`;
}

/** Fill in fields added after a document was saved (older autosaves / files). */
export function normalizeElements(elements: CanvasElement[]): CanvasElement[] {
  return elements.map((e) =>
    e.type === "image"
      ? {
          ...e,
          naturalWidth: e.naturalWidth ?? e.width,
          naturalHeight: e.naturalHeight ?? e.height,
          crop: e.crop ?? null,
          filters: { ...DEFAULT_FILTERS, ...e.filters },
        }
      : e,
  );
}

function loadSaved(): Snapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const doc = JSON.parse(raw) as DesignDocument;
    if (doc.version !== 1 || !Array.isArray(doc.elements)) return null;
    return { elements: normalizeElements(doc.elements), artboard: doc.artboard };
  } catch {
    return null;
  }
}

export const useEditor = create<EditorState>((set, get) => {
  /**
   * Record the current state in history before applying a change.
   * `key` identifies the kind of edit so rapid repeats (dragging a color
   * picker or slider) collapse into a single undo step.
   */
  const commit = (key: string | null, next: Partial<Snapshot>) => {
    const { elements, artboard, past, lastCommit } = get();
    const now = Date.now();
    const coalesce = key !== null && lastCommit?.key === key && now - lastCommit.at < COALESCE_MS;
    set({
      ...next,
      past: coalesce ? past : [...past, { elements, artboard }].slice(-HISTORY_LIMIT),
      future: [],
      lastCommit: key ? { key, at: now } : null,
    });
  };

  const center = (w: number, h: number) => {
    const { artboard } = get();
    return { x: Math.round((artboard.width - w) / 2), y: Math.round((artboard.height - h) / 2) };
  };

  const insert = (el: CanvasElement) => {
    commit(null, { elements: [...get().elements, el] });
    set({ selectedId: el.id });
  };

  return {
    elements: [],
    artboard: DEFAULT_ARTBOARD,
    selectedId: null,
    zoom: 0,
    fitScale: 1,
    past: [],
    future: [],
    lastCommit: null,
    tool: "select",
    brushColor: "#ff4d6a",
    brushSize: 12,
    croppingId: null,

    setTool: (tool) => set({ tool, selectedId: tool === "select" ? get().selectedId : null, croppingId: null }),

    setBrush: (patch) => set(patch),

    addDrawing: (points, mode) => {
      if (points.length < 4) return;
      const { brushColor, brushSize } = get();
      const xs = points.filter((_, i) => i % 2 === 0);
      const ys = points.filter((_, i) => i % 2 === 1);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const el: DrawElement = {
        id: nanoid(8),
        type: "draw",
        name: mode === "eraser" ? "Eraser stroke" : nextName(get().elements, "draw"),
        x: Math.round(minX),
        y: Math.round(minY),
        width: Math.max(1, Math.round(Math.max(...xs) - minX)),
        height: Math.max(1, Math.round(Math.max(...ys) - minY)),
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        points: points.map((p, i) => Math.round((p - (i % 2 === 0 ? minX : minY)) * 10) / 10),
        stroke: brushColor,
        strokeWidth: brushSize,
        mode,
      };
      commit(null, { elements: [...get().elements, el] });
    },

    setCropping: (id) => set({ croppingId: id, selectedId: id ?? get().selectedId }),

    applyCrop: (id, crop, box) => {
      commit(null, {
        elements: get().elements.map((e) => (e.id === id && e.type === "image" ? { ...e, crop, ...box } : e)),
      });
      set({ croppingId: null });
    },

    addElements: (elements) => {
      commit(null, { elements: [...get().elements, ...elements] });
    },

    select: (id) => set({ selectedId: id }),

    addShape: (type) => {
      const size = Math.round(Math.min(get().artboard.width, get().artboard.height) * 0.3);
      const fill = PALETTE[get().elements.length % PALETTE.length];
      const el: ShapeElement = {
        id: nanoid(8),
        type,
        name: nextName(get().elements, type),
        ...center(size, size),
        width: size,
        height: size,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        fill,
        stroke: "#231a1d",
        strokeWidth: 0,
        cornerRadius: type === "rect" ? 16 : 0,
      };
      insert(el);
    },

    addText: (preset = "heading") => {
      const isHeading = preset === "heading";
      const width = Math.round(get().artboard.width * 0.7);
      const fontSize = isHeading ? 96 : 40;
      const el: TextElement = {
        id: nanoid(8),
        type: "text",
        name: nextName(get().elements, "text"),
        ...center(width, fontSize * 1.2),
        width,
        height: Math.round(fontSize * 1.2),
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        text: isHeading ? "Add a heading" : "Add some body text",
        fontSize,
        fontFamily: "Inter, Arial, sans-serif",
        fontStyle: isHeading ? "bold" : "normal",
        align: "center",
        fill: "#231a1d",
      };
      insert(el);
    },

    addImage: (src, naturalWidth, naturalHeight) => {
      const { artboard } = get();
      const scale = Math.min(1, (artboard.width * 0.8) / naturalWidth, (artboard.height * 0.8) / naturalHeight);
      const width = Math.round(naturalWidth * scale);
      const height = Math.round(naturalHeight * scale);
      const el: ImageElement = {
        id: nanoid(8),
        type: "image",
        name: nextName(get().elements, "image"),
        ...center(width, height),
        width,
        height,
        rotation: 0,
        opacity: 1,
        visible: true,
        locked: false,
        src,
        naturalWidth,
        naturalHeight,
        crop: null,
        filters: { ...DEFAULT_FILTERS },
      };
      insert(el);
    },

    updateElement: (id, patch) => {
      const key = `update:${id}:${Object.keys(patch).sort().join(",")}`;
      commit(key, {
        elements: get().elements.map((e) => (e.id === id ? ({ ...e, ...patch } as CanvasElement) : e)),
      });
    },

    removeElement: (id) => {
      commit(null, { elements: get().elements.filter((e) => e.id !== id) });
      if (get().selectedId === id) set({ selectedId: null });
    },

    duplicateElement: (id) => {
      const elements = get().elements;
      const index = elements.findIndex((e) => e.id === id);
      if (index === -1) return;
      const source = elements[index];
      const copy = { ...source, id: nanoid(8), name: `${source.name} copy`, x: source.x + 24, y: source.y + 24 };
      const next = [...elements];
      next.splice(index + 1, 0, copy);
      commit(null, { elements: next });
      set({ selectedId: copy.id });
    },

    moveLayer: (id, direction) => {
      const elements = get().elements;
      const from = elements.findIndex((e) => e.id === id);
      if (from === -1) return;
      const last = elements.length - 1;
      const to =
        direction === "up" ? Math.min(last, from + 1)
        : direction === "down" ? Math.max(0, from - 1)
        : direction === "top" ? last
        : 0;
      get().reorderLayer(from, to);
    },

    reorderLayer: (fromIndex, toIndex) => {
      if (fromIndex === toIndex) return;
      const next = [...get().elements];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      commit(null, { elements: next });
    },

    updateArtboard: (patch) => {
      commit(`artboard:${Object.keys(patch).sort().join(",")}`, { artboard: { ...get().artboard, ...patch } });
    },

    setZoom: (zoom) => set({ zoom }),

    setFitScale: (fitScale) => set({ fitScale }),

    undo: () => {
      const { past, future, elements, artboard, selectedId } = get();
      const previous = past.at(-1);
      if (!previous) return;
      set({
        ...previous,
        past: past.slice(0, -1),
        future: [{ elements, artboard }, ...future],
        lastCommit: null,
        selectedId: previous.elements.some((e) => e.id === selectedId) ? selectedId : null,
      });
    },

    redo: () => {
      const { past, future, elements, artboard, selectedId } = get();
      const next = future[0];
      if (!next) return;
      set({
        ...next,
        past: [...past, { elements, artboard }],
        future: future.slice(1),
        lastCommit: null,
        selectedId: next.elements.some((e) => e.id === selectedId) ? selectedId : null,
      });
    },

    loadDocument: (doc) => {
      commit(null, { elements: normalizeElements(doc.elements), artboard: doc.artboard });
      set({ selectedId: null, zoom: 0 });
    },

    newDocument: (artboard) => {
      commit(null, { elements: [], artboard: { ...DEFAULT_ARTBOARD, ...artboard } });
      set({ selectedId: null, zoom: 0 });
    },

    toDocument: () => ({ version: 1, artboard: get().artboard, elements: get().elements }),

    hydrateFromStorage: () => {
      const saved = loadSaved();
      if (saved) set({ ...saved, past: [], future: [], selectedId: null });
    },

    replaceDocument: (doc, opts) => {
      const { selectedId } = get();
      const elements = normalizeElements(doc.elements);
      set({
        elements,
        artboard: doc.artboard,
        selectedId: elements.some((e) => e.id === selectedId) ? selectedId : null,
        ...(opts?.resetHistory ? { past: [], future: [], lastCommit: null } : {}),
      });
    },
  };
});
