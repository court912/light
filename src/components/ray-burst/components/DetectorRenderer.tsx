import React, { useCallback, useEffect, useRef } from "react";
import { CONSTANTS, Detector } from "../types";
import {
  calculateColorBands,
  drawDetectorControlPoint,
  getBinColor,
} from "../utils/rendering";
import { useDetectorBins } from "../hooks/useDetectorBins";

interface DetectorRendererProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  detectors: Detector[];
  numSlices: number;
  maxDetectorHeight: number;
  amplification: number;
  maxBarWidth: number;
  binOpacity: number;
  colorBandRange: number;
  showDetectors: boolean;
  showCompositeDetectors: boolean;
}

/**
 * Component responsible for rendering detectors on the canvas
 */
const DetectorRenderer: React.FC<DetectorRendererProps> = ({
  canvasRef,
  detectors,
  numSlices,
  maxDetectorHeight,
  amplification,
  maxBarWidth,
  binOpacity,
  colorBandRange,
  showDetectors,
  showCompositeDetectors,
}) => {
  const { calculateCompositeBins } = useDetectorBins();

  // Use a ref to store the rendering context
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Get the rendering context when the canvas changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctxRef.current = ctx;
  }, [canvasRef]);

  /**
   * Renders a single detector on the canvas
   */
  const renderDetector = useCallback(
    (detector: Detector) => {
      const ctx = ctxRef.current;
      if (!ctx) return;

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
    },
    [
      detectors,
      numSlices,
      maxDetectorHeight,
      amplification,
      maxBarWidth,
      binOpacity,
      colorBandRange,
      showDetectors,
      showCompositeDetectors,
      calculateCompositeBins,
    ],
  );

  // Render all detectors when dependencies change
  useEffect(() => {
    if (detectors.length > 0) {
      detectors.forEach(renderDetector);
    }
  }, [
    detectors,
    renderDetector,
    numSlices,
    maxDetectorHeight,
    amplification,
    maxBarWidth,
    binOpacity,
    colorBandRange,
    showDetectors,
    showCompositeDetectors,
  ]);

  return null; // This is a rendering utility, not a visible component
};

export default DetectorRenderer;
