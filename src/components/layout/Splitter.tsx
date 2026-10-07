import { useRef, type RefObject } from 'react';

const KEY_STEP_PX = 16;

/**
 * Poignée de redimensionnement : se glisse à la souris ou au doigt, se règle aux flèches.
 * `target` est l'élément redimensionné ; `reverse` quand il se trouve après la poignée (elle grandit en glissant vers le début).
 * `percent` : tailles, bornes et résultat en % de l'élément parent plutôt qu'en pixels.
 */
export function Splitter({ target, axis, reverse = false, percent = false, min, max, label, onChange }: {
  target: RefObject<HTMLElement | null>;
  axis: 'x' | 'y';
  reverse?: boolean;
  percent?: boolean;
  min: number;
  max: number;
  label: string;
  onChange: (size: number) => void;
}) {
  const drag = useRef<{ from: number; size: number } | null>(null);
  const dim = axis === 'x' ? 'width' : 'height';
  const pos = (e: { clientX: number; clientY: number }) => (axis === 'x' ? e.clientX : e.clientY);
  // Pixels → unité de travail (pixels ou %).
  const scale = () => (percent ? 100 / (target.current?.parentElement?.getBoundingClientRect()[dim] || 1) : 1);
  const size = () => (target.current?.getBoundingClientRect()[dim] ?? 0) * scale();
  const apply = (value: number) => onChange(Math.round(Math.min(max, Math.max(min, value))));
  const sign = reverse ? -1 : 1;

  return (
    <div
      role="separator"
      aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
      aria-label={label}
      tabIndex={0}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { from: pos(e), size: size() };
      }}
      onPointerMove={(e) => {
        if (drag.current) apply(drag.current.size + sign * (pos(e) - drag.current.from) * scale());
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onKeyDown={(e) => {
        const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        apply(size() + sign * dir * KEY_STEP_PX * scale());
      }}
      className={`shrink-0 touch-none select-none bg-slate-700 hover:bg-sky-600 focus-visible:bg-sky-500 focus-visible:outline-none ${axis === 'x' ? 'w-1.5 cursor-col-resize' : 'h-1.5 cursor-row-resize'}`}
    />
  );
}
