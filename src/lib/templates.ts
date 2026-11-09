import { nanoid } from "nanoid";
import type { CanvasElement, DesignDocument, ShapeElement, TextElement } from "@/lib/types";

const base = { rotation: 0, opacity: 1, visible: true, locked: false };

function shape(
  type: ShapeElement["type"],
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  extra: Partial<ShapeElement> = {},
): ShapeElement {
  return { id: nanoid(8), type, name, x, y, width, height, fill, stroke: "#231a1d", strokeWidth: 0, cornerRadius: 0, ...base, ...extra };
}

function text(
  name: string,
  value: string,
  x: number,
  y: number,
  width: number,
  fontSize: number,
  fill: string,
  extra: Partial<TextElement> = {},
): TextElement {
  return {
    id: nanoid(8),
    type: "text",
    name,
    text: value,
    x,
    y,
    width,
    height: Math.round(fontSize * 1.2),
    fontSize,
    fill,
    fontFamily: "Inter, Arial, sans-serif",
    fontStyle: "bold",
    align: "center",
    ...base,
    ...extra,
  };
}

export interface Template {
  id: string;
  name: string;
  category: string;
  build: () => DesignDocument;
}

const doc = (width: number, height: number, background: string, elements: CanvasElement[]): DesignDocument => ({
  version: 1,
  artboard: { width, height, background },
  elements,
});

export const TEMPLATES: Template[] = [
  {
    id: "summer-sale",
    name: "Summer Sale",
    category: "Instagram post",
    build: () =>
      doc(1080, 1080, "#ff4d6a", [
        shape("ellipse", "Sun", 620, -180, 640, 640, "#ff7a90"),
        shape("ellipse", "Rind", -220, 700, 900, 900, "#3c9a5f"),
        shape("ellipse", "Rind inner", -180, 740, 820, 820, "#ffffff"),
        text("Kicker", "LIMITED TIME", 90, 210, 900, 44, "#ffe8ec", { fontStyle: "normal", align: "left" }),
        text("Title", "SUMMER\nSALE", 90, 280, 900, 190, "#ffffff", { align: "left" }),
        text("Offer", "Up to 50% off everything", 90, 720, 900, 52, "#231a1d", { align: "left", fontStyle: "normal" }),
        shape("rect", "Button", 690, 900, 300, 96, "#231a1d", { cornerRadius: 48 }),
        text("Button label", "SHOP NOW", 690, 926, 300, 40, "#ffffff"),
      ]),
  },
  {
    id: "yt-thumbnail",
    name: "Bold Thumbnail",
    category: "YouTube thumbnail",
    build: () =>
      doc(1280, 720, "#231a1d", [
        shape("rect", "Highlight", 60, 380, 760, 150, "#ff4d6a", { rotation: -3 }),
        text("Line 1", "10 TIPS TO", 70, 150, 800, 150, "#ffffff", { align: "left" }),
        text("Line 2", "CODE FASTER", 90, 385, 800, 130, "#ffffff", { align: "left" }),
        shape("ellipse", "Badge", 900, 160, 320, 320, "#3c9a5f"),
        text("Badge text", "NEW\n2026", 900, 230, 320, 80, "#ffffff"),
        shape("star", "Spark", 1080, 520, 120, 120, "#ffc9d2"),
      ]),
  },
  {
    id: "quote",
    name: "Soft Quote",
    category: "Instagram post",
    build: () =>
      doc(1080, 1080, "#fffaf6", [
        shape("rect", "Card", 90, 90, 900, 900, "#ffe8ec", { cornerRadius: 48 }),
        text("Quote mark", "“", 90, 140, 900, 280, "#ff4d6a", { fontFamily: "Georgia, serif" }),
        text(
          "Quote",
          "Design is not just what it looks like. Design is how it works.",
          170,
          420,
          740,
          64,
          "#231a1d",
          { fontFamily: "Georgia, serif", fontStyle: "italic" },
        ),
        shape("rect", "Divider", 480, 760, 120, 8, "#3c9a5f", { cornerRadius: 4 }),
        text("Author", "STEVE JOBS", 90, 810, 900, 36, "#22603c", { fontStyle: "normal" }),
      ]),
  },
  {
    id: "event-story",
    name: "Event Night",
    category: "Instagram story",
    build: () =>
      doc(1080, 1920, "#1a4a2e", [
        shape("ellipse", "Glow", 140, 200, 800, 800, "#22603c"),
        shape("ellipse", "Melon", 290, 350, 500, 500, "#ff4d6a", { strokeWidth: 36, stroke: "#bfe5c9" }),
        text("Eyebrow", "YOU'RE INVITED", 90, 1080, 900, 48, "#bfe5c9", { fontStyle: "normal" }),
        text("Title", "Design\nMeetup", 90, 1160, 900, 150, "#ffffff"),
        text("Date", "FRI · DEC 12 · 7PM", 90, 1540, 900, 56, "#ffc9d2"),
        text("Venue", "The Melon Loft, Downtown", 90, 1630, 900, 40, "#e3f4e7", { fontStyle: "normal" }),
      ]),
  },
  {
    id: "presentation",
    name: "Clean Title Slide",
    category: "Presentation",
    build: () =>
      doc(1920, 1080, "#ffffff", [
        shape("rect", "Side band", 0, 0, 640, 1080, "#ff4d6a"),
        shape("ellipse", "Circle", 380, 640, 520, 520, "#3c9a5f"),
        text("Number", "01", 120, 120, 400, 120, "#ffffff", { align: "left" }),
        text("Title", "Quarterly\nProduct Review", 760, 340, 1060, 120, "#231a1d", { align: "left" }),
        text("Subtitle", "Growth, roadmap, and what's next", 760, 660, 1060, 48, "#8a7478", { align: "left", fontStyle: "normal" }),
      ]),
  },
  {
    id: "hiring",
    name: "We're Hiring",
    category: "LinkedIn banner",
    build: () =>
      doc(1584, 396, "#ffe8ec", [
        shape("ellipse", "Shape A", 1200, -160, 520, 520, "#ff4d6a"),
        shape("ellipse", "Shape B", 1060, 200, 300, 300, "#3c9a5f"),
        text("Title", "We're hiring designers", 80, 110, 1000, 84, "#231a1d", { align: "left" }),
        text("Subtitle", "Remote-friendly · Apply at bretlify.app/careers", 80, 230, 1000, 34, "#22603c", {
          align: "left",
          fontStyle: "normal",
        }),
      ]),
  },
];
