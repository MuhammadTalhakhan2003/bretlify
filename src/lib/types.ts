export type ElementType = "rect" | "ellipse" | "triangle" | "star" | "text" | "image" | "draw";

export type Tool = "select" | "brush" | "eraser";

interface BaseElement {
  id: string;
  type: ElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
}

export interface ShapeElement extends BaseElement {
  type: "rect" | "ellipse" | "triangle" | "star";
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: "normal" | "bold" | "italic" | "italic bold";
  align: "left" | "center" | "right";
  fill: string;
}

export interface ImageFilters {
  brightness: number; // -1 .. 1
  contrast: number; // -100 .. 100
  saturation: number; // -2 .. 2
  hue: number; // 0 .. 359
  blur: number; // 0 .. 40 px
  grayscale: boolean;
  sepia: boolean;
  invert: boolean;
}

export const DEFAULT_FILTERS: ImageFilters = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  blur: 0,
  grayscale: false,
  sepia: false,
  invert: false,
};

/** Crop rectangle in the source image's natural pixel space. */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageElement extends BaseElement {
  type: "image";
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  crop: CropRect | null;
  filters: ImageFilters;
}

/** Freehand stroke. Points are relative to (x, y); eraser strokes cut through layers below. */
export interface DrawElement extends BaseElement {
  type: "draw";
  points: number[];
  stroke: string;
  strokeWidth: number;
  mode: "brush" | "eraser";
}

export type CanvasElement = ShapeElement | TextElement | ImageElement | DrawElement;

/** Patch type that accepts any field from any element variant. */
export type ElementPatch = Partial<Omit<ShapeElement, "type" | "id">> &
  Partial<Omit<TextElement, "type" | "id">> &
  Partial<Omit<ImageElement, "type" | "id">> &
  Partial<Omit<DrawElement, "type" | "id">>;

export interface Artboard {
  width: number;
  height: number;
  background: string;
}

export interface DesignDocument {
  version: 1;
  artboard: Artboard;
  elements: CanvasElement[];
}
