export function Panel({ title, right, className = '', children }: {
  title: string;
  right?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`flex min-h-0 flex-col border-b border-slate-700 ${className}`}>
      <header className="flex items-center justify-between bg-slate-800 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-slate-400">
        <span>{title}</span>
        {right}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </section>
  );
}
