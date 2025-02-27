import { useCallback } from "react";
import { Detector, RayBurst } from "../types";
import { calculateIntersection } from "../utils/calculation";

/**
 * Custom hook for managing detector bin calculations
 */
export const useDetectorBins = () => {
  /**
   * Updates the bins for all detectors based on ray intersections
   * @param detectors - Array of detectors to update
   * @param rays - Array of ray bursts to check for intersections
   * @param numSlices - Number of bins per detector
   * @param maxDetectorHeight - Total height of each detector
   * @returns Updated array of detectors with recalculated bins
   */
  const updateDetectorBins = useCallback(
    (
      detectors: Detector[],
      rays: RayBurst[],
      numSlices: number,
      maxDetectorHeight: number,
    ): Detector[] => {
      return detectors.map((detector) => {
        // Skip composite detectors as they don't have their own bins
        if (detector.isComposite) return detector;

        // Initialize bins array with zeros
        const bins = new Array(numSlices).fill(0);
        const detectorTop = detector.centerY - maxDetectorHeight / 2;

        // Process each ray burst
        rays.forEach((burst) => {
          burst.rays.forEach((ray) => {
            const intersectY = calculateIntersection(ray, burst, detector.x);
            if (intersectY === null) return;

            // Calculate which bin this intersection belongs to
            const relativeY = intersectY - detectorTop;
            const binIndex = Math.floor(
              (relativeY / maxDetectorHeight) * numSlices,
            );

            // Increment the bin count if it's within range
            if (binIndex >= 0 && binIndex < bins.length) {
              bins[binIndex]++;
            }
          });
        });

        // Return updated detector with new bin values
        return { ...detector, bins };
      });
    },
    [],
  );

  /**
   * Maps bins from source detectors to a composite detector
   * @param detector - The composite detector
   * @param sourceDetectors - Array of source detectors to the left of the composite
   * @param numSlices - Number of bins per detector
   * @param maxDetectorHeight - Total height of each detector
   * @returns Array of combined bin values for the composite detector
   */
  const calculateCompositeBins = useCallback(
    (
      detector: Detector,
      sourceDetectors: Detector[],
      numSlices: number,
      maxDetectorHeight: number,
    ): number[] => {
      // Initialize combined bins array with zeros
      const combinedBins = new Array(numSlices).fill(0);

      // Calculate the top position of the composite detector
      const compositeDetectorTop = detector.centerY - maxDetectorHeight / 2;

      // Process each source detector
      sourceDetectors.forEach((sourceDetector) => {
        // Calculate the top position of the source detector
        const sourceDetectorTop =
          sourceDetector.centerY - maxDetectorHeight / 2;

        // Map each bin from the source detector to the composite detector
        sourceDetector.bins.forEach((value, sourceIndex) => {
          if (value === 0) return; // Skip empty bins

          // Calculate the absolute Y position of this bin in the source detector
          const binSize = maxDetectorHeight / numSlices;
          const sourceY = sourceDetectorTop + (sourceIndex + 0.5) * binSize; // Center of the bin

          // Map this Y position to a bin in the composite detector
          const relativeY = sourceY - compositeDetectorTop;
          const targetIndex = Math.floor(
            (relativeY / maxDetectorHeight) * numSlices,
          );

          // Add the value to the target bin if it's within range
          if (targetIndex >= 0 && targetIndex < combinedBins.length) {
            combinedBins[targetIndex] += value;
          }
        });
      });

      return combinedBins;
    },
    [],
  );

  return {
    updateDetectorBins,
    calculateCompositeBins,
  };
};
