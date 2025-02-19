import { useEffect, useRef, useState } from "react";

interface Ray {
  angle: number;
  length: number;
}

interface RayBurst {
  x: number;
  y: number;
  rays: Ray[];
}

interface Detector {
  x: number;
  height: number;
  bins: number[];
}

const CENTROID_RADIUS = 5;
const DETECTOR_WIDTH = 4;
const MAX_BAR_WIDTH = 100; // Maximum width for intensity bars

export default function RayBurst() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rays, setRays] = useState<RayBurst[]>([]);
  const [numRays, setNumRays] = useState(12);
  const [transparency, setTransparency] = useState(100);
  const [binSize, setBinSize] = useState(10);
  const [detector, setDetector] = useState<Detector | null>(null);
  const [isPlacingDetector, setIsPlacingDetector] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const calculateRayLength = (
    x: number,
    y: number,
    angle: number,
    canvasWidth: number,
    canvasHeight: number,
  ) => {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    let length = Math.max(canvasWidth, canvasHeight) * 2;

    if (cosA !== 0) {
      const rightDist = (canvasWidth - x) / cosA;
      const leftDist = (0 - x) / cosA;

      if (rightDist > 0 && rightDist < length) length = rightDist;
      if (leftDist > 0 && leftDist < length) length = leftDist;
    }

    if (sinA !== 0) {
      const bottomDist = (canvasHeight - y) / sinA;
      const topDist = (0 - y) / sinA;

      if (bottomDist > 0 && bottomDist < length) length = bottomDist;
      if (topDist > 0 && topDist < length) length = topDist;
    }

    return length;
  };

  const isPointInCircle = (px: number, py: number, cx: number, cy: number) => {
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= CENTROID_RADIUS * CENTROID_RADIUS;
  };

  const calculateIntersection = (
    ray: Ray,
    burst: RayBurst,
    detectorX: number,
  ) => {
    const dx = Math.cos(ray.angle);
    const dy = Math.sin(ray.angle);

    if (Math.abs(dx) < 1e-10) return null; // Ray is vertical

    const t = (detectorX - burst.x) / dx;
    if (t < 0 || t > ray.length) return null; // Intersection is beyond ray length

    const y = burst.y + dy * t;
    return y;
  };

  const updateDetectorBins = () => {
    if (!detector) return;

    const numBins = Math.ceil(detector.height / binSize);
    const bins = new Array(numBins).fill(0);

    rays.forEach((burst) => {
      burst.rays.forEach((ray) => {
        const intersectY = calculateIntersection(ray, burst, detector.x);
        if (intersectY === null) return;

        const binIndex = Math.floor(intersectY / binSize);
        if (binIndex >= 0 && binIndex < bins.length) {
          bins[binIndex]++;
        }
      });
    });

    setDetector((prev) => (prev ? { ...prev, bins } : null));
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const clickX = e.clientX;
    const clickY = e.clientY;

    if (isPlacingDetector) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      setDetector({
        x: clickX,
        height: canvas.height,
        bins: new Array(Math.ceil(canvas.height / binSize)).fill(0),
      });
      setIsPlacingDetector(false);
      return;
    }

    // Check if we clicked on any existing centroid
    const clickedBurstIndex = rays.findIndex((burst) =>
      isPointInCircle(clickX, clickY, burst.x, burst.y),
    );

    if (clickedBurstIndex !== -1) {
      setRays((prev) => prev.filter((_, index) => index !== clickedBurstIndex));
      return;
    }

    // Create new burst
    const canvas = canvasRef.current;
    if (!canvas) return;

    const newRays: Ray[] = [];
    const angleStep = (Math.PI * 2) / numRays;

    for (let i = 0; i < numRays; i++) {
      const angle = angleStep * i;
      const length = calculateRayLength(
        clickX,
        clickY,
        angle,
        canvas.width,
        canvas.height,
      );
      newRays.push({ angle, length });
    }

    setRays((prev) => [...prev, { x: clickX, y: clickY, rays: newRays }]);
  };

  useEffect(() => {
    updateDetectorBins();
  }, [rays, binSize, detector?.x]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const alpha = transparency / 100;

    // Draw rays and centroids
    rays.forEach((burst) => {
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

      ctx.beginPath();
      ctx.arc(burst.x, burst.y, CENTROID_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
      ctx.fill();
    });

    // Draw detector
    if (detector) {
      const maxIntensity = Math.max(...detector.bins, 1);

      detector.bins.forEach((intensity, i) => {
        const normalizedIntensity = intensity / maxIntensity;
        const barWidth = normalizedIntensity * MAX_BAR_WIDTH;

        // Draw the vertical detector line
        ctx.fillStyle = `rgba(0, 255, 255, 0.5)`;
        ctx.fillRect(
          detector.x - DETECTOR_WIDTH / 2,
          i * binSize,
          DETECTOR_WIDTH,
          binSize,
        );

        // Draw the intensity bar
        ctx.fillStyle = `rgba(0, 255, 255, ${normalizedIntensity})`;
        ctx.fillRect(
          detector.x + DETECTOR_WIDTH / 2,
          i * binSize,
          barWidth,
          binSize,
        );
      });
    }
  }, [rays, transparency, detector, binSize]);

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <input
          type="number"
          value={numRays}
          onChange={(e) =>
            setNumRays(Math.max(1, parseInt(e.target.value) || 1))
          }
          className="bg-white/10 text-white px-3 py-2 rounded w-24"
          min="1"
          placeholder="Rays"
        />
        <input
          type="number"
          value={transparency}
          onChange={(e) =>
            setTransparency(
              Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
            )
          }
          className="bg-white/10 text-white px-3 py-2 rounded w-24"
          min="0"
          max="100"
          placeholder="Opacity %"
        />
        <input
          type="number"
          value={binSize}
          onChange={(e) =>
            setBinSize(Math.max(1, parseInt(e.target.value) || 1))
          }
          className="bg-white/10 text-white px-3 py-2 rounded w-24"
          min="1"
          placeholder="Bin Size"
        />
        <button
          onClick={() => setIsPlacingDetector(true)}
          className="bg-white/10 text-white px-3 py-2 rounded hover:bg-white/20"
        >
          Place Detector
        </button>
      </div>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-full bg-black cursor-crosshair"
      />
    </div>
  );
}
