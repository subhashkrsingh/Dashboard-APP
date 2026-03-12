import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { Sidebar } from "./components/Sidebar";
import { PowerSectorPage } from "./pages/PowerSectorPage";
import { RealEstatePage } from "./pages/RealEstatePage";

function AppRoutes({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.22 }}
        className="flex min-w-0 flex-1"
      >
        <Routes location={location}>
          <Route path="/" element={<Navigate to="/power-sector" replace />} />
          <Route path="/power-sector" element={<PowerSectorPage onOpenSidebar={onOpenSidebar} />} />
          <Route path="/real-estate" element={<RealEstatePage onOpenSidebar={onOpenSidebar} />} />
          <Route path="*" element={<Navigate to="/power-sector" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <main className="relative min-h-screen bg-[#F5F7FB] text-slate-800">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_8%_8%,rgba(37,99,235,0.08),transparent_35%),radial-gradient(circle_at_90%_10%,rgba(59,130,246,0.1),transparent_33%),radial-gradient(circle_at_50%_100%,rgba(22,163,74,0.06),transparent_38%),linear-gradient(180deg,#F8FAFF_0%,#F5F7FB_40%,#EEF3FB_100%)]" />

      <div className="relative z-10 flex min-h-screen">
        <div
          className={`hidden shrink-0 transition-[width] duration-300 xl:block ${
            sidebarCollapsed ? "w-[96px]" : "w-[280px]"
          }`}
        >
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(current => !current)}
          />
        </div>

        <AnimatePresence>
          {mobileSidebarOpen ? (
            <>
              <motion.div
                className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px] xl:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileSidebarOpen(false)}
              />
              <motion.div
                className="fixed inset-y-0 left-0 z-40 w-[280px] xl:hidden"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.2 }}
              >
                <Sidebar onClose={() => setMobileSidebarOpen(false)} />
              </motion.div>
            </>
          ) : null}
        </AnimatePresence>

        <AppRoutes onOpenSidebar={() => setMobileSidebarOpen(true)} />
      </div>
    </main>
  );
}
