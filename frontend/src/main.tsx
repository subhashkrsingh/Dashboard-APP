import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter } from "react-router-dom";

import App from "./App";
import "./index.css";
import { SectorDataProvider } from "./providers/SectorDataProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false
    }
  }
});

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SectorDataProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </SectorDataProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
