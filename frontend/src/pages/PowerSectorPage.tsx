import { PowerDashboard } from "../dashboards/PowerDashboard";

interface PowerSectorPageProps {
  onOpenSidebar: () => void;
}

export function PowerSectorPage({ onOpenSidebar }: PowerSectorPageProps) {
  return <PowerDashboard onOpenSidebar={onOpenSidebar} />;
}
