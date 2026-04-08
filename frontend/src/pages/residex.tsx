import { useAppLayoutContext } from "../components/AppLayout";
import { ResidexDashboard } from "../components/residex/ResidexDashboard";

export function ResidexPage() {
  const { onOpenSidebar } = useAppLayoutContext();

  return <ResidexDashboard onOpenSidebar={onOpenSidebar} />;
}
