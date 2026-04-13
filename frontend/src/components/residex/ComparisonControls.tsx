import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, X, Check } from "lucide-react";

import { useResidexContext } from "./ResidexContext";

interface ComparisonControlsProps {
  className?: string;
}

function ComparisonControlsComponent({ className = "" }: ComparisonControlsProps) {
  const { comparison, cities, setComparisonEnabled, setComparisonCities } = useResidexContext();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleToggleComparison = () => {
    setComparisonEnabled(!comparison.isEnabled);
    if (comparison.isEnabled) {
      // Clear selection when disabling
      setComparisonCities([]);
    }
  };

  const handleCityToggle = (city: string) => {
    const newSelection = comparison.selectedCities.includes(city)
      ? comparison.selectedCities.filter(c => c !== city)
      : [...comparison.selectedCities, city].slice(0, 3); // Max 3 cities

    setComparisonCities(newSelection);
  };

  const availableCities = cities.filter(city => city !== "All");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-4 ${className}`}
    >
      {/* Comparison Mode Toggle */}
      <motion.button
        onClick={handleToggleComparison}
        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
          comparison.isEnabled
            ? 'bg-blue-600 text-white shadow-lg'
            : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <BarChart3 className="h-4 w-4" />
        Compare Mode {comparison.isEnabled ? 'ON' : 'OFF'}
      </motion.button>

      {/* City Selection Dropdown */}
      <AnimatePresence>
        {comparison.isEnabled && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, width: 0 }}
            animate={{ opacity: 1, scale: 1, width: 'auto' }}
            exit={{ opacity: 0, scale: 0.9, width: 0 }}
            transition={{ duration: 0.2 }}
            className="relative"
          >
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 rounded-lg bg-slate-800 border border-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-700 transition-colors min-w-[200px]"
            >
              <span>
                {comparison.selectedCities.length === 0
                  ? 'Select cities...'
                  : `${comparison.selectedCities.length} selected`
                }
              </span>
              <motion.div
                animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                ▼
              </motion.div>
            </button>

            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full mt-2 w-full min-w-[200px] rounded-lg border border-slate-700 bg-slate-900 shadow-xl z-50"
                >
                  <div className="p-2 max-h-60 overflow-y-auto">
                    {availableCities.map((city) => {
                      const isSelected = comparison.selectedCities.includes(city);
                      const isDisabled = !isSelected && comparison.selectedCities.length >= 3;

                      return (
                        <button
                          key={city}
                          onClick={() => !isDisabled && handleCityToggle(city)}
                          disabled={isDisabled}
                          className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : isDisabled
                              ? 'text-slate-500 cursor-not-allowed'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span>{city}</span>
                          {isSelected && <Check className="h-4 w-4" />}
                        </button>
                      );
                    })}
                  </div>

                  {comparison.selectedCities.length > 0 && (
                    <div className="border-t border-slate-700 p-2">
                      <button
                        onClick={() => setComparisonCities([])}
                        className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
                      >
                        <X className="h-3 w-3" />
                        Clear all
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection Summary */}
      <AnimatePresence>
        {comparison.isEnabled && comparison.selectedCities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex items-center gap-2 text-sm text-slate-400"
          >
            <span>Comparing:</span>
            <div className="flex gap-1">
              {comparison.selectedCities.map((city, index) => (
                <span key={city} className="text-white">
                  {city}{index < comparison.selectedCities.length - 1 ? ',' : ''}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export const ComparisonControls = memo(ComparisonControlsComponent);