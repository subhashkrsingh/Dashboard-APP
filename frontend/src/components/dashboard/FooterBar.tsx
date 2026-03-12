interface FooterBarProps {
  productLabel?: string;
  dataSourceLabel?: string;
}

export function FooterBar({
  productLabel = "NSE Power Sector Dashboard",
  dataSourceLabel = "Data via backend proxy"
}: FooterBarProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="rounded-2xl border border-[#E6EAF2] bg-white px-4 py-4 text-center text-sm text-slate-700">
      <p>Copyright (c) {year} Subhash Kumar Singh. All rights reserved.</p>
      <p className="mt-1 text-xs text-slate-500">
        {productLabel} | {dataSourceLabel}
      </p>
    </footer>
  );
}
