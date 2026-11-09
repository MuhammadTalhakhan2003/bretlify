# 🍉 Bretlify

**A fast, collaborative, AI-powered graphic design editor that runs in the browser.** Think a lightweight Canva/Photoshop hybrid for social posts, thumbnails, posters and slides.

<!-- Add a GIF/screenshot here: docs/demo.gif -->

## Features

| Area | What it does |
|---|---|
| **Canvas editor** | Shapes, text, and images. Drag, resize, rotate (snaps to 45°), inline text editing, layers panel with drag-to-reorder, lock and hide, keyboard shortcuts |
| **History** | Undo/redo with *edit coalescing*: dragging a slider or color picker becomes one undo step, not hundreds |
| **Photo tools** | Crop, 7 adjustable filters plus presets, brush, and an eraser that cuts through layers but keeps the background |
| **Background removal** | One click, runs **on-device** (WASM + ONNX), so the image never leaves the browser |
| **Export** | PNG, PNG @2x and JPG at the true artboard resolution, whatever the zoom level |
| **Templates** | Social, thumbnail, story, slide and banner starters, rendered as live SVG thumbnails |
| **Accounts & cloud** | Clerk auth, projects in Neon Postgres, debounced autosave with flush-on-close, image uploads straight to Vercel Blob |
| **Magic Design (AI)** | A prompt becomes a structured, *fully editable* layout (Groq + AI SDK structured output with schema validation) |
| **AI copywriter** | Rewrites any text layer ("punchier", "shorter", …) and returns 3 variants |
| **Live collaboration** | Liveblocks room per project, with per-element sync, live cursors and collaborators' selections |

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Konva / react-konva · Zustand · Clerk · Neon Postgres · Vercel Blob · AI SDK 7 + Groq · Liveblocks · Zod

## Architecture notes

- **State**: a single Zustand store holds the document (`elements`, `artboard`) and history. Every mutation goes through `commit()`, which snapshots the previous state. Repeated edits to the same element fields within 600 ms are merged into one undo step ([src/store/editor.ts](src/store/editor.ts)).
- **Rendering**: elements are plain JSON. The canvas maps each one to a Konva node. Filters use Konva's cached-bitmap pipeline, re-cached at source resolution so exports stay sharp. The background sits on its own layer, so `destination-out` eraser strokes reveal it instead of punching holes.
- **Persistence** is pluggable: browser drafts autosave to `localStorage`, and cloud projects autosave through `PATCH /api/projects/:id` ([src/lib/persistence.ts](src/lib/persistence.ts)).
- **Collaboration**: Liveblocks storage keeps a `LiveMap<id, element>` plus an `order` array, so two people editing *different* layers never overwrite each other. Local↔remote sync diffs by reference, so only changed elements go over the wire ([src/lib/collab.ts](src/lib/collab.ts)).
- **AI safety**: model output is validated with Zod, then sanitized (clamped numbers, hex-only colors) before it becomes elements ([src/lib/ai-layout.ts](src/lib/ai-layout.ts)). AI routes require sign-in.
- **Access control**: a project is readable and editable by its owner, and by any signed-in user once link sharing is on. Only owners can rename, share or delete. The Liveblocks auth endpoint checks the same rule before issuing a room token.

## Getting started

```bash
npm install
vercel link                  # or create .env.local by hand (see .env.example)
vercel env pull .env.local   # DATABASE_URL, BLOB_READ_WRITE_TOKEN, Clerk keys
npm run db:migrate           # creates the projects table
npm run dev
```

Then add your own keys to `.env.local`:

```
GROQ_API_KEY=...             # https://console.groq.com/keys (AI features)
LIVEBLOCKS_SECRET_KEY=...    # https://liveblocks.io/dashboard (live collaboration)
```

Without these keys the editor still works: AI buttons explain what's missing, and collaboration falls back to plain cloud saves.

## Keyboard shortcuts

| Action | Keys |
|---|---|
| Undo / redo | Ctrl Z / Ctrl Shift Z |
| Duplicate / delete | Ctrl D / Del |
| Nudge | Arrows (Shift = 10px) |
| Layer up / down | Ctrl ] / Ctrl [ |
| Select / brush / eraser | V / B / E |
| Edit text | Double-click |
