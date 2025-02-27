import React, { useEffect, useRef, useState } from "react";
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

  // Candlestick chart state
  const [isPanning, setIsPanning] = useState(false);
  const [startPanPoint, setStartPanPoint] = useState({ x: 0, y: 0 });
  const [chartOffset, setChartOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [candleData, setCandleData] = useState<Candle[]>([]);
  const [xRange, setXRange] = useState({ min: 0, max: 0 });
  const [yRange, setYRange] = useState({ min: 0, max: 0 });

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

  // Load and parse CSV data
  useEffect(() => {
    const parseCSV = async () => {
      try {
        // Fetch the CSV file
        const response = await fetch("/src/CME_MINI_ES1.csv");
        const csvText = await response.text();

        // Parse the CSV data
        const lines = csvText.split("\n");
        const headers = lines[0].split(",");

        const parsedData: Candle[] = [];

        // Start from index 1 to skip the header row
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;

          const values = line.split(",");
          parsedData.push({
            time: parseInt(values[0]),
            open: parseFloat(values[1]),
            high: parseFloat(values[2]),
            low: parseFloat(values[3]),
            close: parseFloat(values[4]),
          });
        }

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
      } catch (error) {
        console.error("Error loading or parsing CSV data:", error);
      }
    };

    parseCSV();
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

  // Draw the chart
  useEffect(() => {
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
    <div className="fixed inset-0 flex bg-gray-900">
      <div className="relative flex-1">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onMouseMove={handleMouseMove}
          onWheel={handleWheel}
          className="absolute inset-0 w-full h-full bg-black"
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
