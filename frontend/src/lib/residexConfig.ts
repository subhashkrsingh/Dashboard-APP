import {
  BarChart3,
  Building2,
  Home,
  LayoutDashboard,
  Landmark,
  Map as MapIcon,
  Table2
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ResidexSectionId = "overview" | "cities" | "national" | "affordable" | "premium" | "map" | "table";

export interface ResidexNavItem {
  id: ResidexSectionId;
  label: string;
  path: string;
  sectionId: ResidexSectionId;
  icon: LucideIcon;
}

export const residexNavItems: ResidexNavItem[] = [
  {
    id: "overview",
    label: "Overview",
    path: "/residex",
    sectionId: "overview",
    icon: LayoutDashboard
  },
  {
    id: "cities",
    label: "City-wise RESIDEX",
    path: "/residex/cities",
    sectionId: "cities",
    icon: Building2
  },
  {
    id: "national",
    label: "National RESIDEX",
    path: "/residex/national",
    sectionId: "national",
    icon: BarChart3
  },
  {
    id: "affordable",
    label: "Affordable Housing Index",
    path: "/residex/affordable",
    sectionId: "affordable",
    icon: Home
  },
  {
    id: "premium",
    label: "Premium Housing Index",
    path: "/residex/premium",
    sectionId: "premium",
    icon: Landmark
  },
  {
    id: "map",
    label: "Coverage Map",
    path: "/residex/map",
    sectionId: "map",
    icon: MapIcon
  },
  {
    id: "table",
    label: "Data Table",
    path: "/residex/table",
    sectionId: "table",
    icon: Table2
  }
];

const residexPathToSection = new Map<string, ResidexSectionId>(
  [...residexNavItems.map(item => [item.path, item.sectionId]), ["/residex/overview", "overview"]]
);

const residexSectionToPath = new Map<ResidexSectionId, string>(
  residexNavItems.map(item => [item.sectionId, item.path])
);

export function getResidexSectionFromPath(pathname: string): ResidexSectionId | null {
  if (!pathname.startsWith("/residex")) {
    return null;
  }

  return residexPathToSection.get(pathname) ?? (pathname === "/residex" ? "overview" : null);
}

export function getResidexPathFromSection(sectionId: ResidexSectionId) {
  return residexSectionToPath.get(sectionId) ?? "/residex";
}
