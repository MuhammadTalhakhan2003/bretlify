import { nanoid } from "nanoid";
import type { CanvasElement, ShapeElement, TextElement } from "@/lib/types";
import type { AiLayout } from "@/app/api/ai/design/route";

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const color = (value: string | null | undefined, fallback: string) => (value && HEX.test(value) ? value : fallback);
const num = (value: number | null | undefined, fallback: number, min = -1e5, max = 1e5) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value as number))) : fallback;

/** Convert the model's layout into real editor elements, sanitizing anything out of range. */
export function layoutToElements(layout: AiLayout, artboard: { width: number; height: number }): CanvasElement[] {
  const maxSide = Math.max(artboard.width, artboard.height) * 2;
  return layout.elements.map((item, i): CanvasElement => {
    const common = {
      id: nanoid(8),
      name: item.name?.slice(0, 40) || `AI layer ${i + 1}`,
      x: num(item.x, 0, -maxSide, maxSide),
      y: num(item.y, 0, -maxSide, maxSide),
      width: num(item.width, 200, 4, maxSide),
      height: num(item.height, 200, 4, maxSide),
      rotation: num(item.rotation, 0, -360, 360),
      opacity: 1,
      visible: true,
      locked: false,
    };
    if (item.kind === "text") {
      const fontSize = num(item.fontSize, 48, 6, 800);
      const el: TextElement = {
        ...common,
        type: "text",
        text: item.text?.slice(0, 500) || "Your text",
        fontSize,
        height: Math.round(fontSize * 1.2),
        fontFamily: "Inter, Arial, sans-serif",
        fontStyle: item.bold ? "bold" : "normal",
        align: item.align ?? "center",
        fill: color(item.fill, "#231a1d"),
      };
      return el;
    }
    const el: ShapeElement = {
      ...common,
      type: item.kind,
      fill: color(item.fill, "#ff4d6a"),
      stroke: "#231a1d",
      strokeWidth: 0,
      cornerRadius: item.kind === "rect" ? num(item.cornerRadius, 0, 0, 2000) : 0,
    };
    return el;
  });
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

export const aiBackground = (layout: AiLayout, fallback: string) => color(layout.background, fallback);
