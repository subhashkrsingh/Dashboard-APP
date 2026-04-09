interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <section className="glass-card rounded-2xl border border-[#E6EAF2] p-5 dark:border-slate-800 dark:bg-slate-950/80">
      <p className="text-xs uppercase tracking-[0.24em] text-blue-600">{eyebrow}</p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-slate-900">{title}</h1>
      <p className="subtle-text mt-2 max-w-3xl">{description}</p>
    </section>
  );
}
