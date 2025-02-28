import { Candle, ChartDimensions, ChartRange, ChartColors } from "../types";
import { formatTimestamp, formatPrice } from "../utils/formatters";

export const renderCandlesticks = (
  ctx: CanvasRenderingContext2D,
  candleData: Candle[],
  dimensions: ChartDimensions,
  xRange: ChartRange,
  yRange: ChartRange,
  chartOffset: { x: number; y: number },
  scale: number,
  colors: ChartColors,
  candleWidth: number,
  xAxisLabel: string,
  yAxisLabel: string,
) => {
  const { originX, originY, chartWidth, chartHeight } = dimensions;
  const { upColor, downColor, axisColor } = colors;

  if (candleData.length === 0) return;

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

  // Apply skew transformations if provided
  if (colors.xSkew !== undefined || colors.ySkew !== undefined) {
    const xSkewRad = ((colors.xSkew || 0) * Math.PI) / 180;
    const ySkewRad = ((colors.ySkew || 0) * Math.PI) / 180;
    ctx.transform(1, Math.tan(ySkewRad), Math.tan(xSkewRad), 1, 0, 0);
  }

  // Calculate scales for drawing candles
  // These scales determine how the data maps to pixel coordinates
  // Apply width/height percentage adjustments if provided
  const effectiveChartWidth =
    chartWidth * ((colors.chartWidthPercent || 100) / 100);
  const effectiveChartHeight =
    chartHeight * ((colors.chartHeightPercent || 100) / 100);

  const xScale = effectiveChartWidth / (xRange.max - xRange.min);
  const yScale = effectiveChartHeight / (yRange.max - yRange.min);

  console.log("X scale:", xScale, "Y scale:", yScale);

  candleData.forEach((candle) => {
    // Calculate x position based on timestamp
    const x = originX + (candle.time - xRange.min) * xScale;

    // Only draw if in visible range
    if (x >= originX - candleWidth && x <= originX + chartWidth + candleWidth) {
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
  ctx.fillRect(originX, originY, chartWidth, dimensions.padding);
  // Y-axis click area
  ctx.fillRect(0, originY - chartHeight, originX, chartHeight);
};
