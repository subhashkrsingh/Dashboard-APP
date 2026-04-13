import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Zap,
  Target,
  Award,
  AlertTriangle
} from "lucide-react";

import { formatResidexValue, useResidexContext } from "./ResidexContext";

interface AIInsightCard {
  id: string;
  title: string;
  description: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "positive" | "negative" | "neutral" | "warning";
}

function AIInsightsComponent() {
  const {
    currentPeriodRows,
    selectedPeriodLabel,
    filters,
    summaryCards,
    periods
  } = useResidexContext();

  const insights = useMemo((): AIInsightCard[] => {
    if (!currentPeriodRows.length || !selectedPeriodLabel) {
      return [];
    }

    // Find highest and lowest growth cities
    const cityGrowthRates = currentPeriodRows.map(row => {
      const citySeries = currentPeriodRows.filter(r => r.city === row.city);
      const currentIndex = citySeries.findIndex(r => r.quarter === selectedPeriodLabel);
      if (currentIndex <= 0) return { city: row.city, growth: 0 };

      const current = row.residex;
      const previous = citySeries[currentIndex - 1]?.residex || current;
      const growth = ((current - previous) / previous) * 100;

      return { city: row.city, growth: isFinite(growth) ? growth : 0 };
    });

    const highestGrowth = cityGrowthRates.reduce((max, city) =>
      city.growth > max.growth ? city : max, cityGrowthRates[0]
    );

    const lowestGrowth = cityGrowthRates.reduce((min, city) =>
      city.growth < min.growth ? city : min, cityGrowthRates[0]
    );

    // Affordable vs Premium comparison
    const affordableAvg = currentPeriodRows.reduce((sum, row) => sum + row.affordable, 0) / currentPeriodRows.length;
    const premiumAvg = currentPeriodRows.reduce((sum, row) => sum + row.premium, 0) / currentPeriodRows.length;
    const premiumGap = ((premiumAvg - affordableAvg) / affordableAvg) * 100;

    // National trend summary
    const recentPeriods = periods.slice(-4); // Last 4 quarters
    const nationalTrend = recentPeriods.length >= 2
      ? ((recentPeriods[recentPeriods.length - 1]?.label === selectedPeriodLabel ? 1 : 0) - 0) * 100
      : 0;

    // Get current national values
    const nationalCard = summaryCards.find(card => card.id === "national");
    const currentNationalValue = nationalCard?.value || 0;
    const nationalQoQ = nationalCard?.qoq || 0;

    return [
      {
        id: "highest-growth",
        title: "Highest Growth City",
        description: `${highestGrowth.city} leads with ${highestGrowth.growth.toFixed(1)}% QoQ growth`,
        value: highestGrowth.growth.toFixed(1) + "%",
        icon: TrendingUp,
        tone: "positive"
      },
      {
        id: "lowest-growth",
        title: "Lowest Growth City",
        description: `${lowestGrowth.city} shows ${lowestGrowth.growth.toFixed(1)}% QoQ growth`,
        value: lowestGrowth.growth.toFixed(1) + "%",
        icon: TrendingDown,
        tone: "negative"
      },
      {
        id: "affordable-premium",
        title: "Premium vs Affordable Gap",
        description: `Premium housing is ${premiumGap.toFixed(1)}% higher than affordable nationally`,
        value: premiumGap.toFixed(1) + "%",
        icon: BarChart3,
        tone: "neutral"
      },
      {
        id: "national-trend",
        title: "National Trend Summary",
        description: `RESIDEX at ${formatResidexValue(currentNationalValue)} with ${nationalQoQ.toFixed(1)}% QoQ change`,
        value: nationalQoQ.toFixed(1) + "%",
        icon: Activity,
        tone: nationalQoQ >= 0 ? "positive" : "negative"
      }
    ];
  }, [currentPeriodRows, selectedPeriodLabel, summaryCards, periods]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.section
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="glass-card rounded-2xl border border-slate-800 bg-slate-950/90 p-6"
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-white">
            AI Market Insights
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Real-time analysis of RESIDEX trends and patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-400" />
          <span className="text-xs font-medium text-blue-400">AI Powered</span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {insights.map((insight) => {
          const IconComponent = insight.icon;
          const toneColors = {
            positive: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
            negative: "text-red-400 bg-red-500/10 border-red-500/20",
            neutral: "text-slate-400 bg-slate-500/10 border-slate-500/20",
            warning: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
          };

          return (
            <motion.div
              key={insight.id}
              variants={cardVariants}
              whileHover={{ scale: 1.02 }}
              className={`rounded-xl border p-4 transition-colors ${toneColors[insight.tone]}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <IconComponent className="h-4 w-4" />
                    <h4 className="text-sm font-medium text-white">{insight.title}</h4>
                  </div>
                  <p className="text-xs text-slate-300 mb-2">{insight.description}</p>
                  <div className="text-lg font-bold text-white">{insight.value}</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

export const AIInsights = memo(AIInsightsComponent);