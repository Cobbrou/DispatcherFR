export function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase ${className}`}>
      {children}
    </span>
  );
}
