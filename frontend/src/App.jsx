import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "./components/Layout.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Header from "./components/Header.jsx";
import AppFooter from "./components/AppFooter.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import CompanyDetails from "./pages/CompanyDetails.jsx";

const MAX_POINTS = 120;

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

function useQuoteStream() {
  const [seriesBySymbol, setSeriesBySymbol] = useState({});

  useEffect(() => {
    const wsProtocol = location.protocol === "https:" ? "wss" : "ws";
    const devHost = import.meta.env.VITE_API_HOST || "127.0.0.1:3000";
    const wsHost = import.meta.env.DEV ? devHost : location.host;
    const ws = new WebSocket(`${wsProtocol}://${wsHost}`);

    ws.addEventListener("message", evt => {
      const msg = JSON.parse(evt.data);
      if (msg.type !== "quotes") return;

      setSeriesBySymbol(prev => {
        const next = { ...prev };
        msg.data.forEach(q => {
          if (!Number.isFinite(q.price)) return;
          const list = next[q.symbol] ? [...next[q.symbol]] : [];
          const prevPrice = list[list.length - 1]?.price ?? q.price;
          const delta = Math.abs(q.price - prevPrice);
          const volume = Math.round(900 + delta * 5000 + (q.price % 1) * 1000);
          const isUp = q.price >= prevPrice;

          list.push({
            time: new Date(q.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit"
            }),
            price: q.price,
            volume,
            isUp
          });

          if (list.length > MAX_POINTS) list.shift();
          next[q.symbol] = list;
        });
        return next;
      });
    });

    return () => ws.close();
  }, []);

  return seriesBySymbol;
}

function useCompanies() {
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const loadCompanies = () => {
      fetch("/api/companies")
        .then(r => r.json())
        .then(data => {
          if (isMounted) setCompanies(data);
        })
        .catch(() => {
          if (isMounted) setCompanies([]);
        });
    };

    loadCompanies();
    const id = setInterval(loadCompanies, 20000);
    return () => {
      isMounted = false;
      clearInterval(id);
    };
  }, []);

  return companies;
}

export default function App() {
  const [route, setRoute] = useState(() => parseRoute(window.location.pathname));
  const [searchQuery, setSearchQuery] = useState("");
  const rawSeries = useQuoteStream();
  const companies = useCompanies();

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

  const sourceCompanies = useMemo(() => {
    if (companies.length > 0) return companies;
    return Object.keys(rawSeries).map(symbol => ({
      symbol,
      name: symbol,
      sector: "Power"
    }));
  }, [companies, rawSeries]);

  const tickerQuotes = useMemo(
    () =>
      sourceCompanies
        .map(company => {
          const series = rawSeries[company.symbol] || [];
          const last = series[series.length - 1];
          const prev = series[series.length - 2];
          const changePct =
            prev && last ? ((last.price - prev.price) / prev.price) * 100 : 0;

          return {
            symbol: company.symbol,
            price: last?.price ?? null,
            changePct
          };
        })
        .filter(item => Number.isFinite(item.price)),
    [sourceCompanies, rawSeries]
  );

  return (
    <Layout
      header={(
        <Header
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          tickerQuotes={tickerQuotes}
          searchDisabled={route.page !== "dashboard"}
        />
      )}
      sidebar={(
        <Sidebar
          activePage={route.page}
          companySymbol={route.symbol}
          onOpenDashboard={openDashboard}
        />
      )}
      footer={<AppFooter />}
    >
      {route.page === "company" ? (
        <CompanyDetails symbol={route.symbol} onBack={openDashboard} />
      ) : (
        <Dashboard
          searchQuery={searchQuery}
          onOpenCompany={openCompany}
          companies={sourceCompanies}
          rawSeries={rawSeries}
        />
      )}
    </Layout>
  );
}
