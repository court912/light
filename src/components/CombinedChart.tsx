import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  CONSTANTS,
  Detector,
  RayBurst as RayBurstType,
  ReferenceLine,
} from "./ray-burst/types";
import { useDetectorBins } from "./ray-burst/hooks/useDetectorBins";
import { useCanvasInteractions } from "./ray-burst/hooks/useCanvasInteractions";
import {
  renderRays,
  renderReferenceLines,
  calculateColorBands,
  drawDetectorControlPoint,
  getBinColor,
} from "./ray-burst/utils/rendering";
import { calculateRayLength } from "./ray-burst/utils/calculation";
import ControlPanel from "./ray-burst/components/ControlPanel";

interface Candle {
  time: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
}

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

  // State for chart layout
  const [isPanning, setIsPanning] = useState(false);
  const [startPanPoint, setStartPanPoint] = useState({ x: 0, y: 0 });
  const [chartOffset, setChartOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [candleData, setCandleData] = useState<Candle[]>([]);
  const [xRange, setXRange] = useState({ min: 0, max: 0 });
  const [yRange, setYRange] = useState({ min: 0, max: 0 });
  const [showTimeLines, setShowTimeLines] = useState(true);

  // Ray burst state
  const [rays, setRays] = useState<RayBurstType[]>([]);
  const [numRays, setNumRays] = useState(12);
  const [transparency, setTransparency] = useState(100);
  const [detectors, setDetectors] = useState<Detector[]>([]);
  const [binOpacity, setBinOpacity] = useState(50);
  const [numSlices, setNumSlices] = useState(100);
  const [maxDetectorHeight, setMaxDetectorHeight] = useState(144000);
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
  const [wasDragging, setWasDragging] = useState(false);

  // Constants for chart layout
  const controlPanelWidth = 264; // Width of the control panel
  const padding = 60;
  const chartWidth = width - padding * 2 - controlPanelWidth;
  const chartHeight = height - padding * 2;
  const originX = padding;
  const originY = height - padding;

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

  // Expose the setCandleData function globally for direct access
  useEffect(() => {
    window.setChartData = (data: Candle[]) => {
      console.log("Direct setCandleData called with", data.length, "candles");

      // Set the candle data
      setCandleData(data);

      // Calculate and set ranges
      if (data.length > 0) {
        const minX = Math.min(...data.map((d) => d.time));
        const maxX = Math.max(...data.map((d) => d.time));
        const minY = Math.min(...data.map((d) => d.low));
        const maxY = Math.max(...data.map((d) => d.high));

        // Add some padding to the y-range
        const yPadding = (maxY - minY) * 0.1;

        setXRange({ min: minX, max: maxX });
        setYRange({ min: minY - yPadding, max: maxY + yPadding });

        // Reset view
        setChartOffset({ x: 0, y: 0 });
        setScale(1);
      }
    };

    // Expose the toggle time lines function
    window.toggleTimeLines = () => {
      setShowTimeLines((prev) => !prev);
    };

    return () => {
      delete window.setChartData;
      delete window.toggleTimeLines;
    };
  }, []);

  // Parse CSV data function
  const parseCSVData = useCallback((csvText: string) => {
    console.log("Starting CSV parsing");
    try {
      // Parse the CSV data
      const lines = csvText.split("\n");

      // Check if we have any data
      if (lines.length < 2) {
        console.error("CSV file has insufficient data");
        alert(
          "The CSV file doesn't contain enough data. Please check the format.",
        );
        return;
      }

      // Try to determine if there's a header row
      const firstLine = lines[0].toLowerCase();
      const hasHeader =
        firstLine.includes("time") ||
        firstLine.includes("open") ||
        firstLine.includes("high") ||
        firstLine.includes("low") ||
        firstLine.includes("close") ||
        firstLine.includes("date") ||
        isNaN(parseFloat(firstLine.split(",")[0]));

      const startIndex = hasHeader ? 1 : 0;
      const parsedData: Candle[] = [];

      // Process each line
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const values = line.split(",");
        if (values.length < 5) {
          console.warn(`Line ${i} has insufficient values:`, line);
          continue; // Skip invalid lines
        }

        try {
          // Try to parse the timestamp - handle both unix timestamps and date strings
          let timestamp: number;
          if (isNaN(parseInt(values[0]))) {
            // Try to parse as date string
            const date = new Date(values[0]);
            if (isNaN(date.getTime())) {
              console.warn(`Invalid date format in line ${i}:`, values[0]);
              continue;
            }
            timestamp = Math.floor(date.getTime() / 1000);
          } else {
            timestamp = parseInt(values[0]);
            // If timestamp is too large (milliseconds instead of seconds), convert it
            if (timestamp > 10000000000) {
              // Timestamps after year 2286
              timestamp = Math.floor(timestamp / 1000);
            }
          }

          const candle = {
            time: timestamp,
            open: parseFloat(values[1]),
            high: parseFloat(values[2]),
            low: parseFloat(values[3]),
            close: parseFloat(values[4]),
          };

          // Validate the candle data
          if (
            isNaN(candle.open) ||
            isNaN(candle.high) ||
            isNaN(candle.low) ||
            isNaN(candle.close)
          ) {
            console.warn(`Invalid price values in line ${i}:`, values);
            continue;
          }

          parsedData.push(candle);
        } catch (e) {
          console.warn(`Error parsing line ${i}:`, line, e);
        }
      }

      if (parsedData.length === 0) {
        console.error("No valid data found in CSV");
        alert(
          "No valid data could be parsed from the CSV file. Please check the format.",
        );
        return;
      }

      console.log(`Imported ${parsedData.length} candles from CSV`);

      // Sort data by timestamp to ensure proper ordering
      parsedData.sort((a, b) => a.time - b.time);

      // Use a direct state update to ensure React processes it immediately
      setCandleData(parsedData);

      // Add a small delay and then force a redraw
      setTimeout(() => {
        console.log("Delayed force redraw after setting candleData");
        window.dispatchEvent(new Event("force-chart-reload"));
      }, 200);

      // Set initial ranges
      if (parsedData.length > 0) {
        const minX = Math.min(...parsedData.map((d) => d.time));
        const maxX = Math.max(...parsedData.map((d) => d.time));
        const minY = Math.min(...parsedData.map((d) => d.low));
        const maxY = Math.max(...parsedData.map((d) => d.high));

        // Add some padding to the y-range
        const yPadding = (maxY - minY) * 0.1;

        setXRange({ min: minX, max: maxX });
        setYRange({ min: minY - yPadding, max: maxY + yPadding });
      }
    } catch (error) {
      console.error("Error parsing CSV data:", error);
    }
  }, []);

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

  // Listen for CSV import and debug events
  useEffect(() => {
    const handleCSVImport = (event: CustomEvent) => {
      const csvText = event.detail;
      console.log("CSV import event received, data length:", csvText.length);
      console.log("First 100 chars of CSV:", csvText.substring(0, 100));

      try {
        // Parse the CSV data directly here instead of using the callback
        const lines = csvText.split("\n");

        // Check if we have any data
        if (lines.length < 2) {
          console.error("CSV file has insufficient data");
          alert(
            "The CSV file doesn't contain enough data. Please check the format.",
          );
          return;
        }

        // Try to determine if there's a header row
        const firstLine = lines[0].toLowerCase();
        const hasHeader =
          firstLine.includes("time") ||
          firstLine.includes("open") ||
          firstLine.includes("high") ||
          firstLine.includes("low") ||
          firstLine.includes("close") ||
          firstLine.includes("date") ||
          isNaN(parseFloat(firstLine.split(",")[0]));

        const startIndex = hasHeader ? 1 : 0;
        const parsedData: Candle[] = [];

        // Process each line
        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;

          const values = line.split(",");
          if (values.length < 5) {
            console.warn(`Line ${i} has insufficient values:`, line);
            continue; // Skip invalid lines
          }

          try {
            // Try to parse the timestamp - handle both unix timestamps and date strings
            let timestamp: number;
            if (isNaN(parseInt(values[0]))) {
              // Try to parse as date string
              const date = new Date(values[0]);
              if (isNaN(date.getTime())) {
                console.warn(`Invalid date format in line ${i}:`, values[0]);
                continue;
              }
              timestamp = Math.floor(date.getTime() / 1000);
            } else {
              timestamp = parseInt(values[0]);
              // If timestamp is too large (milliseconds instead of seconds), convert it
              if (timestamp > 10000000000) {
                // Timestamps after year 2286
                timestamp = Math.floor(timestamp / 1000);
              }
            }

            const candle = {
              time: timestamp,
              open: parseFloat(values[1]),
              high: parseFloat(values[2]),
              low: parseFloat(values[3]),
              close: parseFloat(values[4]),
            };

            // Validate the candle data
            if (
              isNaN(candle.open) ||
              isNaN(candle.high) ||
              isNaN(candle.low) ||
              isNaN(candle.close)
            ) {
              console.warn(`Invalid price values in line ${i}:`, values);
              continue;
            }

            parsedData.push(candle);
          } catch (e) {
            console.warn(`Error parsing line ${i}:`, line, e);
          }
        }

        if (parsedData.length === 0) {
          console.error("No valid data found in CSV");
          alert(
            "No valid data could be parsed from the CSV file. Please check the format.",
          );
          return;
        }

        console.log(`Imported ${parsedData.length} candles from CSV`);

        // Sort data by timestamp to ensure proper ordering
        parsedData.sort((a, b) => a.time - b.time);

        // Set the candle data state directly
        setCandleData(parsedData);

        // Set initial ranges
        if (parsedData.length > 0) {
          const minX = Math.min(...parsedData.map((d) => d.time));
          const maxX = Math.max(...parsedData.map((d) => d.time));
          const minY = Math.min(...parsedData.map((d) => d.low));
          const maxY = Math.max(...parsedData.map((d) => d.high));

          // Add some padding to the y-range
          const yPadding = (maxY - minY) * 0.1;

          setXRange({ min: minX, max: maxX });
          setYRange({ min: minY - yPadding, max: maxY + yPadding });
        }

        // Reset chart view to show the newly imported data
        setChartOffset({ x: 0, y: 0 });
        setScale(1);

        // Add a small delay and then force a redraw
        setTimeout(() => {
          console.log("Delayed force redraw after setting candleData");
          window.dispatchEvent(new Event("force-chart-reload"));
        }, 200);
      } catch (error) {
        console.error("Error processing CSV data:", error);
        alert("Error processing CSV data. Check console for details.");
      }
    };

    // Force chart reload handler
    const handleForceReload = () => {
      console.log(
        "Force chart reload triggered, candleData length:",
        candleData.length,
      );
      // This will force the chart to re-render with current data
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Clear the canvas completely
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Force a re-render by making a small change to state
          setChartOffset((prev) => ({ x: prev.x + 0.001, y: prev.y }));
          setTimeout(() => {
            setChartOffset((prev) => ({ x: prev.x - 0.001, y: prev.y }));
            console.log("Chart offset reset, should trigger redraw");
          }, 50);
        }
      }
    };

    // Debug info handler
    const handleShowDebugInfo = () => {
      console.log("Show debug info event received");
      showDebugInfo();
    };

    window.addEventListener("csv-import", handleCSVImport as EventListener);
    window.addEventListener("force-chart-reload", handleForceReload);
    window.addEventListener("show-debug-info", handleShowDebugInfo);

    return () => {
      window.removeEventListener(
        "csv-import",
        handleCSVImport as EventListener,
      );
      window.removeEventListener("force-chart-reload", handleForceReload);
      window.removeEventListener("show-debug-info", handleShowDebugInfo);
    };
  }, []);

  // Format unix timestamp to readable date
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`;
  };

  // Format price with decimals
  const formatPrice = (price: number): string => {
    return price.toFixed(2);
  };

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
  const createRayBurstWithCurrentSettings = (
    x: number,
    y: number,
    width: number,
    height: number,
  ) => {
    return {
      x,
      y,
      rays: Array.from({ length: numRays }, (_, i) => {
        const angle = (Math.PI * 2 * i) / numRays;
        const length = calculateRayLength(x, y, angle, width, height);
        return { angle, length };
      }),
    };
  };

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

  // Log when candleData changes
  useEffect(() => {
    console.log("Candle data updated, length:", candleData.length);

    // Update global debug variable
    window.chartData = candleData;

    if (candleData.length > 0) {
      console.log("First candle:", candleData[0]);
      console.log("Last candle:", candleData[candleData.length - 1]);
    }
  }, [candleData]);

  // Debug function to show current data state
  const showDebugInfo = () => {
    console.log("Current candleData:", candleData);
    console.log("X Range:", xRange);
    console.log("Y Range:", yRange);
    console.log("Chart Offset:", chartOffset);
    console.log("Scale:", scale);

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
  };

  // Draw the chart
  useEffect(() => {
    console.log(
      "Chart render effect running, candleData length:",
      candleData.length,
    );

    // Add a global variable to help with debugging
    window.chartData = candleData;

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

    // Draw candlestick chart if we have data
    if (candleData.length > 0) {
      console.log("Drawing candlesticks, count:", candleData.length);
      // Save the context state for the chart area
      ctx.save();

      // Create clipping region for the chart area (excluding axes)
      ctx.beginPath();
      ctx.rect(originX, originY - chartHeight, chartWidth, chartHeight);
      ctx.clip();

      // Apply transformations for the chart content only
      ctx.translate(chartOffset.x, 0); // Only translate horizontally, not vertically
      ctx.scale(scale, scale);

      // Draw candles
      const xScale = chartWidth / (xRange.max - xRange.min);
      const yScale = chartHeight / (yRange.max - yRange.min);

      console.log("X scale:", xScale, "Y scale:", yScale);

      candleData.forEach((candle) => {
        // Calculate x position based on timestamp
        const x = originX + (candle.time - xRange.min) * xScale;

        // Only draw if in visible range
        if (
          x >= originX - candleWidth &&
          x <= originX + chartWidth + candleWidth
        ) {
          // Calculate y positions for candle elements
          const openY = originY - (candle.open - yRange.min) * yScale;
          const closeY = originY - (candle.close - yRange.min) * yScale;
          const highY = originY - (candle.high - yRange.min) * yScale;
          const lowY = originY - (candle.low - yRange.min) * yScale;

          // Determine if candle is up or down
          const isUp = candle.close >= candle.open;
          ctx.fillStyle = isUp ? upColor : downColor;
          ctx.strokeStyle = isUp ? upColor : downColor;

          // Draw the candle body
          const candleHeight = Math.abs(closeY - openY);
          ctx.fillRect(
            x - candleWidth / 2,
            isUp ? closeY : openY,
            candleWidth,
            Math.max(1, candleHeight), // Ensure minimum height of 1px
          );

          // Draw the wick (high to low line)
          ctx.beginPath();
          ctx.moveTo(x, highY);
          ctx.lineTo(x, lowY);
          ctx.stroke();
        }
      });

      // Restore context to draw axes without transformations
      ctx.restore();

      // Draw X axis
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(originX + chartWidth, originY);
      ctx.strokeStyle = axisColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw Y axis
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(originX, originY - chartHeight);
      ctx.stroke();

      // Draw X axis label
      ctx.fillStyle = axisColor;
      ctx.font = "14px Arial";
      ctx.textAlign = "center";
      ctx.fillText(xAxisLabel, originX + chartWidth / 2, originY + 40);

      // Draw Y axis label
      ctx.save();
      ctx.translate(originX - 40, originY - chartHeight / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(yAxisLabel, 0, 0);
      ctx.restore();

      // Draw X axis ticks and labels
      const xTickCount = 5;
      const xTickStep = (xRange.max - xRange.min) / xTickCount;

      for (let i = 0; i <= xTickCount; i++) {
        const tickValue = xRange.min + i * xTickStep - chartOffset.x / xScale;
        const x = originX + i * (chartWidth / xTickCount);

        ctx.beginPath();
        ctx.moveTo(x, originY);
        ctx.lineTo(x, originY + 5);
        ctx.stroke();

        ctx.fillStyle = axisColor;
        ctx.textAlign = "center";
        ctx.fillText(formatTimestamp(tickValue), x, originY + 20);
      }

      // Draw time lines at 6AM, 8:30AM and 6PM
      if (candleData.length > 0 && showTimeLines) {
        // Detect candle spacing by looking at the first two candles
        let minutesPerCandle = 1; // Default to 1 minute
        if (candleData.length >= 2) {
          const timeDiffSeconds = candleData[1].time - candleData[0].time;
          minutesPerCandle = Math.round(timeDiffSeconds / 60);
          console.log(`Detected ${minutesPerCandle} minutes per candle`);

          // Make sure our time scale index and candle loaded is spaced 1:1 with time
          window.minutesPerCandle = minutesPerCandle;
        }

        // Get the start of the day (midnight) for the first candle
        const firstCandleDate = new Date(candleData[0].time * 1000);
        const startOfDay = new Date(firstCandleDate);
        startOfDay.setHours(0, 0, 0, 0);

        // Calculate the timestamp for each day in the range
        const startTimestamp = xRange.min;
        const endTimestamp = xRange.max;
        const dayInSeconds = 24 * 60 * 60;

        // Start from the first day in the range
        let currentDayStart = Math.floor(startOfDay.getTime() / 1000);

        while (currentDayStart <= endTimestamp) {
          // Calculate timestamps for 6AM, 8:30AM and 6PM
          const sixAMTimestamp = currentDayStart + 6 * 60 * 60;
          const eightThirtyAMTimestamp =
            currentDayStart + 8 * 60 * 60 + 30 * 60;
          const sixPMTimestamp = currentDayStart + 18 * 60 * 60;

          // Draw 6AM line (dotted)
          if (
            sixAMTimestamp >= startTimestamp &&
            sixAMTimestamp <= endTimestamp
          ) {
            // Calculate x position accounting for chart offset
            const x =
              originX + (sixAMTimestamp - xRange.min) * xScale + chartOffset.x;

            ctx.beginPath();
            ctx.moveTo(x, originY);
            ctx.lineTo(x, originY - chartHeight);
            ctx.strokeStyle = "rgba(150, 150, 150, 0.5)";
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]); // Set dotted line pattern
            ctx.stroke();
            ctx.setLineDash([]); // Reset to solid line

            // Draw label with background
            const timeLabel = "06:00";
            ctx.font = "bold 10px Arial";
            const textWidth = ctx.measureText(timeLabel).width;

            // Draw background rectangle
            ctx.fillStyle = "rgba(50, 50, 50, 0.7)";
            ctx.fillRect(
              x - textWidth / 2 - 3,
              originY - chartHeight,
              textWidth + 6,
              16,
            );

            // Draw text
            ctx.fillStyle = "#cccccc";
            ctx.textAlign = "center";
            ctx.fillText(timeLabel, x, originY - chartHeight + 12);

            // Highlight the time on the x-axis
            ctx.fillStyle = "rgba(150, 150, 150, 0.5)";
            ctx.fillRect(x - 15, originY, 30, 20);
            ctx.fillStyle = "#ffffff";
            ctx.fillText(timeLabel, x, originY + 14);
          }

          // Draw 8:30AM line (dotted)
          if (
            eightThirtyAMTimestamp >= startTimestamp &&
            eightThirtyAMTimestamp <= endTimestamp
          ) {
            // Calculate x position accounting for chart offset
            const x =
              originX +
              (eightThirtyAMTimestamp - xRange.min) * xScale +
              chartOffset.x;

            ctx.beginPath();
            ctx.moveTo(x, originY);
            ctx.lineTo(x, originY - chartHeight);
            ctx.strokeStyle = "rgba(150, 150, 150, 0.5)";
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]); // Set dotted line pattern
            ctx.stroke();
            ctx.setLineDash([]); // Reset to solid line

            // Draw label with background
            const timeLabel = "08:30";
            ctx.font = "bold 10px Arial";
            const textWidth = ctx.measureText(timeLabel).width;

            // Draw background rectangle
            ctx.fillStyle = "rgba(50, 50, 50, 0.7)";
            ctx.fillRect(
              x - textWidth / 2 - 3,
              originY - chartHeight,
              textWidth + 6,
              16,
            );

            // Draw text
            ctx.fillStyle = "#cccccc";
            ctx.textAlign = "center";
            ctx.fillText(timeLabel, x, originY - chartHeight + 12);

            // Highlight the time on the x-axis
            ctx.fillStyle = "rgba(150, 150, 150, 0.5)";
            ctx.fillRect(x - 15, originY, 30, 20);
            ctx.fillStyle = "#ffffff";
            ctx.fillText(timeLabel, x, originY + 14);
          }

          // Draw 6PM line (solid)
          if (
            sixPMTimestamp >= startTimestamp &&
            sixPMTimestamp <= endTimestamp
          ) {
            // Calculate x position accounting for chart offset
            const x =
              originX + (sixPMTimestamp - xRange.min) * xScale + chartOffset.x;

            ctx.beginPath();
            ctx.moveTo(x, originY);
            ctx.lineTo(x, originY - chartHeight);
            ctx.strokeStyle = "rgba(150, 150, 150, 0.5)";
            ctx.lineWidth = 1;
            ctx.stroke();

            // Draw label with background
            const timeLabel = "18:00";
            ctx.font = "bold 10px Arial";
            const textWidth = ctx.measureText(timeLabel).width;

            // Draw background rectangle
            ctx.fillStyle = "rgba(50, 50, 50, 0.7)";
            ctx.fillRect(
              x - textWidth / 2 - 3,
              originY - chartHeight,
              textWidth + 6,
              16,
            );

            // Draw text
            ctx.fillStyle = "#cccccc";
            ctx.textAlign = "center";
            ctx.fillText(timeLabel, x, originY - chartHeight + 12);

            // Highlight the time on the x-axis
            ctx.fillStyle = "rgba(150, 150, 150, 0.5)";
            ctx.fillRect(x - 15, originY, 30, 20);
            ctx.fillStyle = "#ffffff";
            ctx.fillText(timeLabel, x, originY + 14);
          }

          // Reset stroke style for other elements
          ctx.strokeStyle = axisColor;
          ctx.lineWidth = 2;

          // Move to the next day
          currentDayStart += dayInSeconds;
        }
      }

      // Draw Y axis ticks and labels
      const yTickCount = 5;
      const yTickStep = (yRange.max - yRange.min) / yTickCount;

      for (let i = 0; i <= yTickCount; i++) {
        const tickValue = yRange.min + i * yTickStep;
        const y = originY - i * (chartHeight / yTickCount);

        ctx.beginPath();
        ctx.moveTo(originX, y);
        ctx.lineTo(originX - 5, y);
        ctx.stroke();

        ctx.fillStyle = axisColor;
        ctx.textAlign = "right";
        ctx.fillText(formatPrice(tickValue), originX - 10, y + 5);
      }

      // Draw axis click areas with subtle highlight
      ctx.fillStyle = "rgba(100, 100, 100, 0.2)";
      // X-axis click area
      ctx.fillRect(originX, originY, chartWidth, padding);
      // Y-axis click area
      ctx.fillRect(0, originY - chartHeight, originX, chartHeight);
    }

    // Draw ray burst elements
    if (showRays) {
      // Save context to apply chart offset for rays
      ctx.save();
      ctx.translate(chartOffset.x, 0);
      renderRays(ctx, rays, transparency / 100);
      ctx.restore();
    }

    if (showReferenceLines) {
      // First, find horizontal reference lines and calculate their prices
      const horizontalLines = referenceLines
        .filter((line) => line.isHorizontal)
        .map((line) => {
          const yPosition = line.y;
          const price =
            yRange.max -
            ((yPosition - (originY - chartHeight)) / chartHeight) *
              (yRange.max - yRange.min);
          return { ...line, price };
        });

      // Store the horizontal lines with prices in a global variable for export
      window.horizontalReferenceLines = horizontalLines;

      // Sort horizontal lines by price
      horizontalLines.sort((a, b) => a.price - b.price);

      // Find pairs of lines that are within 10 points of each other
      for (let i = 0; i < horizontalLines.length - 1; i++) {
        const currentLine = horizontalLines[i];
        const nextLine = horizontalLines[i + 1];

        if (Math.abs(nextLine.price - currentLine.price) <= 10) {
          // Shade the area between these two lines
          const topY = Math.min(currentLine.y, nextLine.y);
          const bottomY = Math.max(currentLine.y, nextLine.y);

          // Draw a semi-transparent purple rectangle across the chart
          ctx.fillStyle = "rgba(128, 0, 128, 0.2)";
          ctx.fillRect(originX, topY, chartWidth, bottomY - topY);
        }
      }

      // Now render the reference lines on top of the shaded areas
      renderReferenceLines(ctx, referenceLines, width, height, chartOffset);

      // Draw price labels for horizontal reference lines on the Y axis
      horizontalLines.forEach((line) => {
        // Draw price label on Y axis with background
        const priceText = formatPrice(line.price);
        ctx.font = "bold 12px Arial";
        const textWidth = ctx.measureText(priceText).width;

        // Draw background rectangle
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(originX - textWidth - 15, line.y - 8, textWidth + 10, 16);

        // Draw text
        ctx.fillStyle = "yellow";
        ctx.textAlign = "right";
        ctx.fillText(priceText, originX - 10, line.y + 4);
      });
    }

    // Draw detectors
    if (detectors.length > 0) {
      // Save context to apply chart offset for detectors
      ctx.save();
      ctx.translate(chartOffset.x, 0);
      detectors.forEach((detector) => {
        // Skip regular detectors if they're hidden or composite detectors if those are hidden
        if (
          (detector.isComposite && !showCompositeDetectors) ||
          (!detector.isComposite && !showDetectors)
        ) {
          return;
        }

        // For composite detectors, calculate bins based on detectors to the left
        const bins = detector.isComposite
          ? calculateCompositeBins(
              detector,
              detectors.filter((d) => d.x < detector.x && !d.isComposite),
              numSlices,
              maxDetectorHeight,
            )
          : detector.bins;

        // Find the maximum intensity for scaling
        const maxIntensity = Math.max(...bins, 1);

        // Calculate the maximum bar width based on the highest intensity bin
        const globalMaxBarWidth = Math.min(
          maxBarWidth,
          maxIntensity * amplification,
        );

        // Find the Point of Control (PoC) - bin with the highest intensity
        const pocIndex = bins.indexOf(maxIntensity);
        const halfBins = numSlices / 2;

        // Calculate color bands based on distance from PoC
        const bands = calculateColorBands(colorBandRange);

        // Calculate bin size
        const binSize = maxDetectorHeight / numSlices;
        const detectorTop = detector.centerY - maxDetectorHeight / 2;

        // Draw each bin
        bins.forEach((intensity, i) => {
          // Calculate bar width based on intensity
          const barWidth =
            intensity > 0 ? (intensity / maxIntensity) * globalMaxBarWidth : 0;

          // Draw the vertical detector line
          ctx.fillStyle = detector.isComposite
            ? `rgba(255, 165, 0, ${binOpacity / 100})` // Orange for composite
            : `rgba(0, 255, 255, ${binOpacity / 100})`; // Cyan for regular

          ctx.fillRect(
            detector.x - CONSTANTS.DETECTOR_WIDTH / 2,
            detectorTop + i * binSize,
            CONSTANTS.DETECTOR_WIDTH,
            binSize,
          );

          // Only draw bars for bins with intensity
          if (intensity > 0) {
            // Calculate distance from PoC (normalized to 0-1)
            const binDistFrac =
              Math.abs(i - pocIndex) / (halfBins * colorBandRange);

            // Get color based on distance from PoC
            const color = getBinColor(binDistFrac, i === pocIndex, bands);

            // Draw the bar
            ctx.fillStyle = color;
            ctx.fillRect(
              detector.x + CONSTANTS.DETECTOR_WIDTH / 2,
              detectorTop + i * binSize,
              barWidth,
              binSize,
            );
          }
        });

        // Draw delete dot for detector
        drawDetectorControlPoint(
          ctx,
          detector.x,
          detector.centerY,
          CONSTANTS.DELETE_DOT_RADIUS,
          "yellow",
        );

        // Draw move handle offset from delete dot
        drawDetectorControlPoint(
          ctx,
          detector.x + CONSTANTS.MOVE_HANDLE_OFFSET,
          detector.centerY,
          CONSTANTS.MOVE_HANDLE_RADIUS,
          "white",
        );
      });
      ctx.restore();
    }
  }, [
    candleData,
    width,
    height,
    upColor,
    downColor,
    backgroundColor,
    axisColor,
    candleWidth,
    candleGap,
    chartOffset,
    scale,
    xAxisLabel,
    yAxisLabel,
    xRange,
    yRange,
    padding,
    chartWidth,
    chartHeight,
    originX,
    originY,
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
  ]);

  // Handle mouse wheel for zooming
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.01;
    setScale((prevScale) => Math.max(0.1, Math.min(5, prevScale + delta)));
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

    // Store the actual click position for ray burst creation
    const actualClickX = clickX;
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
    // Use the actual click position for visual placement
    const newBurst = createRayBurstWithCurrentSettings(
      adjustedClickX,
      clickY,
      width,
      height,
    );
    setRays((prev) => [...prev, newBurst]);
  };

  // Reset view
  const resetView = () => {
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
        backgroundImage={null}
        setBackgroundImage={() => {}}
        imageOpacity={100}
        setImageOpacity={() => {}}
        imageWidth={100}
        setImageWidth={() => {}}
        imageHeight={100}
        setImageHeight={() => {}}
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
        showBackgroundImage={false}
        setShowBackgroundImage={() => {}}
        // Clear functions
        clearReferenceLines={clearReferenceLines}
        clearDetectors={clearDetectors}
        clearRays={clearRays}
      />
    </div>
  );
};

export default CombinedChart;
