/**
 * Core type definitions for the ray-tracing visualization system
 */

/**
 * Represents a single ray with an angle and length
 */
export interface Ray {
  angle: number;
  length: number;
}

/**
 * Represents a burst of rays emanating from a central point
 */
export interface RayBurst {
  x: number;
  y: number;
  rays: Ray[];
}

/**
 * Represents a reference line (horizontal or vertical)
 */
export interface ReferenceLine {
  x: number;
  y: number;
  isHorizontal: boolean;
}

/**
 * Represents a detector that records ray intersections
 */
export interface Detector {
  x: number;
  centerY: number;
  height: number;
  bins: number[];
  isComposite?: boolean;
}

/**
 * Constants used throughout the ray-tracing system
 */
export const CONSTANTS = {
  CENTROID_RADIUS: 5,
  DETECTOR_WIDTH: 4,
  DELETE_DOT_RADIUS: 6,
  MOVE_HANDLE_RADIUS: 5,
  MOVE_HANDLE_OFFSET: 15,
  HOVER_DETECTION_RADIUS_SQUARED: 36, // 6px radius squared
};
