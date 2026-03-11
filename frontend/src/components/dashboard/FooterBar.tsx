export function FooterBar() {
  const year = new Date().getFullYear();

  return (
    <footer className="rounded-2xl border border-[#E6EAF2] bg-white px-4 py-4 text-center text-sm text-slate-700">
      <p>Copyright (c) {year} Subhash Kumar Singh. All rights reserved.</p>
      <p className="mt-1 text-xs text-slate-500">NSE Power Sector Dashboard | Data via backend proxy</p>
    </footer>
  );
}
