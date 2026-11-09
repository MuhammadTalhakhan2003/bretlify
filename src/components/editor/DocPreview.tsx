import type { DesignDocument } from "@/lib/types";

/** Lightweight SVG renderer for thumbnails (templates, project cards). No Konva needed. */
export function DocPreview({ doc, className = "" }: { doc: DesignDocument; className?: string }) {
  const { width, height, background } = doc.artboard;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} preserveAspectRatio="xMidYMid meet">
      <defs>
        <clipPath id={`clip-${width}-${height}`}>
          <rect width={width} height={height} />
        </clipPath>
      </defs>
      <rect width={width} height={height} fill={background} />
      <g clipPath={`url(#clip-${width}-${height})`}>
        {doc.elements.map((el) => {
          if (!el.visible) return null;
          const t = `rotate(${el.rotation} ${el.x} ${el.y})`;
          const stroke = "strokeWidth" in el && el.type !== "draw" && el.strokeWidth > 0 ? { stroke: el.stroke, strokeWidth: el.strokeWidth } : {};
          switch (el.type) {
            case "rect":
              return <rect key={el.id} x={el.x} y={el.y} width={el.width} height={el.height} rx={el.cornerRadius} fill={el.fill} opacity={el.opacity} transform={t} {...stroke} />;
            case "ellipse":
              return <ellipse key={el.id} cx={el.x + el.width / 2} cy={el.y + el.height / 2} rx={el.width / 2} ry={el.height / 2} fill={el.fill} opacity={el.opacity} transform={t} {...stroke} />;
            case "triangle":
              return (
                <polygon
                  key={el.id}
                  points={`${el.x + el.width / 2},${el.y} ${el.x + el.width},${el.y + el.height} ${el.x},${el.y + el.height}`}
                  fill={el.fill}
                  opacity={el.opacity}
                  transform={t}
                  {...stroke}
                />
              );
            case "star": {
              const pts = Array.from({ length: 10 }, (_, i) => {
                const r = i % 2 === 0 ? 1 : 0.45;
                const a = (Math.PI / 5) * i - Math.PI / 2;
                return `${el.x + el.width / 2 + Math.cos(a) * r * (el.width / 2)},${el.y + el.height / 2 + Math.sin(a) * r * (el.height / 2)}`;
              }).join(" ");
              return <polygon key={el.id} points={pts} fill={el.fill} opacity={el.opacity} transform={t} {...stroke} />;
            }
            case "text": {
              const anchor = el.align === "center" ? "middle" : el.align === "right" ? "end" : "start";
              const tx = el.align === "center" ? el.x + el.width / 2 : el.align === "right" ? el.x + el.width : el.x;
              return (
                <text
                  key={el.id}
                  x={tx}
                  y={el.y}
                  fill={el.fill}
                  opacity={el.opacity}
                  fontSize={el.fontSize}
                  fontFamily={el.fontFamily}
                  fontWeight={el.fontStyle.includes("bold") ? 700 : 400}
                  fontStyle={el.fontStyle.includes("italic") ? "italic" : "normal"}
                  textAnchor={anchor}
                  transform={t}
                >
                  {el.text.split("\n").map((line, i) => (
                    <tspan key={i} x={tx} dy={i === 0 ? el.fontSize * 0.92 : el.fontSize * 1.15}>
                      {line}
                    </tspan>
                  ))}
                </text>
              );
            }
            case "image":
              return (
                <image
                  key={el.id}
                  href={el.src}
                  x={el.x}
                  y={el.y}
                  width={el.width}
                  height={el.height}
                  opacity={el.opacity}
                  transform={t}
                  preserveAspectRatio="none"
                />
              );
            case "draw":
              if (el.mode === "eraser") return null;
              return (
                <polyline
                  key={el.id}
                  points={el.points.map((p, i) => p + (i % 2 === 0 ? el.x : el.y)).join(" ")}
                  fill="none"
                  stroke={el.stroke}
                  strokeWidth={el.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={el.opacity}
                  transform={t}
                />
              );
          }
        })}
      </g>
    </svg>
  );
}
