import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Detector,
  RayBurst as RayBurstType,
  ReferenceLine,
} from "../ray-burst/types";
import { useDetectorBins } from "../ray-burst/hooks/useDetectorBins";
import { useCanvasInteractions } from "../ray-burst/hooks/useCanvasInteractions";
import { renderRays } from "../ray-burst/utils/rendering";
import { calculateRayLength } from "../ray-burst/utils/calculation";
import ControlPanel from "../ray-burst/components/ControlPanel";

// Import new modular components
import { ChartDimensions, ChartColors, ChartConfig } from "./types";
import { useChartData } from "./hooks/useChartData";
import { useChartInteractions } from "./hooks/useChartInteractions";
import { useEventListeners } from "./hooks/useEventListeners";
import { renderCandlesticks } from "./renderers/CandlestickRenderer";
import { renderTimeLines } from "./renderers/TimeLineRenderer";
import { renderReferenceLineOverlays } from "./renderers/ReferenceLineRenderer";
import { renderDetectors } from "./renderers/DetectorRenderer";

interface CombinedChartProps {
  width?: number;
  height?: number;
  upColor?: string;
  downColor?: string;
  backgroundColor?: string;
  axisColor?: string;
  candleWidth?: number;
  candleGap?: number;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

const CombinedChart: React.FC<CombinedChartProps> = ({
  width = window.innerWidth,
  height = window.innerHeight,
  upColor = "#26a69a",
  downColor = "#ef5350",
  backgroundColor = "#000000",
  axisColor = "#ffffff",
  candleWidth = 8,
  candleGap = 2,
  xAxisLabel = "Time",
  yAxisLabel = "Price",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Chart data state from custom hook
  const {
    candleData,
    setCandleData,
    xRange,
    setXRange,
    yRange,
    setYRange,
    parseCSVData,
  } = useChartData();

  // Chart interaction state from custom hook
  const {
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
  } = useChartInteractions();

  // Additional state
  const [showTimeLines, setShowTimeLines] = useState(true);
  const [chartWidthPercent, setChartWidthPercent] = useState(100);
  const [chartHeightPercent, setChartHeightPercent] = useState(100);
  const [xSkew, setXSkew] = useState(0);
  const [ySkew, setYSkew] = useState(0);

  // Ray burst state
  const [rays, setRays] = useState<RayBurstType[]>([]);
  const [numRays, setNumRays] = useState(36);
  const [transparency, setTransparency] = useState(100);
  const [detectors, setDetectors] = useState<Detector[]>([]);
  const [binOpacity, setBinOpacity] = useState(50);
  const [numSlices, setNumSlices] = useState(14000);
  const [maxDetectorHeight, setMaxDetectorHeight] = useState(288000);
  const [amplification, setAmplification] = useState(10);
  const [maxBarWidth, setMaxBarWidth] = useState(300);
  const [colorBandRange, setColorBandRange] = useState(0.09);
  const [referenceLines, setReferenceLines] = useState<ReferenceLine[]>([]);
  const [isHorizontalRefLine, setIsHorizontalRefLine] = useState(false);
  const [isVerticalRefLine, setIsVerticalRefLine] = useState(false);
  const [isDraggingDetector, setIsDraggingDetector] = useState(false);
  const [selectedDetectorIndex, setSelectedDetectorIndex] = useState<
    number | null
  >(null);
  const [isPlacingDetector, setIsPlacingDetector] = useState(false);
  const [isPlacingCompositeDetector, setIsPlacingCompositeDetector] =
    useState(false);
  const [showRays, setShowRays] = useState(true);
  const [showDetectors, setShowDetectors] = useState(true);
  const [showCompositeDetectors, setShowCompositeDetectors] = useState(true);
  const [showReferenceLines, setShowReferenceLines] = useState(true);

  // Background image state
  const [backgroundImage, setBackgroundImage] =
    useState<HTMLImageElement | null>(null);
  const [imageOpacity, setImageOpacity] = useState(100);
  const [imageWidth, setImageWidth] = useState(100);
  const [imageHeight, setImageHeight] = useState(100);
  const [showBackgroundImage, setShowBackgroundImage] = useState(true);

  // Constants for chart layout
  const controlPanelWidth = 264; // Width of the control panel
  const padding = 60;
  const chartWidth = width - padding * 2 - controlPanelWidth;
  const chartHeight = height - padding * 2;
  const originX = padding;
  const originY = height - padding;

  // Chart dimensions object for renderers
  const dimensions: ChartDimensions = {
    width,
    height,
    padding,
    chartWidth,
    chartHeight,
    originX,
    originY,
    controlPanelWidth,
  };

  // Chart colors object for renderers
  const colors: ChartColors = {
    upColor,
    downColor,
    backgroundColor,
    axisColor,
    xSkew,
    ySkew,
    chartWidthPercent,
    chartHeightPercent,
  };

  // Chart config object for renderers
  const config: ChartConfig = {
    candleWidth,
    candleGap,
    xAxisLabel,
    yAxisLabel,
    showTimeLines,
    chartWidthPercent,
    chartHeightPercent,
    xSkew,
    ySkew,
  };

  // Custom hooks
  const { updateDetectorBins, calculateCompositeBins } = useDetectorBins();
  const {
    isPointNearDetectorHandle,
    createRayBurst,
    findReferenceLineAtPoint,
    findDetectorAtPoint,
    findRayBurstAtPoint,
    createDetector,
  } = useCanvasInteractions();

  // Set up event listeners
  useEventListeners(
    setShowTimeLines,
    setXRange,
    setYRange,
    setChartOffset,
    candleData,
    xRange,
    yRange,
    showDebugInfo,
    setXSkew,
    setYSkew,
    setChartWidthPercent,
    setChartHeightPercent,
  );

  // We no longer load initial CSV data - wait for user to import
  useEffect(() => {
    // Initialize empty chart with axes
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = width - controlPanelWidth;
    canvas.height = height;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, height);

    // Draw empty chart with axes
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(originX + chartWidth, originY);
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(originX, originY - chartHeight);
    ctx.stroke();

    // Add message to prompt user to import data
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      "Please import CSV data using the panel on the right",
      originX + chartWidth / 2,
      originY - chartHeight / 2,
    );
  }, []);

