import { useEffect } from "react";
import { ChartRange, ChartOffset } from "../types";

export const useEventListeners = (
  setShowTimeLines: (value: boolean) => void,
  setXRange: (range: ChartRange) => void,
  setYRange: (range: ChartRange) => void,
  setChartOffset: (offset: ChartOffset) => void,
  candleData: any[],
  xRange: ChartRange,
  yRange: ChartRange,
  showDebugInfo: () => void,
  setXSkew: (value: number) => void,
  setYSkew: (value: number) => void,
  setChartWidthPercent: (value: number) => void,
  setChartHeightPercent: (value: number) => void,
) => {
  useEffect(() => {
    // Handler for updating X scale
    const handleUpdateXScale = (event: CustomEvent) => {
      const newXScale = event.detail;
      console.log("Updating X scale to:", newXScale);

      if (newXScale <= 0) {
        console.warn("Invalid X scale value:", newXScale);
        return;
      }

      // Update the chart's X range based on the scale input
      // This changes what portion of the data is visible, not how it's rendered
      const newXRange = { ...xRange };
      const rangeWidth = newXRange.max - newXRange.min;
      const centerPoint = newXRange.min + rangeWidth / 2;

      // Calculate new min and max to zoom in/out while keeping the center point fixed
      // A larger scale value means we see less data (zoom in)
      // A smaller scale value means we see more data (zoom out)
      const newRangeWidth = rangeWidth / newXScale;
      newXRange.min = centerPoint - newRangeWidth / 2;
      newXRange.max = centerPoint + newRangeWidth / 2;

      console.log("New X range:", newXRange);
      setXRange(newXRange);
    };

    // Handler for updating Y scale
    const handleUpdateYScale = (event: CustomEvent) => {
      const newYScale = event.detail;
      console.log("Updating Y scale to:", newYScale);

      if (newYScale <= 0) {
        console.warn("Invalid Y scale value:", newYScale);
        return;
      }

      // Update the chart's Y range based on the scale input
      // This changes what portion of the data is visible, not how it's rendered
      const newYRange = { ...yRange };
      const rangeHeight = newYRange.max - newYRange.min;
      const centerPoint = newYRange.min + rangeHeight / 2;

      // Calculate new min and max to zoom in/out while keeping the center point fixed
      // A larger scale value means we see less data (zoom in)
      // A smaller scale value means we see more data (zoom out)
      const newRangeHeight = rangeHeight / newYScale;
      newYRange.min = centerPoint - newRangeHeight / 2;
      newYRange.max = centerPoint + newRangeHeight / 2;

      console.log("New Y range:", newYRange);
      setYRange(newYRange);
    };

    // Handler for updating X skew
    const handleUpdateXSkew = (event: CustomEvent) => {
      const newXSkew = event.detail;
      console.log("Updating X skew to:", newXSkew);
      setXSkew(newXSkew);
    };

    // Handler for updating Y skew
    const handleUpdateYSkew = (event: CustomEvent) => {
      const newYSkew = event.detail;
      console.log("Updating Y skew to:", newYSkew);
      setYSkew(newYSkew);
    };

    // Handler for updating chart width percentage
    const handleUpdateChartWidth = (event: CustomEvent) => {
      const newWidth = event.detail;
      console.log("Updating chart width to:", newWidth, "%");
      setChartWidthPercent(newWidth);
    };

    // Handler for updating chart height percentage
    const handleUpdateChartHeight = (event: CustomEvent) => {
      const newHeight = event.detail;
      console.log("Updating chart height to:", newHeight, "%");
      setChartHeightPercent(newHeight);
    };

    // Force chart reload handler
    const handleForceReload = () => {
      console.log(
        "Force chart reload triggered, candleData length:",
        candleData.length,
      );
      // Force a re-render by making a small change to state
      setChartOffset((prev) => ({ x: prev.x + 0.001, y: prev.y }));
      setTimeout(() => {
        setChartOffset((prev) => ({ x: prev.x - 0.001, y: prev.y }));
        console.log("Chart offset reset, should trigger redraw");
      }, 50);
    };

    // Debug info handler
    const handleShowDebugInfo = () => {
      console.log("Show debug info event received");
      showDebugInfo();
    };

    // Expose the toggle time lines function
    window.toggleTimeLines = () => {
      setShowTimeLines((prev) => !prev);
    };

    window.addEventListener("force-chart-reload", handleForceReload);
    window.addEventListener("show-debug-info", handleShowDebugInfo);
    window.addEventListener(
      "update-x-scale",
      handleUpdateXScale as EventListener,
    );
    window.addEventListener(
      "update-y-scale",
      handleUpdateYScale as EventListener,
    );
    window.addEventListener(
      "update-x-skew",
      handleUpdateXSkew as EventListener,
    );
    window.addEventListener(
      "update-y-skew",
      handleUpdateYSkew as EventListener,
    );
    window.addEventListener(
      "update-chart-width",
      handleUpdateChartWidth as EventListener,
    );
    window.addEventListener(
      "update-chart-height",
      handleUpdateChartHeight as EventListener,
    );

    return () => {
      delete window.toggleTimeLines;
      window.removeEventListener("force-chart-reload", handleForceReload);
      window.removeEventListener("show-debug-info", handleShowDebugInfo);
      window.removeEventListener(
        "update-x-scale",
        handleUpdateXScale as EventListener,
      );
      window.removeEventListener(
        "update-y-scale",
        handleUpdateYScale as EventListener,
      );
      window.removeEventListener(
        "update-x-skew",
        handleUpdateXSkew as EventListener,
      );
      window.removeEventListener(
        "update-y-skew",
        handleUpdateYSkew as EventListener,
      );
      window.removeEventListener(
        "update-chart-width",
        handleUpdateChartWidth as EventListener,
      );
      window.removeEventListener(
        "update-chart-height",
        handleUpdateChartHeight as EventListener,
      );
    };
  }, [
    candleData.length,
    xRange,
    yRange,
    setXRange,
    setYRange,
    setChartOffset,
    setShowTimeLines,
    showDebugInfo,
    setXSkew,
    setYSkew,
    setChartWidthPercent,
    setChartHeightPercent,
  ]);
};
