interface NewsItem {
  headline: string;
  source: string;
  time: string;
}

interface SectorNewsPanelProps {
  title: string;
  items: NewsItem[];
}

export function SectorNewsPanel({ title, items }: SectorNewsPanelProps) {
  return (
    <section className="glass-card rounded-2xl border border-[#E6EAF2] p-4">
      <div className="mb-3">
        <h3 className="font-display text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500">Curated market pulse updates</p>
      </div>
      <ul className="space-y-2">
        {items.map(item => (
          <li key={`${item.source}-${item.headline}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-sm font-medium text-slate-900">{item.headline}</p>
            <p className="mt-1 text-xs text-slate-500">
              {item.source} • {item.time}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
