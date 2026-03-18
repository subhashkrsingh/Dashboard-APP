import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import "./index.css";
import { SectorDataProvider } from "./providers/SectorDataProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes - prevent infinite refetch
      cacheTime: 1000 * 60 * 10, // 10 minutes cache
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnMount: false, // prevent refetch on component mount
      refetchInterval: false // disable auto polling
    }
  }
});

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SectorDataProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <App />
        </BrowserRouter>
      </SectorDataProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
