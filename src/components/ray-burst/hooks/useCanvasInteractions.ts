import { useCallback } from "react";
import { CONSTANTS, Detector, RayBurst, ReferenceLine } from "../types";
import { calculateRayLength, isPointInCircle } from "../utils/calculation";

/**
 * Custom hook for handling canvas interactions
 */
export const useCanvasInteractions = () => {
  /**
   * Checks if a point is near a detector's move handle
   * @param px - X coordinate of the point
   * @param py - Y coordinate of the point
   * @param detector - The detector to check against
   * @returns True if the point is near the detector's move handle
   */
  const isPointNearDetectorHandle = useCallback(
    (px: number, py: number, detector: Detector): boolean => {
      // Check if point is near the move handle (offset from center)
      const dx = px - (detector.x + CONSTANTS.MOVE_HANDLE_OFFSET);
      const dy = py - detector.centerY;
      return (
        dx * dx + dy * dy <=
        CONSTANTS.MOVE_HANDLE_RADIUS * CONSTANTS.MOVE_HANDLE_RADIUS
      );
    },
    [],
  );

  /**
   * Creates a new ray burst at the specified position
   * @param x - X coordinate for the new burst
   * @param y - Y coordinate for the new burst
   * @param numRays - Number of rays in the burst
   * @param canvasWidth - Width of the canvas
   * @param canvasHeight - Height of the canvas
   * @returns A new RayBurst object
   */
  const createRayBurst = useCallback(
    (
      x: number,
      y: number,
      numRays: number,
      canvasWidth: number,
      canvasHeight: number,
    ): RayBurst => {
      const rays = [];
      const angleStep = (Math.PI * 2) / numRays;

      for (let i = 0; i < numRays; i++) {
        const angle = angleStep * i;
        const length = calculateRayLength(
          x,
          y,
          angle,
          canvasWidth,
          canvasHeight,
        );
        rays.push({ angle, length });
      }

      return { x, y, rays };
    },
    [],
  );

  /**
   * Finds the index of a reference line that contains the given point
   * @param x - X coordinate of the point
   * @param y - Y coordinate of the point
   * @param referenceLines - Array of reference lines to check
   * @returns Index of the found reference line or -1 if none found
   */
  const findReferenceLineAtPoint = useCallback(
    (x: number, y: number, referenceLines: ReferenceLine[]): number => {
      return referenceLines.findIndex((line) => {
        const dx = x - line.x;
        const dy = y - line.y;
        return dx * dx + dy * dy <= CONSTANTS.HOVER_DETECTION_RADIUS_SQUARED;
      });
    },
    [],
  );

  /**
   * Finds the index of a detector that contains the given point
   * @param x - X coordinate of the point
   * @param y - Y coordinate of the point
   * @param detectors - Array of detectors to check
   * @returns Index of the found detector or -1 if none found
   */
  const findDetectorAtPoint = useCallback(
    (x: number, y: number, detectors: Detector[]): number => {
      return detectors.findIndex((detector) => {
        const dx = x - detector.x;
        const dy = y - detector.centerY;
        return dx * dx + dy * dy <= CONSTANTS.HOVER_DETECTION_RADIUS_SQUARED;
      });
    },
    [],
  );

  /**
   * Finds the index of a ray burst that contains the given point
   * @param x - X coordinate of the point
   * @param y - Y coordinate of the point
   * @param rays - Array of ray bursts to check
   * @returns Index of the found ray burst or -1 if none found
   */
  const findRayBurstAtPoint = useCallback(
    (x: number, y: number, rays: RayBurst[]): number => {
      return rays.findIndex((burst) =>
        isPointInCircle(x, y, burst.x, burst.y, CONSTANTS.CENTROID_RADIUS),
      );
    },
    [],
  );

  /**
   * Creates a new detector at the specified position
   * @param x - X coordinate for the new detector
   * @param y - Y coordinate for the new detector
   * @param numSlices - Number of bins for the detector
   * @param maxDetectorHeight - Height of the detector
   * @param isComposite - Whether this is a composite detector
   * @returns A new Detector object
   */
  const createDetector = useCallback(
    (
      x: number,
      y: number,
      numSlices: number,
      maxDetectorHeight: number,
      isComposite: boolean,
    ): Detector => {
      return {
        x,
        centerY: y,
        height: maxDetectorHeight,
        bins: new Array(numSlices).fill(0),
        isComposite,
      };
    },
    [],
  );

  return {
    isPointNearDetectorHandle,
    createRayBurst,
    findReferenceLineAtPoint,
    findDetectorAtPoint,
    findRayBurstAtPoint,
    createDetector,
  };
};
