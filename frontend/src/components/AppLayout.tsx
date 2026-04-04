import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Outlet, useLocation, useOutletContext } from "react-router-dom";

import { Sidebar } from "./layout/Sidebar";

interface AppLayoutContextValue {
  onOpenSidebar: () => void;
}

export function useAppLayoutContext() {
  return useOutletContext<AppLayoutContextValue>();
}

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const sidebarWidth = sidebarCollapsed ? "w-[96px]" : "w-[320px]";
  const contentOffset = sidebarCollapsed ? "xl:pl-[96px]" : "xl:pl-[320px]";

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  return (
    <main className="relative min-h-screen bg-[#F5F7FB] text-slate-800">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_8%_8%,rgba(37,99,235,0.08),transparent_35%),radial-gradient(circle_at_90%_10%,rgba(59,130,246,0.1),transparent_33%),radial-gradient(circle_at_50%_100%,rgba(22,163,74,0.06),transparent_38%),linear-gradient(180deg,#F8FAFF_0%,#F5F7FB_40%,#EEF3FB_100%)]" />

      <div className="relative z-10 min-h-screen">
        <div className={`hidden transition-[width] duration-300 xl:fixed xl:inset-y-0 xl:left-0 xl:block ${sidebarWidth}`}>
          <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(current => !current)} />
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
                className="fixed inset-y-0 left-0 z-40 w-[320px] xl:hidden"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.22 }}
              >
                <Sidebar onClose={() => setMobileSidebarOpen(false)} />
              </motion.div>
            </>
          ) : null}
        </AnimatePresence>

        <div className={`min-h-screen transition-[padding-left] duration-300 ${contentOffset}`}>
          <Outlet context={{ onOpenSidebar: () => setMobileSidebarOpen(true) }} />
        </div>
      </div>
    </main>
  );
}
