/**
 * Remove an image background entirely in the browser (WASM + ONNX model).
 * The model (~40 MB) downloads on first use and is cached by the browser.
 */
export async function removeImageBackground(src: string, onProgress?: (pct: number) => void): Promise<string> {
  const { removeBackground } = await import("@imgly/background-removal");
  const blob = await removeBackground(src, {
    output: { format: "image/png" },
    progress: (key, current, total) => {
      if (total > 0 && key.startsWith("fetch")) onProgress?.(Math.round((current / total) * 100));
    },
  });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
