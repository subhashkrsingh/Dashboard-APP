import { memo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";

import { useResidexContext } from "./ResidexContext";

interface TickerItem {
  city: string;
  qoq: number;
  index: number;
}

function ResidexTickerComponent() {
  const { currentPeriodRows } = useResidexContext();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get ticker data
  const tickerData: TickerItem[] = currentPeriodRows.map((row, index) => ({
    city: row.city,
    qoq: row.qoq,
    index: row.residex
  }));

  // Duplicate data for infinite scroll effect
  const duplicatedData = [...tickerData, ...tickerData];

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    let animationId: number;

    const animate = () => {
      if (scrollElement.scrollLeft >= scrollElement.scrollWidth / 2) {
        scrollElement.scrollLeft = 0;
      } else {
        scrollElement.scrollLeft += 0.5; // Slow, smooth scroll
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  if (tickerData.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden bg-slate-950 border-b border-slate-800">
      <div
        ref={scrollRef}
        className="flex whitespace-nowrap py-2"
        style={{ width: '200%' }} // Double width for seamless loop
      >
        {duplicatedData.map((item, index) => {
          const isPositive = item.qoq >= 0;
          const TrendIcon = isPositive ? TrendingUp : TrendingDown;
          const colorClass = isPositive
            ? "text-green-400 bg-green-500/10 border-green-500/20"
            : "text-red-400 bg-red-500/10 border-red-500/20";

          return (
            <motion.div
              key={`${item.city}-${index}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`inline-flex items-center gap-2 mx-4 px-3 py-1 rounded-lg border ${colorClass} min-w-max`}
            >
              <span className="font-medium text-white text-sm">{item.city}</span>
              <div className="flex items-center gap-1">
                <TrendIcon className="h-3 w-3" />
                <span className="text-xs font-mono">
                  {isPositive ? '+' : ''}{item.qoq.toFixed(1)}%
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Gradient overlays for smooth edges */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-slate-950 to-transparent pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none" />
    </div>
  );
}

export const ResidexTicker = memo(ResidexTickerComponent);