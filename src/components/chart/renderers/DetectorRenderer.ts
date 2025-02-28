import { Detector, CONSTANTS } from "../../ray-burst/types";
import {
  calculateColorBands,
  drawDetectorControlPoint,
  getBinColor,
} from "../../ray-burst/utils/rendering";

export const renderDetectors = (
  ctx: CanvasRenderingContext2D,
  detectors: Detector[],
  chartOffset: { x: number; y: number },
  showDetectors: boolean,
  showCompositeDetectors: boolean,
  numSlices: number,
  maxDetectorHeight: number,
  amplification: number,
  maxBarWidth: number,
  binOpacity: number,
  colorBandRange: number,
  calculateCompositeBins: any,
) => {
  if (detectors.length === 0) return;

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
};
