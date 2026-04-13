import { memo, useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";

import { useResidexContext, type ResidexQuarterFilter } from "./ResidexContext";

interface ResidexTimeSliderProps {
  className?: string;
}

function ResidexTimeSliderComponent({ className = "" }: ResidexTimeSliderProps) {
  const { periods, filters, setQuarter } = useResidexContext();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<number | null>(null);

  // Get all available quarters in chronological order
  const availableQuarters = periods.map(period => period.label);

  // Find current quarter index
  const currentQuarterIndex = availableQuarters.findIndex(q => q === filters.quarter) !== -1
    ? availableQuarters.findIndex(q => q === filters.quarter)
    : availableQuarters.length - 1;

  // Update current index when filters change
  useEffect(() => {
    if (filters.quarter === "Latest") {
      setCurrentIndex(availableQuarters.length - 1);
    } else {
      const index = availableQuarters.findIndex(q => q === filters.quarter);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    }
  }, [filters.quarter, availableQuarters]);

  // Auto-play functionality
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prevIndex => {
          const nextIndex = (prevIndex + 1) % availableQuarters.length;
          const nextQuarter = availableQuarters[nextIndex];
          setQuarter(nextQuarter as ResidexQuarterFilter);
          return nextIndex;
        });
      }, 1000); // 1 second intervals
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, availableQuarters, setQuarter]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleSliderChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = parseInt(event.target.value, 10);
    setCurrentIndex(newIndex);
    const newQuarter = availableQuarters[newIndex];
    setQuarter(newQuarter as ResidexQuarterFilter);
  }, [availableQuarters, setQuarter]);

  const handlePrevious = useCallback(() => {
    const newIndex = Math.max(0, currentIndex - 1);
    setCurrentIndex(newIndex);
    const newQuarter = availableQuarters[newIndex];
    setQuarter(newQuarter as ResidexQuarterFilter);
  }, [currentIndex, availableQuarters, setQuarter]);

  const handleNext = useCallback(() => {
    const newIndex = Math.min(availableQuarters.length - 1, currentIndex + 1);
    setCurrentIndex(newIndex);
    const newQuarter = availableQuarters[newIndex];
    setQuarter(newQuarter as ResidexQuarterFilter);
  }, [currentIndex, availableQuarters, setQuarter]);

  const handleJumpToLatest = useCallback(() => {
    const latestIndex = availableQuarters.length - 1;
    setCurrentIndex(latestIndex);
    setQuarter("Latest");
  }, [availableQuarters, setQuarter]);

  if (availableQuarters.length === 0) {
    return null;
  }

  const progress = (currentIndex / (availableQuarters.length - 1)) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`glass-card rounded-2xl border border-slate-800 bg-slate-950/90 p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-lg font-semibold text-white">
            Quarter Playback
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Animate through RESIDEX quarters
          </p>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleJumpToLatest}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            Latest
          </motion.button>
        </div>
      </div>

      {/* Current Quarter Display */}
      <div className="mb-4 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={availableQuarters[currentIndex]}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="text-2xl font-bold text-white"
          >
            {availableQuarters[currentIndex]}
          </motion.div>
        </AnimatePresence>
        <div className="mt-1 text-sm text-slate-400">
          {currentIndex + 1} of {availableQuarters.length} quarters
        </div>
      </div>

      {/* Slider */}
      <div className="mb-6">
        <div className="relative">
          {/* Progress bar background */}
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>

          {/* Slider input */}
          <input
            type="range"
            min={0}
            max={availableQuarters.length - 1}
            value={currentIndex}
            onChange={handleSliderChange}
            className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer slider-thumb"
            style={{
              background: 'transparent',
              cursor: 'pointer'
            }}
          />

          {/* Custom thumb */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-blue-500"
            animate={{ left: `calc(${progress}% - 8px)` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <SkipBack className="w-4 h-4" />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handlePlayPause}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
        >
          <AnimatePresence mode="wait">
            {isPlaying ? (
              <motion.div
                key="pause"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Pause className="w-5 h-5" />
              </motion.div>
            ) : (
              <motion.div
                key="play"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Play className="w-5 h-5 ml-0.5" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleNext}
          disabled={currentIndex === availableQuarters.length - 1}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <SkipForward className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Quarter Labels */}
      <div className="mt-4 flex justify-between text-xs text-slate-500">
        <span>{availableQuarters[0]}</span>
        <span>{availableQuarters[Math.floor(availableQuarters.length / 2)]}</span>
        <span>{availableQuarters[availableQuarters.length - 1]}</span>
      </div>
    </motion.div>
  );
}

export const ResidexTimeSlider = memo(ResidexTimeSliderComponent);