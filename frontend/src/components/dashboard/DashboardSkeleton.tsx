export function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-28 rounded-2xl border border-slate-700/70 bg-slate-900/70" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="h-28 rounded-2xl border border-slate-700/70 bg-slate-900/70" />
        <div className="h-28 rounded-2xl border border-slate-700/70 bg-slate-900/70" />
        <div className="h-28 rounded-2xl border border-slate-700/70 bg-slate-900/70" />
        <div className="h-28 rounded-2xl border border-slate-700/70 bg-slate-900/70" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="h-80 rounded-2xl border border-slate-700/70 bg-slate-900/70" />
        <div className="h-80 rounded-2xl border border-slate-700/70 bg-slate-900/70" />
      </div>
      <div className="h-96 rounded-2xl border border-slate-700/70 bg-slate-900/70" />
    </div>
  );
}
