import { ReferenceLine } from "../../ray-burst/types";
import { ChartDimensions, ChartRange } from "../types";
import { renderReferenceLines } from "../../ray-burst/utils/rendering";
import { formatPrice } from "../utils/formatters";

export const renderReferenceLineOverlays = (
  ctx: CanvasRenderingContext2D,
  referenceLines: ReferenceLine[],
  dimensions: ChartDimensions,
  xRange: ChartRange,
  yRange: ChartRange,
  chartOffset: { x: number; y: number },
) => {
  const { originX, originY, chartWidth, chartHeight, width, height } =
    dimensions;

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
};