  // Handler for plotting sunbursts at high points
  const handlePlotSunburstsAtHighs = useCallback(() => {
    if (candleData && candleData.length > 0) {
      const newRays = [];
      const canvas = canvasRef.current;
      if (!canvas) {
        alert("Canvas not available");
        return;
      }

      // Calculate scales for positioning
      const xScale = chartWidth / (xRange.max - xRange.min);
      const yScale = chartHeight / (yRange.max - yRange.min);

      console.log("Creating sunbursts with scales:", { xScale, yScale });
      console.log("Chart dimensions:", { chartWidth, chartHeight });
      console.log("Ranges:", { xRange, yRange });

      // For each candle, create a sunburst at the high point
      candleData.forEach((candle) => {
        // Calculate the x position based on time (adjusted for chart offset)
        const x = originX + (candle.time - xRange.min) * xScale;

        // Calculate the y position based on high price
        const y = originY - (candle.high - yRange.min) * yScale;

        console.log(
          `Candle at time ${candle.time}, high ${candle.high} -> position (${x}, ${y})`,
        );

        // Create a ray burst at this position
        newRays.push(
          createRayBurstWithCurrentSettings(
            x - chartOffset.x, // Adjust for chart offset
            y,
            canvas.width,
            canvas.height,
          ),
        );
      });

      // Add all the new rays to the state
      setRays((prev) => [...prev, ...newRays]);

      // Show a toast notification
      const toast = document.createElement("div");
      toast.className =
        "fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50";
      toast.textContent = `Created ${newRays.length} sunbursts at high points`;
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
    } else {
      alert("No chart data available. Please import data first.");
    }
  }, [
    candleData,
    chartWidth,
    chartHeight,
    xRange,
    yRange,
    chartOffset.x,
    originX,
    originY,
  ]);

  // Set up event listener for plotting sunbursts
  useEffect(() => {
    window.addEventListener(
      "plot-sunbursts-at-highs",
      handlePlotSunburstsAtHighs,
    );
    return () => {
      window.removeEventListener(
        "plot-sunbursts-at-highs",
        handlePlotSunburstsAtHighs,
      );
    };
  }, [handlePlotSunburstsAtHighs]);

