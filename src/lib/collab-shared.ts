export const roomIdFor = (projectId: string) => `bretlify:project:${projectId}`;

const COLORS = ["#ff4d6a", "#3c9a5f", "#e8a317", "#5b6cff", "#c03fd1", "#0fa3a3", "#ff7a3d"];

/** Stable per-user cursor color. */
export function colorFor(userId: string) {
  let hash = 0;
  for (const ch of userId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length];
}
