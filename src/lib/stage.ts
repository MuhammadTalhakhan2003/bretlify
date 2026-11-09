import type Konva from "konva";
import { useEditor } from "@/store/editor";

/** Shared handle to the Konva stage so toolbar actions (export) can reach it. */
export const stageHandle: { current: Konva.Stage | null } = { current: null };

export function exportImage(format: "png" | "jpeg", pixelRatio = 1) {
  const stage = stageHandle.current;
  if (!stage) return;
  const { artboard } = useEditor.getState();
  const background = stage.findOne("#artboard-bg");
  if (!background) return;

  // Hide editor-only UI (selection handles) during capture.
  const transformer = stage.findOne("Transformer");
  const wasVisible = transformer?.visible();
  transformer?.visible(false);

  // Crop to the artboard on screen, then upscale back to its true pixel size.
  const box = background.getClientRect({ skipShadow: true, skipStroke: true });
  const url = stage.toDataURL({
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    pixelRatio: (artboard.width / box.width) * pixelRatio,
    mimeType: format === "png" ? "image/png" : "image/jpeg",
    quality: 0.95,
  });

  transformer?.visible(wasVisible ?? true);
  download(url, `bretlify-design.${format === "png" ? "png" : "jpg"}`);
}

export function download(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
