export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      {/* Watermelon slice */}
      <path d="M2 10 A14 14 0 0 0 30 10 Z" fill="#3c9a5f" />
      <path d="M4.2 10 A11.8 11.8 0 0 0 27.8 10 Z" fill="#ffffff" />
      <path d="M5.6 10 A10.4 10.4 0 0 0 26.4 10 Z" fill="#ff4d6a" />
      <ellipse cx="11" cy="13.5" rx="1" ry="1.5" fill="#231a1d" />
      <ellipse cx="16" cy="16.5" rx="1" ry="1.5" fill="#231a1d" />
      <ellipse cx="21" cy="13.5" rx="1" ry="1.5" fill="#231a1d" />
    </svg>
  );
}
