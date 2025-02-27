import React, { useEffect, useRef, useState } from "react";

interface Candle {
  time: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
}

interface CandlestickChartProps {
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
  xSkew?: number;
  ySkew?: number;
}

const CandlestickChart: React.FC<CandlestickChartProps> = ({
  width = 800,
  height = 400,
  upColor = "#26a69a",
  downColor = "#ef5350",
  backgroundColor = "#000000",
  axisColor = "#ffffff",
  candleWidth = 8,
  candleGap = 2,
  xAxisLabel = "Time",
  yAxisLabel = "Price",
  xSkew = 0,
  ySkew = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [startPanPoint, setStartPanPoint] = useState({ x: 0, y: 0 });
  const [chartOffset, setChartOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [candleData, setCandleData] = useState<Candle[]>([]);
  const [xRange, setXRange] = useState({ min: 0, max: 0 });
  const [yRange, setYRange] = useState({ min: 0, max: 0 });

  // Constants for chart layout
  const padding = 60;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const originX = padding;
  const originY = height - padding;

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

  // Draw the chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candleData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Save the context state for the chart area
    ctx.save();

    // Create clipping region for the chart area (excluding axes)
    ctx.beginPath();
    ctx.rect(originX, originY - chartHeight, chartWidth, chartHeight);
    ctx.clip();

    // Apply transformations for the chart content only
    ctx.translate(chartOffset.x, 0); // Only translate horizontally, not vertically
    ctx.scale(scale, scale);

    // Apply skew transformations
    ctx.transform(
      1,
      Math.tan((ySkew * Math.PI) / 180),
      Math.tan((xSkew * Math.PI) / 180),
      1,
      0,
      0,
    );

    // Calculate visible range based on offset and scale
    const visibleXRange = {
      min:
        xRange.min - chartOffset.x / (chartWidth / (xRange.max - xRange.min)),
      max:
        xRange.max - chartOffset.x / (chartWidth / (xRange.max - xRange.min)),
    };

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
    xSkew,
    ySkew,
    xRange,
    yRange,
    padding,
    chartWidth,
    chartHeight,
    originX,
    originY,
  ]);

  // Handle mouse wheel for zooming
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.01;
    setScale((prevScale) => Math.max(0.1, Math.min(5, prevScale + delta)));
  };

  // Handle mouse down for panning or axis navigation
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

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

    // Regular panning in chart area
    setIsPanning(true);
    setStartPanPoint({ x: e.clientX, y: e.clientY });
  };

  // Handle mouse move for panning
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPanning) return;

    const dx = e.clientX - startPanPoint.x;
    // We only pan horizontally, not vertically
    setChartOffset((prev) => ({ x: prev.x + dx, y: prev.y }));
    setStartPanPoint({ x: e.clientX, y: e.clientY });
  };

  // Handle mouse up to stop panning
  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Handle mouse leave to stop panning
  const handleMouseLeave = () => {
    setIsPanning(false);
  };

  // Reset view
  const resetView = () => {
    setChartOffset({ x: 0, y: 0 });
    setScale(1);
    setXSkew(0);
    setYSkew(0);

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

  // State for skew controls
  const [xSkewValue, setXSkew] = useState(xSkew);
  const [ySkewValue, setYSkew] = useState(ySkew);

  return (
    <div className="flex flex-col items-center bg-gray-900 p-4 rounded-lg">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className="border border-gray-700 rounded cursor-move"
        />
      </div>

      <div className="mt-4 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-white text-sm">X Skew: {xSkewValue}°</label>
          <input
            type="range"
            min="-45"
            max="45"
            value={xSkewValue}
            onChange={(e) => setXSkew(Number(e.target.value))}
            className="w-3/4 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="text-white text-sm">Y Skew: {ySkewValue}°</label>
          <input
            type="range"
            min="-45"
            max="45"
            value={ySkewValue}
            onChange={(e) => setYSkew(Number(e.target.value))}
            className="w-3/4 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="flex justify-center">
          <button
            onClick={resetView}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
          >
            Reset View
          </button>
        </div>
      </div>

      <div className="mt-4 text-gray-400 text-sm">
        <p>Mouse wheel to zoom, drag to pan chart area</p>
        <p>Click on time axis to navigate through time</p>
        <p>Click on price axis to navigate through price levels</p>
      </div>
    </div>
  );
};

export default CandlestickChart;
