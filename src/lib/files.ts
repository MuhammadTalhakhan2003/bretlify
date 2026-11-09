import { useEditor } from "@/store/editor";
import type { DesignDocument } from "@/lib/types";
import { download } from "@/lib/stage";
import { useProject } from "@/lib/persistence";

/**
 * In cloud projects, store image bytes in Vercel Blob and keep only the URL in the document.
 * Browser-only designs keep data URLs so they work offline.
 */
export async function persistImage(dataUrl: string, filename = "image.png"): Promise<string> {
  if (useProject.getState().mode !== "cloud" || !dataUrl.startsWith("data:")) return dataUrl;
  const { upload } = await import("@vercel/blob/client");
  const blob = await (await fetch(dataUrl)).blob();
  const result = await upload(`designs/${filename}`, blob, { access: "public", handleUploadUrl: "/api/upload" });
  return result.url;
}

const MAX_IMAGE_SIDE = 2400;

/** Read an image file, downscale very large photos, and add it to the canvas. */
export async function addImageFile(file: File) {
  if (!file.type.startsWith("image/")) return;
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = dataUrl;
  });

  let src = dataUrl;
  let { naturalWidth: w, naturalHeight: h } = img;
  const ratio = Math.min(1, MAX_IMAGE_SIDE / Math.max(w, h));
  if (ratio < 1 && file.type !== "image/svg+xml") {
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
    src = canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", 0.9);
  }
  try {
    src = await persistImage(src, file.name.replace(/[^\w.-]/g, "_"));
  } catch (err) {
    console.error("Upload failed, keeping image inline", err);
  }
  useEditor.getState().addImage(src, w, h);
}

export function saveDocumentFile() {
  const doc = useEditor.getState().toDocument();
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  download(url, "design.bretlify.json");
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function openDocumentFile(file: File) {
  try {
    const doc = JSON.parse(await file.text()) as DesignDocument;
    if (doc.version !== 1 || !Array.isArray(doc.elements) || !doc.artboard) throw new Error("Invalid file");
    useEditor.getState().loadDocument(doc);
  } catch {
    alert("That file isn't a valid Bretlify design.");
  }
}
