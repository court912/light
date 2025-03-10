import { Ray, RayBurst } from "../types";

/**
 * Calculates the length of a ray from its origin to the canvas boundary
 * @param x - X coordinate of ray origin
 * @param y - Y coordinate of ray origin
 * @param angle - Angle of the ray in radians
 * @param canvasWidth - Width of the canvas
 * @param canvasHeight - Height of the canvas
 * @returns The calculated ray length
 */
export const calculateRayLength = (
  x: number,
  y: number,
  angle: number,
  canvasWidth: number,
  canvasHeight: number,
): number => {
  // Return a very large number to make rays extend indefinitely
  // This will make rays appear to extend beyond the canvas boundaries
  return Number.MAX_SAFE_INTEGER;
};

/**
 * Checks if a point is inside a circle
 * @param px - X coordinate of the point
 * @param py - Y coordinate of the point
 * @param cx - X coordinate of the circle center
 * @param cy - Y coordinate of the circle center
 * @param radius - Radius of the circle
 * @returns True if the point is inside the circle
 */
export const isPointInCircle = (
  px: number,
  py: number,
  cx: number,
  cy: number,
  radius: number,
): boolean => {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= radius * radius;
};

/**
 * Calculates the intersection point of a ray with a vertical detector line
 * @param ray - The ray to check
 * @param burst - The ray burst containing the ray
 * @param detectorX - X coordinate of the detector line
 * @returns The Y coordinate of the intersection or null if no intersection
 */
export const calculateIntersection = (
  ray: Ray,
  burst: RayBurst,
  detectorX: number,
): number | null => {
  const dx = Math.cos(ray.angle);
  const dy = Math.sin(ray.angle);

  // Ray is vertical (or nearly vertical), no intersection with vertical detector
  if (Math.abs(dx) < 1e-10) return null;

  // Only consider rays pointing to the right (positive x direction)
  // This ensures that detectors only register rays coming from their left
  if (dx <= 0) return null;

  // Only consider detectors to the right of the burst
  if (detectorX <= burst.x) return null;

  // Calculate intersection parameter
  const t = (detectorX - burst.x) / dx;

  // Intersection is beyond ray length or behind ray origin
  if (t < 0 || t > ray.length) return null;

  // Calculate Y coordinate of intersection
  const y = burst.y + dy * t;
  return y;
};
