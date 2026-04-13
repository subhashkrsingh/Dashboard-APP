import type { ReactNode } from "react";

// Linear regression utility for RESIDEX predictions
export function linearRegression(data: number[]): { slope: number; intercept: number } {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0] || 0 };

  const xSum = data.reduce((sum, _, i) => sum + i, 0);
  const ySum = data.reduce((sum, val) => sum + val, 0);
  const xySum = data.reduce((sum, val, i) => sum + val * i, 0);
  const xSquaredSum = data.reduce((sum, _, i) => sum + i * i, 0);

  const slope = (n * xySum - xSum * ySum) / (n * xSquaredSum - xSum * xSum);
  const intercept = (ySum - slope * xSum) / n;

  return { slope, intercept };
}

export function predictNextQuarters(data: number[], quarters: number = 4): number[] {
  const { slope, intercept } = linearRegression(data);
  const predictions: number[] = [];

  for (let i = 0; i < quarters; i++) {
    const nextIndex = data.length + i;
    const prediction = slope * nextIndex + intercept;
    predictions.push(Math.max(0, prediction)); // Ensure non-negative values
  }

  return predictions;
}

export function highlightMatch(text: string, query: string): ReactNode {
  if (!query.trim()) return text;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 dark:bg-yellow-600 text-yellow-900 dark:text-yellow-100 px-0.5 rounded">
        {part}
      </mark>
    ) : part
  );
}