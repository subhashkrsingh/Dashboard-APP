import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, TrendingDown, Home, Building2, DollarSign, Calendar } from "lucide-react";
import { useResidexContext } from "../components/residex/ResidexContext";
import { ResidexChart } from "../components/charts/ResidexChart";
import { ResidexComparisonChart } from "../components/charts/ResidexComparisonChart";
import { formatCurrency, formatPercentage } from "../lib/formatters";

export function ResidexCityPage() {
  const { city } = useParams<{ city: string }>();
  const navigate = useNavigate();
  const { residexData, currentPeriod } = useResidexContext();

  if (!city || !residexData) {
    return (
      <div className="px-4 py-6 md:px-6">
        <div className="glass-card rounded-3xl border border-[#E6EAF2] p-6">
          <p className="text-center text-gray-500">City not found</p>
        </div>
      </div>
    );
  }

  // Find city data
  const cityData = residexData.find(d => d.city.toLowerCase() === city.toLowerCase());
  if (!cityData) {
    return (
      <div className="px-4 py-6 md:px-6">
        <div className="glass-card rounded-3xl border border-[#E6EAF2] p-6">
          <p className="text-center text-gray-500">City "{city}" not found</p>
        </div>
      </div>
    );
  }

  // Get current period data
  const currentData = cityData.data[currentPeriod] || cityData.data[cityData.data.length - 1];
  const previousData = cityData.data[currentPeriod - 1] || cityData.data[0];

  // Calculate growth rates
  const affordableGrowth = ((currentData.affordable - previousData.affordable) / previousData.affordable) * 100;
  const premiumGrowth = ((currentData.premium - previousData.premium) / previousData.premium) * 100;
  const overallGrowth = ((currentData.overall - previousData.overall) / previousData.overall) * 100;

  // Calculate yearly growth (assuming quarterly data)
  const yearlyData = cityData.data.slice(-4); // Last 4 quarters
  const yearlyGrowth = yearlyData.length >= 2
    ? ((yearlyData[yearlyData.length - 1].overall - yearlyData[0].overall) / yearlyData[0].overall) * 100
    : 0;

  const stats = [
    {
      label: "Current Overall Index",
      value: formatCurrency(currentData.overall),
      icon: DollarSign,
      color: "text-blue-600"
    },
    {
      label: "Yearly Growth",
      value: formatPercentage(yearlyGrowth),
      icon: yearlyGrowth >= 0 ? TrendingUp : TrendingDown,
      color: yearlyGrowth >= 0 ? "text-green-600" : "text-red-600"
    },
    {
      label: "Affordable Segment",
      value: formatCurrency(currentData.affordable),
      icon: Home,
      color: "text-purple-600"
    },
    {
      label: "Premium Segment",
      value: formatCurrency(currentData.premium),
      icon: Building2,
      color: "text-indigo-600"
    }
  ];

  return (
    <div className="px-4 py-6 md:px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/residex")}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to RESIDEX
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{cityData.city}</h1>
            <p className="text-sm text-gray-600">RESIDEX Real Estate Index</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="glass-card rounded-xl border border-[#E6EAF2] p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Growth Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="glass-card rounded-3xl border border-[#E6EAF2] p-6"
        >
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Quarterly Growth Comparison</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="flex items-center gap-2">
                <Home className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Affordable</span>
              </div>
              <p className={`text-2xl font-bold ${affordableGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(affordableGrowth)}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" />
                <span className="text-sm font-medium text-gray-700">Premium</span>
              </div>
              <p className={`text-2xl font-bold ${premiumGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(premiumGrowth)}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Overall</span>
              </div>
              <p className={`text-2xl font-bold ${overallGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(overallGrowth)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Full Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="glass-card rounded-3xl border border-[#E6EAF2] p-6"
        >
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Price Trend Analysis</h2>
          <ResidexChart
            data={cityData.data}
            height={400}
            showAffordable={true}
            showPremium={true}
            showOverall={true}
          />
        </motion.div>

        {/* Affordable vs Premium Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="glass-card rounded-3xl border border-[#E6EAF2] p-6"
        >
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Affordable vs Premium Segments</h2>
          <ResidexComparisonChart
            cities={[cityData]}
            height={300}
            showAffordable={true}
            showPremium={true}
            showOverall={false}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}