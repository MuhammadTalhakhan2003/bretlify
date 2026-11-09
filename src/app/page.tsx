import Link from "next/link";
import { Crop, Layers, MousePointer2, Sparkles, Users, Wand2 } from "lucide-react";
import { Logo } from "@/components/editor/Logo";
import { DocPreview } from "@/components/editor/DocPreview";
import { TEMPLATES } from "@/lib/templates";

const FEATURES = [
  { icon: MousePointer2, title: "A real canvas editor", body: "Shapes, text, images, layers, snapping rotation, undo/redo and pixel-perfect PNG/JPG export." },
  { icon: Crop, title: "Photo tools", body: "Crop, filters and presets, plus a brush and an eraser that cuts through layers." },
  { icon: Wand2, title: "Background removal", body: "One click, processed privately in your browser with an on-device AI model." },
  { icon: Sparkles, title: "Magic Design", body: "Describe what you need and get a fully editable layout. Rewrite any text with AI." },
  { icon: Users, title: "Live collaboration", body: "Share a link and design together with live cursors and selections." },
  { icon: Layers, title: "Cloud projects", body: "Sign in to autosave every design, start from templates and pick up anywhere." },
];

export default function Home() {
  const hero = TEMPLATES[0].build();
  const side = TEMPLATES[2].build();
  return (
    <div className="h-full overflow-y-auto bg-cream">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <Logo size={30} />
          <span className="text-xl font-semibold tracking-tight">
            Bret<span className="text-flesh-500">lify</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/dashboard" className="rounded-lg px-3 py-2 hover:bg-flesh-100">
            Dashboard
          </Link>
          <Link href="/editor" className="rounded-lg bg-seed px-4 py-2 font-medium text-white hover:bg-seed/90">
            Open editor
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rind-100 px-3 py-1 text-xs font-medium text-rind-700">
            <Sparkles size={12} /> Now with AI Magic Design
          </span>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Design anything,
            <br />
            <span className="text-flesh-500">right in your browser.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted">
            Bretlify is a fast, collaborative graphic design editor for social posts, thumbnails, posters and slides. No
            installs, no learning curve.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/editor"
              className="rounded-xl bg-flesh-500 px-6 py-3 font-semibold text-white shadow-[0_10px_30px_-10px_rgba(232,48,79,0.7)] hover:bg-flesh-600"
            >
              Start designing, free
            </Link>
            <Link href="/sign-up" className="rounded-xl border border-line bg-white px-6 py-3 font-semibold hover:border-flesh-200">
              Create an account
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 -z-0 rounded-[2rem] bg-gradient-to-br from-flesh-100 to-rind-100" />
          <div className="relative overflow-hidden rounded-2xl border border-line bg-white shadow-2xl">
            <div className="flex h-9 items-center gap-1.5 bg-rind-800 px-3">
              <span className="h-2.5 w-2.5 rounded-full bg-flesh-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-rind-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/40" />
            </div>
            <div className="workspace-dots grid grid-cols-[1fr_auto] gap-4 p-6">
              <DocPreview doc={hero} className="w-full rounded shadow-lg" />
              <DocPreview doc={side} className="w-28 self-end rounded shadow-lg" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-white py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-3xl font-semibold tracking-tight">Everything you need to make it pop</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-line bg-cream p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-flesh-100 text-flesh-500">
                  <Icon size={20} />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-sm text-muted">Built with Next.js, Konva, Neon, Clerk, Liveblocks and Groq.</footer>
    </div>
  );
}
