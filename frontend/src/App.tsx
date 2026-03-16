import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "./components/AppLayout";
import { EnergySectorPage } from "./pages/EnergySectorPage";
import { RealEstatePage } from "./pages/RealEstatePage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/energy-sector" replace />} />

        <Route path="/energy-sector/*" element={<EnergySectorPage />} />

        <Route path="/real-estate/*" element={<RealEstatePage />} />

        <Route path="*" element={<Navigate to="/energy-sector" replace />} />
      </Route>
    </Routes>
  );
}
