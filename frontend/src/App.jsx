import React, { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import Header from "./components/Header.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import CompanyDetails from "./pages/CompanyDetails.jsx";

function parseRoute(pathname) {
  const path = String(pathname || "/");
  if (path === "/" || path === "/dashboard") {
    return { page: "dashboard", symbol: null };
  }

  if (path.startsWith("/company/")) {
    const encodedSymbol = path.slice("/company/".length);
    if (!encodedSymbol) return { page: "dashboard", symbol: null };
    try {
      return { page: "company", symbol: decodeURIComponent(encodedSymbol) };
    } catch {
      return { page: "company", symbol: encodedSymbol };
    }
  }

  return { page: "dashboard", symbol: null };
}

function toCompanyPath(symbol) {
  return `/company/${encodeURIComponent(symbol)}`;
}

export default function App() {
  const [route, setRoute] = useState(() => parseRoute(window.location.pathname));
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const onPopState = () => {
      setRoute(parseRoute(window.location.pathname));
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = useCallback(pathname => {
    const target = pathname || "/";
    if (target !== window.location.pathname) {
      window.history.pushState({}, "", target);
    }
    setRoute(parseRoute(target));
  }, []);

  const openDashboard = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const openCompany = useCallback(symbol => {
    if (!symbol) return;
    navigate(toCompanyPath(symbol));
  }, [navigate]);

  const headerConfig = useMemo(() => {
    if (route.page === "company") {
      return {
        eyebrow: "Power Sector Dashboard",
        title: route.symbol || "Company Details",
        subtitle: "Trade, quote, and historical view",
        showSearch: false,
        searchValue: "",
        onSearchChange: undefined,
        onBack: openDashboard
      };
    }

    return {
      eyebrow: "Power Sector Dashboard",
      title: "Market Overview",
      subtitle: "Real-time power sector dashboard",
      showSearch: true,
      searchValue: searchQuery,
      onSearchChange: setSearchQuery,
      onBack: null
    };
  }, [route, openDashboard, searchQuery]);

  return (
    <div className="app">
      <Sidebar
        activePage={route.page}
        companySymbol={route.symbol}
        onOpenDashboard={openDashboard}
      />
      <div className="main">
        <Header {...headerConfig} />
        {route.page === "company" ? (
          <CompanyDetails symbol={route.symbol} onBack={openDashboard} />
        ) : (
          <Dashboard searchQuery={searchQuery} onOpenCompany={openCompany} />
        )}
      </div>
    </div>
  );
}
