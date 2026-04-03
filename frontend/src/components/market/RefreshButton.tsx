import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, RefreshCw } from "lucide-react";

type RefreshState = "idle" | "loading" | "success" | "error";

interface RefreshButtonProps {
  onRefresh: () => Promise<unknown>;
  disabled?: boolean;
}

export function RefreshButton({ onRefresh, disabled = false }: RefreshButtonProps) {
  const [refreshState, setRefreshState] = useState<RefreshState>("idle");
  const resetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        window.clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const handleRefresh = async () => {
    if (disabled || refreshState === "loading") {
      return;
    }

    if (resetTimeoutRef.current) {
      window.clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }

    setRefreshState("loading");

    try {
      await onRefresh();
      setRefreshState("success");
    } catch (error) {
      setRefreshState("error");
    } finally {
      resetTimeoutRef.current = window.setTimeout(() => {
        setRefreshState("idle");
        resetTimeoutRef.current = null;
      }, 600);
    }
  };

  const isLoading = refreshState === "loading";

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={disabled || isLoading}
      className={`refresh-btn ${isLoading ? "spinning" : ""}`}
      aria-label="Refresh market data"
      title="Refresh market data"
    >
      {refreshState === "success" ? (
        <Check className="h-4 w-4" />
      ) : refreshState === "error" ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
    </button>
  );
}