  // Update ray bursts when numRays changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setRays((prev) =>
      prev.map((burst) => ({
        ...burst,
        rays: Array.from({ length: numRays }, (_, i) => {
          const angle = (Math.PI * 2 * i) / numRays;
          // Calculate ray length to ensure it reaches the canvas boundary
          const length = calculateRayLength(
            burst.x,
            burst.y,
            angle,
            canvas.width,
            canvas.height,
          );
          return { angle, length };
        }),
      })),
    );
  }, [numRays]);

  // Create a ray burst with current settings
  const createRayBurstWithCurrentSettings = useCallback(
    (x: number, y: number, width: number, height: number) => {
      return {
        x,
        y,
        rays: Array.from({ length: numRays }, (_, i) => {
          const angle = (Math.PI * 2 * i) / numRays;
          const length = calculateRayLength(x, y, angle, width, height);
          return { angle, length };
        }),
      };
    },
    [numRays],
  );

  // Update detector bins when rays or detectors change
  useEffect(() => {
    setDetectors((prev) =>
      updateDetectorBins(prev, rays, numSlices, maxDetectorHeight),
    );
  }, [
    rays,
    numSlices,
    detectors.length,
    updateDetectorBins,
    maxDetectorHeight,
  ]);

  // Update bins when dragging a detector
  useEffect(() => {
    if (isDraggingDetector && selectedDetectorIndex !== null) {
      // Force a full update of all detector bins when dragging
      setDetectors((prev) =>
        updateDetectorBins(prev, rays, numSlices, maxDetectorHeight),
      );
    }
  }, [
    isDraggingDetector,
    selectedDetectorIndex,
    detectors.map((d) => d.centerY).join(","),
    rays,
    numSlices,
    updateDetectorBins,
    maxDetectorHeight,
  ]);

  // Debug function to show current data state
  function showDebugInfo() {
    console.log("Current candleData:", candleData);
    console.log("X Range:", xRange);
    console.log("Y Range:", yRange);
    console.log("Chart Offset:", chartOffset);
    console.log("Scale:", scale);
    console.log("X Skew:", xSkew);
    console.log("Y Skew:", ySkew);
    console.log("Chart Width %:", chartWidthPercent);
    console.log("Chart Height %:", chartHeightPercent);

    // Show a visual debug overlay
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw debug info
    ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillRect(10, 10, 300, 150);
    ctx.fillStyle = "#ffffff";
    ctx.font = "12px monospace";
    ctx.fillText(`Candles: ${candleData.length}`, 20, 30);
    ctx.fillText(`X Range: ${xRange.min} - ${xRange.max}`, 20, 50);
    ctx.fillText(
      `Y Range: ${yRange.min.toFixed(2)} - ${yRange.max.toFixed(2)}`,
      20,
      70,
    );
    ctx.fillText(
      `Offset: ${chartOffset.x.toFixed(2)}, ${chartOffset.y.toFixed(2)}`,
      20,
      90,
    );
    ctx.fillText(`Scale: ${scale.toFixed(2)}`, 20, 110);
    ctx.fillText(`Canvas size: ${canvas.width} x ${canvas.height}`, 20, 130);
    ctx.fillText(`X Skew: ${xSkew}°, Y Skew: ${ySkew}°`, 20, 150);
    ctx.fillText(
      `Chart size: ${chartWidthPercent}% × ${chartHeightPercent}%`,
      20,
      170,
    );
  }

  // Draw the chart
  useEffect(() => {
    console.log(
      "Chart render effect running, candleData length:",
      candleData.length,
    );

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions - account for control panel width
    canvas.width = width - controlPanelWidth;
    canvas.height = height;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, height);

    // Draw background image if exists and visible
    if (backgroundImage && showBackgroundImage) {
      try {
        console.log(
          "Rendering background image",
          backgroundImage.width,
          backgroundImage.height,
        );
        ctx.save();
        ctx.globalAlpha = imageOpacity / 100;
        const imgWidth = (canvas.width * imageWidth) / 100;
        const imgHeight = (canvas.height * imageHeight) / 100;
        const x = (canvas.width - imgWidth) / 2;
        const y = (canvas.height - imgHeight) / 2;
        ctx.drawImage(backgroundImage, x, y, imgWidth, imgHeight);
        ctx.globalAlpha = 1;
        ctx.restore();
      } catch (error) {
        console.error("Error rendering background image:", error);
      }
    }

    // Draw candlestick chart if we have data
    if (candleData.length > 0) {
      renderCandlesticks(
        ctx,
        candleData,
        dimensions,
        xRange,
        yRange,
        chartOffset,
        scale,
        colors,
        candleWidth,
        xAxisLabel,
        yAxisLabel,
      );

      // Draw time lines if enabled
      if (showTimeLines) {
        renderTimeLines(
          ctx,
          candleData,
          dimensions,
          xRange,
          yRange,
          chartOffset,
        );
      }
    }

    // Draw ray burst elements
    if (showRays) {
      // Save context to apply chart offset for rays
      ctx.save();
      ctx.translate(chartOffset.x, 0);
      renderRays(ctx, rays, transparency / 100);
      ctx.restore();
    }

    // Draw reference lines
    if (showReferenceLines) {
      renderReferenceLineOverlays(
        ctx,
        referenceLines,
        dimensions,
        xRange,
        yRange,
        chartOffset,
      );
    }

    // Draw detectors
    if (detectors.length > 0) {
      renderDetectors(
        ctx,
        detectors,
        chartOffset,
        showDetectors,
        showCompositeDetectors,
        numSlices,
        maxDetectorHeight,
        amplification,
        maxBarWidth,
        binOpacity,
        colorBandRange,
        calculateCompositeBins,
      );
    }
  }, [
    candleData,
    width,
    height,
    chartOffset,
    scale,
    xRange,
    yRange,
    rays,
    transparency,
    detectors,
    numSlices,
    amplification,
    maxBarWidth,
    binOpacity,
    colorBandRange,
    showRays,
    showDetectors,
    showCompositeDetectors,
    showReferenceLines,
    maxDetectorHeight,
    calculateCompositeBins,
    referenceLines,
    controlPanelWidth,
    showTimeLines,
    dimensions,
    colors,
    config,
    backgroundImage,
    showBackgroundImage,
    imageOpacity,
    imageWidth,
    imageHeight,
  ]);

  // Handle mouse wheel - prevent default behavior but don't zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    // Removed zooming functionality as it should only be controlled via scale inputs
  };

  // Handle mouse down for panning, axis navigation, or detector dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check if mouse is within the chart area (not on axes)
    const isInChartArea =
      mouseX >= originX && mouseY <= originY && mouseX <= originX + chartWidth;

    // Adjust mouseX for chart offset to ensure accurate detector handle detection
    const adjustedMouseX = mouseX - chartOffset.x;

    // Check if we clicked on any detector handle
    const clickedDetectorIndex = detectors.findIndex((detector) =>
      isPointNearDetectorHandle(adjustedMouseX, mouseY, detector),
    );

    if (clickedDetectorIndex !== -1) {
      setIsDraggingDetector(true);
      setSelectedDetectorIndex(clickedDetectorIndex);
      return;
    }

    // Check if click is on X axis area
    if (mouseY >= originY && mouseY <= height) {
      // Handle X axis click (time navigation)
      if (mouseX < originX + chartWidth / 2) {
        // Scroll left (earlier in time)
        const timeShift = (xRange.max - xRange.min) * 0.1;
        setXRange((prev) => ({
          min: prev.min - timeShift,
          max: prev.max - timeShift,
        }));
      } else {
        // Scroll right (later in time)
        const timeShift = (xRange.max - xRange.min) * 0.1;
        setXRange((prev) => ({
          min: prev.min + timeShift,
          max: prev.max + timeShift,
        }));
      }
      return;
    }

    // Check if click is on Y axis area
    if (mouseX <= originX && mouseY >= originY - chartHeight) {
      // Handle Y axis click (price navigation)
      if (mouseY > originY - chartHeight / 2) {
        // Scroll down (lower prices)
        const priceShift = (yRange.max - yRange.min) * 0.1;
        setYRange((prev) => ({
          min: prev.min - priceShift,
          max: prev.max - priceShift,
        }));
      } else {
        // Scroll up (higher prices)
        const priceShift = (yRange.max - yRange.min) * 0.1;
        setYRange((prev) => ({
          min: prev.min + priceShift,
          max: prev.max + priceShift,
        }));
      }
      return;
    }

    // Regular panning in chart area (only if in chart area)
    if (isInChartArea) {
      setIsPanning(true);
      setStartPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  // Handle mouse move for panning or detector dragging
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check if mouse is within the chart area (not on axes)
    const isInChartArea =
      mouseX >= originX && mouseY <= originY && mouseX <= originX + chartWidth;

    // Adjust mouseX for chart offset to ensure accurate hover detection
    // This is the actual position in the data space, not the visual space
    const adjustedMouseX = mouseX - chartOffset.x;

    // Check if hovering over any reference line delete dot or ray centroid
    const isHoveringRefDot =
      findReferenceLineAtPoint(adjustedMouseX, mouseY, referenceLines) !== -1;
    const isHoveringDetectorDot =
      findDetectorAtPoint(adjustedMouseX, mouseY, detectors) !== -1;
    const isHoveringRayCentroid =
      findRayBurstAtPoint(adjustedMouseX, mouseY, rays) !== -1;

    // Change cursor style based on what we're hovering
    if (isHoveringRefDot || isHoveringRayCentroid || isHoveringDetectorDot) {
      e.currentTarget.style.cursor = "grab";
    } else if (isPanning) {
      e.currentTarget.style.cursor = "move";
    } else if (isDraggingDetector) {
      e.currentTarget.style.cursor = "ns-resize";
    } else if (isInChartArea) {
      e.currentTarget.style.cursor = "crosshair";
    } else {
      e.currentTarget.style.cursor = "default";
    }

    if (isPanning) {
      const dx = e.clientX - startPanPoint.x;
      // We only pan horizontally, not vertically
      setChartOffset((prev) => ({ x: prev.x + dx, y: prev.y }));
      setStartPanPoint({ x: e.clientX, y: e.clientY });
    } else if (isDraggingDetector && selectedDetectorIndex !== null) {
      // Update the detector position without clearing the canvas
      setDetectors((prev) => {
        const newDetectors = [...prev];
        newDetectors[selectedDetectorIndex] = {
          ...newDetectors[selectedDetectorIndex],
          centerY: mouseY,
        };
        return newDetectors;
      });
    }
  };

  // Handle mouse up to stop panning or detector dragging
  const handleMouseUp = () => {
    if (isDraggingDetector) {
      setWasDragging(true);
    }
    setIsDraggingDetector(false);
    setSelectedDetectorIndex(null);
    setIsPanning(false);
  };

  // Handle mouse leave to stop panning or detector dragging
  const handleMouseLeave = () => {
    setIsDraggingDetector(false);
    setSelectedDetectorIndex(null);
    setIsPanning(false);
  };

  // Handle click events for ray bursts, reference lines, and detectors
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning || wasDragging) {
      setWasDragging(false);
      return; // Prevent clicks while panning or after dragging
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if click is within the chart area (not on axes)
    if (clickX < originX || clickY > originY || clickX > originX + chartWidth) {
      return; // Ignore clicks outside the chart area
    }

    // Adjust clickX for chart offset to ensure accurate placement
    const adjustedClickX = clickX - chartOffset.x;

    // Debug info to help troubleshoot click issues
    console.log(
      `Click at X: ${clickX}, Adjusted X: ${adjustedClickX}, Offset: ${chartOffset.x}`,
    );

    // Check if we clicked on a reference line delete dot
    const clickedRefLineIndex = findReferenceLineAtPoint(
      adjustedClickX,
      clickY,
      referenceLines,
    );
    if (clickedRefLineIndex !== -1) {
      setReferenceLines((prev) =>
        prev.filter((_, index) => index !== clickedRefLineIndex),
      );
      return;
    }

    // Check if we clicked on a detector delete dot
    const clickedDetectorIndex = findDetectorAtPoint(
      adjustedClickX,
      clickY,
      detectors,
    );
    if (clickedDetectorIndex !== -1) {
      setDetectors((prev) =>
        prev.filter((_, index) => index !== clickedDetectorIndex),
      );
      return;
    }

    // Handle reference lines (H key for horizontal, V key for vertical)
    if (isHorizontalRefLine || isVerticalRefLine) {
      setReferenceLines((prev) => [
        ...prev,
        { x: adjustedClickX, y: clickY, isHorizontal: isHorizontalRefLine },
      ]);
      return;
    }

    // Handle detector placement
    if (isPlacingDetector || isPlacingCompositeDetector) {
      setDetectors((prev) => [
        ...prev,
        createDetector(
          adjustedClickX,
          clickY,
          numSlices,
          maxDetectorHeight,
          isPlacingCompositeDetector,
        ),
      ]);
      setIsPlacingDetector(false);
      setIsPlacingCompositeDetector(false);
      return;
    }

    // Check if we clicked on any existing ray burst
    const clickedBurstIndex = findRayBurstAtPoint(adjustedClickX, clickY, rays);
    if (clickedBurstIndex !== -1) {
      setRays((prev) => prev.filter((_, index) => index !== clickedBurstIndex));
      return;
    }

    // Create new ray burst using current settings
    const newBurst = createRayBurstWithCurrentSettings(
      adjustedClickX,
      clickY,
      width,
      height,
    );
    setRays((prev) => [...prev, newBurst]);
  };

  // Clear functions
  const clearReferenceLines = () => setReferenceLines([]);
  const clearDetectors = () => setDetectors([]);
  const clearRays = () => setRays([]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case "Space":
          e.preventDefault();
          setIsPanning(true);
          break;
        case "KeyH":
          e.preventDefault();
          setIsHorizontalRefLine(true);
          break;
        case "KeyV":
          e.preventDefault();
          setIsVerticalRefLine(true);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case "Space":
          setIsPanning(false);
          break;
        case "KeyH":
          setIsHorizontalRefLine(false);
          break;
        case "KeyV":
          setIsVerticalRefLine(false);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return (
    <div className="fixed inset-0 flex bg-gray-900 z-0">
      <div className="relative flex-1 z-10">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onMouseMove={handleMouseMove}
          onWheel={handleWheel}
          className="absolute inset-0 w-full h-full bg-black z-10"
        />
      </div>

      <ControlPanel
        // Ray controls
        numRays={numRays}
        setNumRays={setNumRays}
        transparency={transparency}
        setTransparency={setTransparency}
        // Detector controls
        binOpacity={binOpacity}
        setBinOpacity={setBinOpacity}
        maxDetectorHeight={maxDetectorHeight}
        setMaxDetectorHeight={setMaxDetectorHeight}
        numSlices={numSlices}
        setNumSlices={setNumSlices}
        amplification={amplification}
        setAmplification={setAmplification}
        maxBarWidth={maxBarWidth}
        setMaxBarWidth={setMaxBarWidth}
        colorBandRange={colorBandRange}
        setColorBandRange={setColorBandRange}
        // Background image controls
        backgroundImage={backgroundImage}
        setBackgroundImage={setBackgroundImage}
        imageOpacity={imageOpacity}
        setImageOpacity={setImageOpacity}
        imageWidth={imageWidth}
        setImageWidth={setImageWidth}
        imageHeight={imageHeight}
        setImageHeight={setImageHeight}
        // Element placement controls
        setIsPlacingDetector={setIsPlacingDetector}
        setIsPlacingCompositeDetector={setIsPlacingCompositeDetector}
        // Visibility toggles
        showRays={showRays}
        setShowRays={setShowRays}
        showDetectors={showDetectors}
        setShowDetectors={setShowDetectors}
        showCompositeDetectors={showCompositeDetectors}
        setShowCompositeDetectors={setShowCompositeDetectors}
        showReferenceLines={showReferenceLines}
        setShowReferenceLines={setShowReferenceLines}
        showBackgroundImage={showBackgroundImage}
        setShowBackgroundImage={setShowBackgroundImage}
        // Clear functions
        clearReferenceLines={clearReferenceLines}
        clearDetectors={clearDetectors}
        clearRays={clearRays}
      />
    </div>
  );
};

export default CombinedChart;
