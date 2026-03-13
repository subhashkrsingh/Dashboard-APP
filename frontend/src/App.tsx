import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "./components/AppLayout";
import { PowerSectorPage } from "./pages/PowerSectorPage";
import { RealEstatePage } from "./pages/RealEstatePage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/power-sector" replace />} />

        <Route path="/power-sector/*" element={<PowerSectorPage />} />

        <Route path="/real-estate/*" element={<RealEstatePage />} />

        <Route path="*" element={<Navigate to="/power-sector" replace />} />
      </Route>
    </Routes>
  );
}
