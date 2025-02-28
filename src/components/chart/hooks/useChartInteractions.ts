import { useState, useCallback } from "react";
import { ChartOffset, ChartRange } from "../types";

export const useChartInteractions = (initialScale = 1) => {
  const [isPanning, setIsPanning] = useState(false);
  const [startPanPoint, setStartPanPoint] = useState({ x: 0, y: 0 });
  const [chartOffset, setChartOffset] = useState<ChartOffset>({ x: 0, y: 0 });
  const [scale, setScale] = useState(initialScale);
  const [wasDragging, setWasDragging] = useState(false);

  // Reset view function
  const resetView = useCallback(
    (
      candleData: any[],
      setXRange: (range: ChartRange) => void,
      setYRange: (range: ChartRange) => void,
    ) => {
      setChartOffset({ x: 0, y: 0 });
      setScale(1);

      // Reset to original data ranges
      if (candleData.length > 0) {
        const minX = Math.min(...candleData.map((d) => d.time));
        const maxX = Math.max(...candleData.map((d) => d.time));
        const minY = Math.min(...candleData.map((d) => d.low));
        const maxY = Math.max(...candleData.map((d) => d.high));

        // Add some padding to the y-range
        const yPadding = (maxY - minY) * 0.1;

        setXRange({ min: minX, max: maxX });
        setYRange({ min: minY - yPadding, max: maxY + yPadding });
      }
    },
    [],
  );

  return {
    isPanning,
    setIsPanning,
    startPanPoint,
    setStartPanPoint,
    chartOffset,
    setChartOffset,
    scale,
    setScale,
    wasDragging,
    setWasDragging,
    resetView,
  };
};
