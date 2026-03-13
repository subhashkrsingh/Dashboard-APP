interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <section className="glass-card rounded-2xl border border-[#E6EAF2] p-5">
      <p className="text-xs uppercase tracking-[0.24em] text-blue-600">{eyebrow}</p>
      <h1 className="mt-3 font-display text-3xl font-semibold text-slate-900">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-600">{description}</p>
    </section>
  );
}
