import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "./components/AppLayout";

const EnergySectorPage = lazy(() =>
  import("./pages/EnergySectorPage").then(module => ({ default: module.EnergySectorPage }))
);
const EnergyCompanyPage = lazy(() =>
  import("./pages/EnergyCompanyPage").then(module => ({ default: module.EnergyCompanyPage }))
);
const OilGasPage = lazy(() => import("./pages/OilGasPage").then(module => ({ default: module.OilGasPage })));
const OilGasCompanyPage = lazy(() =>
  import("./pages/OilGasCompanyPage").then(module => ({ default: module.OilGasCompanyPage }))
);
const RealEstatePage = lazy(() =>
  import("./pages/RealEstatePage").then(module => ({ default: module.RealEstatePage }))
);
const RealEstateCompanyPage = lazy(() =>
  import("./pages/RealEstateCompanyPage").then(module => ({ default: module.RealEstateCompanyPage }))
);
const ResidexPage = lazy(() => import("./pages/residex").then(module => ({ default: module.ResidexPage })));
const ResidexCityPage = lazy(() =>
  import("./pages/ResidexCityPage").then(module => ({ default: module.ResidexCityPage }))
);

function RouteLoader() {
  return (
    <div className="px-4 py-6 md:px-6">
      <section className="glass-card rounded-3xl border border-[#E6EAF2] p-6">
        <div className="animate-pulse">
          <div className="h-3 w-32 rounded bg-slate-200" />
          <div className="mt-4 h-8 w-64 rounded bg-slate-200" />
          <div className="mt-6 h-80 rounded-[24px] bg-slate-100" />
        </div>
      </section>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/energy-sector" replace />} />

          <Route path="/energy-sector/:symbol" element={<EnergyCompanyPage />} />
          <Route path="/energy-sector/*" element={<EnergySectorPage />} />
          <Route path="/oil-gas/:symbol" element={<OilGasCompanyPage />} />
          <Route path="/oil-gas/*" element={<OilGasPage />} />
          <Route path="/real-estate/:symbol" element={<RealEstateCompanyPage />} />
          <Route path="/real-estate/*" element={<RealEstatePage />} />
          <Route path="/residex" element={<ResidexPage />} />
          <Route path="/residex/overview" element={<ResidexPage />} />
          <Route path="/residex/cities" element={<ResidexPage />} />
          <Route path="/residex/national" element={<ResidexPage />} />
          <Route path="/residex/affordable" element={<ResidexPage />} />
          <Route path="/residex/premium" element={<ResidexPage />} />
          <Route path="/residex/map" element={<ResidexPage />} />
          <Route path="/residex/table" element={<ResidexPage />} />
          <Route path="/residex/:city" element={<ResidexCityPage />} />
          <Route path="/residex/*" element={<ResidexPage />} />

          <Route path="*" element={<Navigate to="/energy-sector" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
