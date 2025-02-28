import { Candle, ChartDimensions, ChartRange } from "../types";

export const renderTimeLines = (
  ctx: CanvasRenderingContext2D,
  candleData: Candle[],
  dimensions: ChartDimensions,
  xRange: ChartRange,
  yRange: ChartRange,
  chartOffset: { x: number; y: number },
) => {
  if (candleData.length === 0) return;

  const { originX, originY, chartWidth, chartHeight } = dimensions;

  // Calculate scales
  const xScale = chartWidth / (xRange.max - xRange.min);

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
    const eightThirtyAMTimestamp = currentDayStart + 8 * 60 * 60 + 30 * 60;
    const sixPMTimestamp = currentDayStart + 18 * 60 * 60;

    // Draw 6AM line (dotted)
    if (sixAMTimestamp >= startTimestamp && sixAMTimestamp <= endTimestamp) {
      renderTimeLine(
        ctx,
        sixAMTimestamp,
        "06:00",
        true,
        dimensions,
        xRange,
        chartOffset,
        xScale,
      );
    }

    // Draw 8:30AM line (dotted)
    if (
      eightThirtyAMTimestamp >= startTimestamp &&
      eightThirtyAMTimestamp <= endTimestamp
    ) {
      renderTimeLine(
        ctx,
        eightThirtyAMTimestamp,
        "08:30",
        true,
        dimensions,
        xRange,
        chartOffset,
        xScale,
      );
    }

    // Draw 6PM line (solid)
    if (sixPMTimestamp >= startTimestamp && sixPMTimestamp <= endTimestamp) {
      renderTimeLine(
        ctx,
        sixPMTimestamp,
        "18:00",
        false,
        dimensions,
        xRange,
        chartOffset,
        xScale,
      );
    }

    // Move to the next day
    currentDayStart += dayInSeconds;
  }
};

const renderTimeLine = (
  ctx: CanvasRenderingContext2D,
  timestamp: number,
  label: string,
  isDotted: boolean,
  dimensions: ChartDimensions,
  xRange: ChartRange,
  chartOffset: { x: number; y: number },
  xScale: number,
) => {
  const { originX, originY, chartHeight } = dimensions;

  // Calculate x position accounting for chart offset
  const x = originX + (timestamp - xRange.min) * xScale + chartOffset.x;

  ctx.beginPath();
  ctx.moveTo(x, originY);
  ctx.lineTo(x, originY - chartHeight);
  ctx.strokeStyle = "rgba(150, 150, 150, 0.5)";
  ctx.lineWidth = 1;

  if (isDotted) {
    ctx.setLineDash([5, 5]); // Set dotted line pattern
  }

  ctx.stroke();
  ctx.setLineDash([]); // Reset to solid line

  // Draw label with background
  ctx.font = "bold 10px Arial";
  const textWidth = ctx.measureText(label).width;

  // Draw background rectangle
  ctx.fillStyle = "rgba(50, 50, 50, 0.7)";
  ctx.fillRect(x - textWidth / 2 - 3, originY - chartHeight, textWidth + 6, 16);

  // Draw text
  ctx.fillStyle = "#cccccc";
  ctx.textAlign = "center";
  ctx.fillText(label, x, originY - chartHeight + 12);

  // Highlight the time on the x-axis
  ctx.fillStyle = "rgba(150, 150, 150, 0.5)";
  ctx.fillRect(x - 15, originY, 30, 20);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(label, x, originY + 14);
};
