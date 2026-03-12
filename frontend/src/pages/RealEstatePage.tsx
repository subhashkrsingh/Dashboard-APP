import { RealEstateDashboard } from "../dashboards/RealEstateDashboard";

interface RealEstatePageProps {
  onOpenSidebar: () => void;
}

export function RealEstatePage({ onOpenSidebar }: RealEstatePageProps) {
  return <RealEstateDashboard onOpenSidebar={onOpenSidebar} />;
}
