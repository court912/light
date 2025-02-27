import { CONSTANTS, Detector, Ray, RayBurst, ReferenceLine } from "../types";

/**
 * Renders rays and their centroids on the canvas
 * @param ctx - Canvas rendering context
 * @param rays - Array of ray bursts to render
 * @param alpha - Opacity of the rays (0-1)
 */
export const renderRays = (
  ctx: CanvasRenderingContext2D,
  rays: RayBurst[],
  alpha: number,
) => {
  rays.forEach((burst) => {
    // Draw each ray in the burst
    burst.rays.forEach((ray) => {
      ctx.beginPath();
      ctx.moveTo(burst.x, burst.y);
      ctx.lineTo(
        burst.x + Math.cos(ray.angle) * ray.length,
        burst.y + Math.sin(ray.angle) * ray.length,
      );
      ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw the centroid (origin point) of the burst
    ctx.beginPath();
    ctx.arc(burst.x, burst.y, CONSTANTS.CENTROID_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.stroke();
  });
};

/**
 * Renders reference lines on the canvas
 * @param ctx - Canvas rendering context
 * @param referenceLines - Array of reference lines to render
 * @param canvasWidth - Width of the canvas
 * @param canvasHeight - Height of the canvas
 * @param chartOffset - Current chart offset due to panning
 */
export const renderReferenceLines = (
  ctx: CanvasRenderingContext2D,
  referenceLines: ReferenceLine[],
  canvasWidth: number,
  canvasHeight: number,
  chartOffset = { x: 0, y: 0 },
) => {
  referenceLines.forEach((line) => {
    // Apply chart offset to reference line position for rendering
    const adjustedX = line.x + chartOffset.x;

    ctx.beginPath();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;

    if (line.isHorizontal) {
      // Draw horizontal reference line
      ctx.moveTo(0, line.y);
      ctx.lineTo(canvasWidth, line.y);
    } else {
      // Draw vertical reference line
      ctx.moveTo(adjustedX, 0);
      ctx.lineTo(adjustedX, canvasHeight);
    }

    ctx.stroke();

    // Draw a delete dot at the reference line's origin point
    ctx.beginPath();
    ctx.arc(adjustedX, line.y, CONSTANTS.DELETE_DOT_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = "yellow";
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.stroke();
  });
};

/**
 * Renders a background image on the canvas
 * @param ctx - Canvas rendering context
 * @param image - The image to render
 * @param canvasWidth - Width of the canvas
 * @param canvasHeight - Height of the canvas
 * @param opacity - Opacity of the image (0-100)
 * @param width - Width of the image as percentage of canvas width (0-200)
 * @param height - Height of the image as percentage of canvas height (0-200)
 */
export const renderBackgroundImage = (
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
  opacity: number,
  width: number,
  height: number,
) => {
  ctx.globalAlpha = opacity / 100;
  const imgWidth = (canvasWidth * width) / 100;
  const imgHeight = (canvasHeight * height) / 100;
  const x = (canvasWidth - imgWidth) / 2;
  const y = (canvasHeight - imgHeight) / 2;
  ctx.drawImage(image, x, y, imgWidth, imgHeight);
  ctx.globalAlpha = 1;
};

/**
 * Draws a detector control point (delete dot or move handle)
 * @param ctx - Canvas rendering context
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param radius - Radius of the control point
 * @param fillColor - Fill color of the control point
 */
export const drawDetectorControlPoint = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fillColor: string,
) => {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = fillColor === "white" ? "black" : "white";
  ctx.lineWidth = 1;
  ctx.stroke();
};

/**
 * Calculates color bands based on distance from Point of Control
 * @param colorBandRange - Range factor for color bands (0-1)
 * @returns Object containing band thresholds
 */
export const calculateColorBands = (colorBandRange: number) => {
  return {
    band1: 0.3413 * colorBandRange, // ~34% from center
    band2: 0.4772 * colorBandRange, // ~48% from center
    band3: 0.6131 * colorBandRange, // ~61% from center
    band4: 0.6345 * colorBandRange, // ~63% from center
  };
};

/**
 * Determines the color for a bin based on its distance from the Point of Control
 * @param binDistFrac - Normalized distance from PoC (0-1)
 * @param isPoc - Whether this bin is the Point of Control
 * @param bands - Color band thresholds
 * @returns RGBA color string
 */
export const getBinColor = (
  binDistFrac: number,
  isPoc: boolean,
  bands: { band1: number; band2: number; band3: number; band4: number },
): string => {
  if (isPoc) {
    return "rgba(255, 255, 0, 1)"; // Point of Control is yellow
  } else if (binDistFrac <= bands.band1) {
    return "rgba(0, 255, 0, 1)"; // Light green for bins close to PoC
  } else if (binDistFrac <= bands.band2) {
    return "rgba(0, 128, 0, 1)"; // Green for bins a bit further
  } else if (binDistFrac <= bands.band3) {
    return "rgba(255, 165, 0, 1)"; // Orange for bins even further
  } else if (binDistFrac <= bands.band4) {
    return "rgba(255, 0, 0, 1)"; // Red for bins at the edge of significance
  } else {
    return "rgba(0, 0, 255, 1)"; // Blue for bins far from PoC
  }
};
