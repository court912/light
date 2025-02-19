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

interface ReferenceLine {
  x: number;
  y: number;
  isHorizontal: boolean;
}

interface Detector {
  x: number;
  height: number;
  bins: number[];
  isComposite?: boolean;
}

const CENTROID_RADIUS = 5;
const DETECTOR_WIDTH = 4;

export default function RayBurst() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rays, setRays] = useState<RayBurst[]>([]);
  const [numRays, setNumRays] = useState(12);
  const [backgroundImage, setBackgroundImage] =
    useState<HTMLImageElement | null>(null);
  const [imageOpacity, setImageOpacity] = useState(100);
  // Store reference lines (CMD+click for horizontal, Shift+click for vertical)
  const [referenceLines, setReferenceLines] = useState<ReferenceLine[]>([]);

  // Update all ray bursts when numRays changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setRays((prev) =>
      prev.map((burst) => ({
        ...burst,
        rays: Array.from({ length: numRays }, (_, i) => {
          const angle = (Math.PI * 2 * i) / numRays;
          const length = calculateRayLength(
            burst.x,
            burst.y,
            angle,
            canvas.width,
            canvas.height,
          );
          return { angle, length };
        }),
      })),
    );
  }, [numRays]);
  const [transparency, setTransparency] = useState(100);
  const [binSize, setBinSize] = useState(10);
  const [amplification, setAmplification] = useState(1);
  const [maxBarWidth, setMaxBarWidth] = useState(100);
  const [detectors, setDetectors] = useState<Detector[]>([]);
  const [isPlacingDetector, setIsPlacingDetector] = useState(false);
  const [isPlacingCompositeDetector, setIsPlacingCompositeDetector] =
    useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
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
    setDetectors((prevDetectors) =>
      prevDetectors.map((detector) => {
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

        return { ...detector, bins };
      }),
    );
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Handle reference lines (CMD/Shift + click)
    if (e.metaKey || e.shiftKey) {
      setReferenceLines((prev) => [
        ...prev,
        { x: clickX, y: clickY, isHorizontal: e.metaKey },
      ]);
      return;
    }

    if (isPlacingDetector || isPlacingCompositeDetector) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      setDetectors((prev) => [
        ...prev,
        {
          x: clickX,
          height: canvas.height,
          bins: new Array(Math.ceil(canvas.height / binSize)).fill(0),
          isComposite: isPlacingCompositeDetector,
        },
      ]);
      setIsPlacingDetector(false);
      setIsPlacingCompositeDetector(false);
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
  }, [rays, binSize, detectors]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background image if exists
    if (backgroundImage) {
      ctx.globalAlpha = imageOpacity / 100;
      ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    }

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

    // Draw reference lines
    referenceLines.forEach((line) => {
      ctx.beginPath();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;

      if (line.isHorizontal) {
        // Draw horizontal reference line
        ctx.moveTo(0, line.y);
        ctx.lineTo(canvas.width, line.y);
      } else {
        // Draw vertical reference line
        ctx.moveTo(line.x, 0);
        ctx.lineTo(line.x, canvas.height);
      }

      ctx.stroke();
    });

    // Draw detectors
    detectors.forEach((detector) => {
      if (detector.isComposite) {
        // For composite detectors, combine all bins from detectors to the left
        const leftDetectors = detectors.filter(
          (d) => d.x < detector.x && !d.isComposite,
        );
        const combinedBins = new Array(
          Math.ceil(detector.height / binSize),
        ).fill(0);

        leftDetectors.forEach((leftDetector) => {
          leftDetector.bins.forEach((value, index) => {
            if (index < combinedBins.length) {
              combinedBins[index] += value;
            }
          });
        });

        const maxIntensity = Math.max(...combinedBins, 1);

        combinedBins.forEach((intensity, i) => {
          const normalizedIntensity = Math.min(
            1,
            (intensity / maxIntensity) * amplification,
          );
          const barWidth = normalizedIntensity * maxBarWidth;

          // Draw the vertical detector line in a different color for composite
          ctx.fillStyle = `rgba(255, 165, 0, 0.5)`; // Orange for composite
          ctx.fillRect(
            detector.x - DETECTOR_WIDTH / 2,
            i * binSize,
            DETECTOR_WIDTH,
            binSize,
          );

          // Draw the intensity bar
          ctx.fillStyle = `rgba(255, 165, 0, ${normalizedIntensity})`;
          ctx.fillRect(
            detector.x + DETECTOR_WIDTH / 2,
            i * binSize,
            barWidth,
            binSize,
          );
        });
      } else {
        const maxIntensity = Math.max(...detector.bins, 1);

        detector.bins.forEach((intensity, i) => {
          const normalizedIntensity = Math.min(
            1,
            (intensity / maxIntensity) * amplification,
          );
          const barWidth = normalizedIntensity * maxBarWidth;

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
    });
  }, [
    rays,
    transparency,
    detectors,
    binSize,
    amplification,
    maxBarWidth,
    backgroundImage,
    imageOpacity,
    referenceLines,
  ]);

  return (
    <div className="fixed inset-0 flex">
      <div className="relative flex-1">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="absolute inset-0 w-full h-full bg-black cursor-crosshair"
        />
      </div>
      <div className="w-64 bg-gray-900 p-4 flex flex-col gap-4 border-l border-gray-800 overflow-y-auto">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">
            Number of Rays
          </label>
          <input
            type="number"
            value={numRays}
            onChange={(e) =>
              setNumRays(Math.max(1, parseInt(e.target.value) || 1))
            }
            className="w-full bg-gray-800 text-white px-3 py-2 rounded"
            min="1"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">
            Opacity (%)
          </label>
          <input
            type="number"
            value={transparency}
            onChange={(e) =>
              setTransparency(
                Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
              )
            }
            className="w-full bg-gray-800 text-white px-3 py-2 rounded"
            min="0"
            max="100"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">
            Bin Size (px)
          </label>
          <input
            type="number"
            value={binSize}
            onChange={(e) =>
              setBinSize(Math.max(1, parseInt(e.target.value) || 1))
            }
            className="w-full bg-gray-800 text-white px-3 py-2 rounded"
            min="1"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">
            Amplification
          </label>
          <input
            type="number"
            value={amplification}
            onChange={(e) =>
              setAmplification(Math.max(0.1, parseFloat(e.target.value) || 1))
            }
            className="w-full bg-gray-800 text-white px-3 py-2 rounded"
            min="0.1"
            step="0.1"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">
            Max Bar Width (px)
          </label>
          <input
            type="number"
            value={maxBarWidth}
            onChange={(e) =>
              setMaxBarWidth(Math.max(1, parseInt(e.target.value) || 100))
            }
            className="w-full bg-gray-800 text-white px-3 py-2 rounded"
            min="1"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">
            Background Image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                  const img = new Image();
                  img.onload = () => setBackgroundImage(img);
                  img.src = e.target?.result as string;
                };
                reader.readAsDataURL(file);
              }
            }}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-700"
          />
        </div>

        {backgroundImage && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-200">
              Image Opacity (%)
            </label>
            <input
              type="number"
              value={imageOpacity}
              onChange={(e) =>
                setImageOpacity(
                  Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
                )
              }
              className="w-full bg-gray-800 text-white px-3 py-2 rounded"
              min="0"
              max="100"
            />
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={() => setIsPlacingDetector(true)}
            className="w-full bg-cyan-600 text-white px-3 py-2 rounded hover:bg-cyan-700 transition-colors"
          >
            Place Detector
          </button>

          <button
            onClick={() => setReferenceLines([])}
            className="w-full bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 transition-colors"
          >
            Clear Reference Lines
          </button>

          <button
            onClick={() => setIsPlacingCompositeDetector(true)}
            className="w-full bg-orange-600 text-white px-3 py-2 rounded hover:bg-orange-700 transition-colors"
          >
            Place Composite Detector
          </button>

          <button
            onClick={() => setDetectors([])}
            className="w-full bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 transition-colors"
          >
            Clear Detectors
          </button>
        </div>
      </div>
    </div>
  );
}
