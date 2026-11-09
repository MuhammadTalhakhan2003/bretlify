"use client";

import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";

export function IconButton({
  label,
  active,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
        active ? "bg-flesh-100 text-flesh-600" : "text-seed hover:bg-flesh-100/70"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="border-b border-line px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Number input that commits on blur/Enter so typing doesn't spam history. */
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  // Re-sync the draft when the value changes from outside (drag, undo, other users).
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    setSynced(value);
    setDraft(String(value));
  }

  const commit = () => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) return setDraft(String(value));
    const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, parsed));
    if (clamped !== value) onChange(clamped);
    setDraft(String(clamped));
  };

  return (
    <label className="flex h-8 items-center gap-1.5 rounded-md border border-line bg-white px-2 text-sm focus-within:border-flesh-400 focus-within:ring-2 focus-within:ring-flesh-100">
      <span className="w-4 shrink-0 text-[11px] font-semibold text-muted">{label}</span>
      <input
        type="number"
        className="w-full min-w-0 bg-transparent tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        value={draft}
        step={step}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            const delta = (e.key === "ArrowUp" ? step : -step) * (e.shiftKey ? 10 : 1);
            const next = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, value + delta));
            onChange(Math.round(next * 100) / 100);
          }
        }}
      />
      {suffix && <span className="text-xs text-muted">{suffix}</span>}
    </label>
  );
}

export const SWATCHES = ["#ff4d6a", "#ff7a90", "#ffc9d2", "#3c9a5f", "#22603c", "#bfe5c9", "#231a1d", "#ffffff"];

export function ColorField({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 shrink-0"
          aria-label="Pick color"
        />
        <input
          className="h-8 w-full rounded-md border border-line bg-white px-2 font-mono text-xs uppercase outline-none focus:border-flesh-400 focus:ring-2 focus:ring-flesh-100"
          value={value}
          onChange={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && onChange(e.target.value)}
          aria-label="Hex color"
        />
      </div>
      <div className="flex gap-1.5">
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            onClick={() => onChange(c)}
            className={`h-6 w-6 rounded-full border transition-transform hover:scale-110 ${
              value.toLowerCase() === c ? "border-seed ring-2 ring-flesh-200" : "border-line"
            }`}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  format = (v) => String(v),
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-sm">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums text-seed">{format(value)}</span>
      </div>
      <input
        type="range"
        className="w-full"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
