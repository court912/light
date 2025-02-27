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
  centerY: number;
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

  const [isPanning, setIsPanning] = useState(false);
  const [isHorizontalRefLine, setIsHorizontalRefLine] = useState(false);
  const [isVerticalRefLine, setIsVerticalRefLine] = useState(false);
  const [isDraggingDetector, setIsDraggingDetector] = useState(false);
  const [selectedDetectorIndex, setSelectedDetectorIndex] = useState<
    number | null
  >(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const [imageOpacity, setImageOpacity] = useState(100);
  const [imageWidth, setImageWidth] = useState(100);
  const [imageHeight, setImageHeight] = useState(100);
  // Store reference lines (CMD+click for horizontal, Shift+click for vertical)
  const [referenceLines, setReferenceLines] = useState<ReferenceLine[]>([]);

  // Visibility toggles for different elements
  const [showRays, setShowRays] = useState(true);
  const [showDetectors, setShowDetectors] = useState(true);
  const [showCompositeDetectors, setShowCompositeDetectors] = useState(true);
  const [showReferenceLines, setShowReferenceLines] = useState(true);
  const [showBackgroundImage, setShowBackgroundImage] = useState(true);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsPanning(true);
      }

      // Store H key state for horizontal reference lines
      if (e.code === "KeyH") {
        e.preventDefault();
        setIsHorizontalRefLine(true);
      }

      // Store V key state for vertical reference lines
      if (e.code === "KeyV") {
        e.preventDefault();
        setIsVerticalRefLine(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsPanning(false);
      }

      // Clear H key state
      if (e.code === "KeyH") {
        setIsHorizontalRefLine(false);
      }

      // Clear V key state
      if (e.code === "KeyV") {
        setIsVerticalRefLine(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

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
  const [binOpacity, setBinOpacity] = useState(50);
  const [numSlices, setNumSlices] = useState(14000);
  const [maxDetectorHeight, setMaxDetectorHeight] = useState(288000);
  const [amplification, setAmplification] = useState(10);
  const [maxBarWidth, setMaxBarWidth] = useState(300);
  const [colorBandRange, setColorBandRange] = useState(0.09);
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

  const isPointNearDetectorCenter = (
    px: number,
    py: number,
    detector: Detector,
  ) => {
    // Check if point is near the move handle (offset from center)
    const dx = px - (detector.x + 15);
    const dy = py - detector.centerY;
    return dx * dx + dy * dy <= 25; // 5px radius squared
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
        // Skip composite detectors as they don't have their own bins
        if (detector.isComposite) return detector;

        const bins = new Array(numSlices).fill(0);
        const detectorTop = detector.centerY - maxDetectorHeight / 2;

        rays.forEach((burst) => {
          burst.rays.forEach((ray) => {
            const intersectY = calculateIntersection(ray, burst, detector.x);
            if (intersectY === null) return;

            // Calculate relative position within the detector's height
            const relativeY = intersectY - detectorTop;
            const binIndex = Math.floor(
              (relativeY / maxDetectorHeight) * numSlices,
            );

            if (binIndex >= 0 && binIndex < bins.length) {
              bins[binIndex]++;
            }
          });
        });

        return { ...detector, bins };
      }),
    );
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check if hovering over any reference line delete dot or ray centroid
    const isHoveringRefDot = referenceLines.some((line) => {
      const dx = mouseX - line.x;
      const dy = mouseY - line.y;
      return dx * dx + dy * dy <= 36; // 6px radius squared
    });

    // Check if hovering over detector delete dot
    const isHoveringDetectorDot = detectors.some((detector) => {
      const dx = mouseX - detector.x;
      const dy = mouseY - detector.centerY;
      return dx * dx + dy * dy <= 36; // 6px radius squared
    });

    const isHoveringRayCentroid = rays.some((burst) =>
      isPointInCircle(mouseX, mouseY, burst.x, burst.y),
    );

    // Change cursor style based on what we're hovering
    if (isHoveringRefDot || isHoveringRayCentroid || isHoveringDetectorDot) {
      e.currentTarget.style.cursor = "grab";
    } else if (isPanning) {
      e.currentTarget.style.cursor = "move";
    } else if (isDraggingDetector) {
      e.currentTarget.style.cursor = "ns-resize";
    } else {
      e.currentTarget.style.cursor = "crosshair";
    }

    if (isPanning) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setPanOffset((prev) => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
    } else if (isDraggingDetector && selectedDetectorIndex !== null) {
      setDetectors((prev) => {
        const newDetectors = [...prev];
        newDetectors[selectedDetectorIndex] = {
          ...newDetectors[selectedDetectorIndex],
          centerY: mouseY,
        };
        return newDetectors;
      });
    }

    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if we clicked on any detector center point
    const clickedDetectorIndex = detectors.findIndex((detector) =>
      isPointNearDetectorCenter(clickX, clickY, detector),
    );

    if (clickedDetectorIndex !== -1) {
      setIsDraggingDetector(true);
      setSelectedDetectorIndex(clickedDetectorIndex);
      return;
    }
  };

  const handleCanvasMouseUp = () => {
    if (isDraggingDetector) {
      setWasDragging(true);
    }
    setIsDraggingDetector(false);
    setSelectedDetectorIndex(null);
  };

  // Track if we were dragging to prevent click after drag ends
  const [wasDragging, setWasDragging] = useState(false);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning || wasDragging) {
      setWasDragging(false);
      return; // Prevent clicks while panning or after dragging
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if we clicked on a reference line delete dot
    const clickedRefLineIndex = referenceLines.findIndex((line) => {
      const dx = clickX - line.x;
      const dy = clickY - line.y;
      return dx * dx + dy * dy <= 36; // 6px radius squared
    });

    if (clickedRefLineIndex !== -1) {
      // Remove the clicked reference line
      setReferenceLines((prev) =>
        prev.filter((_, index) => index !== clickedRefLineIndex),
      );
      return;
    }

    // Check if we clicked on a detector delete dot
    const clickedDetectorIndex = detectors.findIndex((detector) => {
      const dx = clickX - detector.x;
      const dy = clickY - detector.centerY;
      return dx * dx + dy * dy <= 36; // 6px radius squared
    });

    if (clickedDetectorIndex !== -1) {
      // Remove the clicked detector
      setDetectors((prev) =>
        prev.filter((_, index) => index !== clickedDetectorIndex),
      );
      return;
    }

    // Handle reference lines (H key for horizontal, V key for vertical)
    if (isHorizontalRefLine || isVerticalRefLine) {
      setReferenceLines((prev) => [
        ...prev,
        { x: clickX, y: clickY, isHorizontal: isHorizontalRefLine },
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
          centerY: clickY,
          height: maxDetectorHeight,
          bins: new Array(numSlices).fill(0),
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
  }, [rays, numSlices, detectors.length]);

  // Update bins when dragging a detector
  useEffect(() => {
    if (isDraggingDetector && selectedDetectorIndex !== null) {
      updateDetectorBins();
    }
  }, [
    isDraggingDetector,
    selectedDetectorIndex,
    detectors.map((d) => d.centerY).join(","),
  ]); // This will trigger when any detector's centerY changes

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background image if exists and visible
    if (backgroundImage && showBackgroundImage) {
      ctx.globalAlpha = imageOpacity / 100;
      const width = (canvas.width * imageWidth) / 100;
      const height = (canvas.height * imageHeight) / 100;
      const x = (canvas.width - width) / 2;
      const y = (canvas.height - height) / 2;
      ctx.drawImage(backgroundImage, x, y, width, height);
      ctx.globalAlpha = 1;
    }

    const alpha = transparency / 100;

    // Draw rays and centroids if visible
    if (showRays) {
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
        ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }

    // Draw reference lines with delete dots if visible
    if (showReferenceLines) {
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

        // Draw a delete dot at the reference line's origin point
        ctx.beginPath();
        ctx.arc(line.x, line.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = "yellow";
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    }

    // Draw detectors if visible
    detectors.forEach((detector) => {
      // Skip regular detectors if they're hidden or composite detectors if those are hidden
      if (
        (detector.isComposite && !showCompositeDetectors) ||
        (!detector.isComposite && !showDetectors)
      ) {
        return;
      }

      if (detector.isComposite) {
        // For composite detectors, we need to map the data from source detectors to the composite detector's position
        // Find all regular detectors to the left
        const leftDetectors = detectors.filter(
          (d) => d.x < detector.x && !d.isComposite,
        );

        // Create a new array to hold combined ray intersections
        const combinedBins = new Array(numSlices).fill(0);

        // The composite detector's top position is based on its own centerY
        const compositeDetectorTop = detector.centerY - maxDetectorHeight / 2;

        // For each detector to the left, map its bins to the composite detector's coordinate space
        leftDetectors.forEach((leftDetector) => {
          // Calculate the top of the source detector
          const leftDetectorTop = leftDetector.centerY - maxDetectorHeight / 2;

          // For each bin in the source detector
          leftDetector.bins.forEach((value, sourceIndex) => {
            if (value === 0) return; // Skip empty bins

            // Calculate the absolute Y position of this bin in the source detector
            const binSize = maxDetectorHeight / numSlices;
            const sourceY = leftDetectorTop + (sourceIndex + 0.5) * binSize; // Center of the bin

            // Now map this Y position to a bin in the composite detector
            const relativeY = sourceY - compositeDetectorTop;
            const targetIndex = Math.floor(
              (relativeY / maxDetectorHeight) * numSlices,
            );

            if (targetIndex >= 0 && targetIndex < combinedBins.length) {
              combinedBins[targetIndex] += value;
            }
          });
        });

        // Find the global maximum intensity across all bins
        const maxIntensity = Math.max(...combinedBins, 1);
        // Calculate the maximum bar width based on the highest intensity bin
        const globalMaxBarWidth = Math.min(
          maxBarWidth,
          maxIntensity * amplification,
        );

        // Find the Point of Control (PoC) - bin with the highest intensity
        const pocIndex = combinedBins.indexOf(maxIntensity);
        const halfBins = numSlices / 2;

        // Define color bands based on distance from PoC (approximating normal distribution)
        // Scale the bands based on the user-defined range
        const band1 = 0.3413 * colorBandRange; // ~34% from center
        const band2 = 0.4772 * colorBandRange; // ~48% from center
        const band3 = 0.6131 * colorBandRange; // ~61% from center
        const band4 = 0.6345 * colorBandRange; // ~63% from center

        combinedBins.forEach((intensity, i) => {
          // Use the raw intensity value directly, scaled to the max width
          const barWidth =
            intensity > 0 ? (intensity / maxIntensity) * globalMaxBarWidth : 0;
          const binSize = maxDetectorHeight / numSlices;
          const detectorTop = detector.centerY - maxDetectorHeight / 2;

          // Draw the vertical detector line in a different color for composite
          ctx.fillStyle = `rgba(255, 165, 0, ${binOpacity / 100})`; // Orange for composite
          ctx.fillRect(
            detector.x - DETECTOR_WIDTH / 2,
            detectorTop + i * binSize,
            DETECTOR_WIDTH,
            binSize,
          );

          // Calculate distance from PoC (normalized to 0-1)
          // Only consider bins within the colorBandRange percentage from center
          const binDistFrac =
            Math.abs(i - pocIndex) / (halfBins * colorBandRange);

          // Calculate opacity for color intensity
          const opacity =
            intensity > 0 ? Math.min(1, intensity / maxIntensity) : 0;

          // Determine color based on distance from PoC (with full opacity)
          let color;
          if (i === pocIndex) {
            // Point of Control is yellow
            color = "rgba(255, 255, 0, 1)";
          } else if (binDistFrac <= band1) {
            // Light green for bins close to PoC
            color = "rgba(0, 255, 0, 1)";
          } else if (binDistFrac <= band2) {
            // Green for bins a bit further
            color = "rgba(0, 128, 0, 1)";
          } else if (binDistFrac <= band3) {
            // Orange for bins even further
            color = "rgba(255, 165, 0, 1)";
          } else if (binDistFrac <= band4) {
            // Red for bins at the edge of significance
            color = "rgba(255, 0, 0, 1)";
          } else {
            // Blue for bins far from PoC
            color = "rgba(0, 0, 255, 1)";
          }

          ctx.fillStyle = color;
          ctx.fillRect(
            detector.x + DETECTOR_WIDTH / 2,
            detectorTop + i * binSize,
            barWidth,
            binSize,
          );
        });

        // Draw delete dot for detector
        ctx.beginPath();
        ctx.arc(detector.x, detector.centerY, 6, 0, Math.PI * 2);
        ctx.fillStyle = "yellow";
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw move handle offset from delete dot
        ctx.beginPath();
        ctx.arc(detector.x + 15, detector.centerY, 5, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();
        ctx.strokeStyle = "black";
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        // Find the global maximum intensity across all bins
        const maxIntensity = Math.max(...detector.bins, 1);
        // Calculate the maximum bar width based on the highest intensity bin
        const globalMaxBarWidth = Math.min(
          maxBarWidth,
          maxIntensity * amplification,
        );

        // Find the Point of Control (PoC) - bin with the highest intensity
        const pocIndex = detector.bins.indexOf(maxIntensity);
        const halfBins = numSlices / 2;

        // Define color bands based on distance from PoC (approximating normal distribution)
        // Scale the bands based on the user-defined range
        const band1 = 0.3413 * colorBandRange; // ~34% from center
        const band2 = 0.4772 * colorBandRange; // ~48% from center
        const band3 = 0.6131 * colorBandRange; // ~61% from center
        const band4 = 0.6345 * colorBandRange; // ~63% from center

        detector.bins.forEach((intensity, i) => {
          // Use the raw intensity value directly, scaled to the max width
          const barWidth =
            intensity > 0 ? (intensity / maxIntensity) * globalMaxBarWidth : 0;
          const binSize = maxDetectorHeight / numSlices;
          const detectorTop = detector.centerY - maxDetectorHeight / 2;

          // Draw the vertical detector line
          ctx.fillStyle = `rgba(0, 255, 255, ${binOpacity / 100})`;
          ctx.fillRect(
            detector.x - DETECTOR_WIDTH / 2,
            detectorTop + i * binSize,
            DETECTOR_WIDTH,
            binSize,
          );

          // Calculate distance from PoC (normalized to 0-1)
          // Only consider bins within the colorBandRange percentage from center
          const binDistFrac =
            Math.abs(i - pocIndex) / (halfBins * colorBandRange);

          // Calculate opacity for color intensity
          const opacity =
            intensity > 0 ? Math.min(1, intensity / maxIntensity) : 0;

          // Determine color based on distance from PoC (with full opacity)
          let color;
          if (i === pocIndex) {
            // Point of Control is yellow
            color = "rgba(255, 255, 0, 1)";
          } else if (binDistFrac <= band1) {
            // Light green for bins close to PoC
            color = "rgba(0, 255, 0, 1)";
          } else if (binDistFrac <= band2) {
            // Green for bins a bit further
            color = "rgba(0, 128, 0, 1)";
          } else if (binDistFrac <= band3) {
            // Orange for bins even further
            color = "rgba(255, 165, 0, 1)";
          } else if (binDistFrac <= band4) {
            // Red for bins at the edge of significance
            color = "rgba(255, 0, 0, 1)";
          } else {
            // Blue for bins far from PoC
            color = "rgba(0, 0, 255, 1)";
          }
          ctx.fillStyle = color;
          ctx.fillRect(
            detector.x + DETECTOR_WIDTH / 2,
            detectorTop + i * binSize,
            barWidth,
            binSize,
          );
        });

        // Draw delete dot for detector
        ctx.beginPath();
        ctx.arc(detector.x, detector.centerY, 6, 0, Math.PI * 2);
        ctx.fillStyle = "yellow";
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw move handle offset from delete dot
        ctx.beginPath();
        ctx.arc(detector.x + 15, detector.centerY, 5, 0, Math.PI * 2);
        ctx.fillStyle = "white";
        ctx.fill();
        ctx.strokeStyle = "black";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
  }, [
    rays,
    transparency,
    detectors,
    numSlices,
    amplification,
    maxBarWidth,
    backgroundImage,
    imageOpacity,
    referenceLines,
    binOpacity,
    panOffset,
    colorBandRange,
    showRays,
    showDetectors,
    showCompositeDetectors,
    showReferenceLines,
    showBackgroundImage,
  ]);

  return (
    <div className="fixed inset-0 flex">
      <div className="relative flex-1">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseDown={handleCanvasMouseDown}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          onMouseMove={handleCanvasMouseMove}
          className="absolute inset-0 w-full h-full bg-black"
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
            Ray Opacity (%)
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
            Bin Opacity (%)
          </label>
          <input
            type="number"
            value={binOpacity}
            onChange={(e) =>
              setBinOpacity(
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
            Detector Height (pixels)
          </label>
          <input
            type="number"
            value={maxDetectorHeight}
            onChange={(e) =>
              setMaxDetectorHeight(parseFloat(e.target.value) || 144000)
            }
            className="w-full bg-gray-800 text-white px-3 py-2 rounded"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">
            Number of Detector Slices
          </label>
          <input
            type="number"
            value={numSlices}
            onChange={(e) =>
              setNumSlices(Math.max(1, parseInt(e.target.value) || 1))
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
            Max Bar Width (px) - Scales with highest bin count
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
            Color Band Range (0-1)
          </label>
          <input
            type="number"
            value={colorBandRange}
            onChange={(e) =>
              setColorBandRange(parseFloat(e.target.value) || 0.997)
            }
            className="w-full bg-gray-800 text-white px-3 py-2 rounded"
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
          <>
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

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-200">
                Image Width (%)
              </label>
              <input
                type="number"
                value={imageWidth}
                onChange={(e) =>
                  setImageWidth(
                    Math.min(200, Math.max(1, parseInt(e.target.value) || 100)),
                  )
                }
                className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                min="1"
                max="200"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-200">
                Image Height (%)
              </label>
              <input
                type="number"
                value={imageHeight}
                onChange={(e) =>
                  setImageHeight(
                    Math.min(200, Math.max(1, parseInt(e.target.value) || 100)),
                  )
                }
                className="w-full bg-gray-800 text-white px-3 py-2 rounded"
                min="1"
                max="200"
              />
            </div>
          </>
        )}

        <div className="border-b border-gray-700 pb-4 mb-4">
          <h3 className="text-lg font-medium text-white mb-3">Add Elements</h3>
          <div className="space-y-2">
            <button
              onClick={() => setIsPlacingDetector(true)}
              className="w-full bg-cyan-600 text-white px-3 py-2 rounded hover:bg-cyan-700 transition-colors"
            >
              Place Detector
            </button>

            <button
              onClick={() => setIsPlacingCompositeDetector(true)}
              className="w-full bg-orange-600 text-white px-3 py-2 rounded hover:bg-orange-700 transition-colors"
            >
              Place Composite Detector
            </button>
          </div>
        </div>

        <div className="border-b border-gray-700 pb-4 mb-4">
          <h3 className="text-lg font-medium text-white mb-3">
            Toggle Visibility
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => setShowRays(!showRays)}
              className={`w-full px-3 py-2 rounded transition-colors ${showRays ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-700"} text-white`}
            >
              {showRays ? "Hide" : "Show"} Rays
            </button>

            <button
              onClick={() => setShowDetectors(!showDetectors)}
              className={`w-full px-3 py-2 rounded transition-colors ${showDetectors ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-700"} text-white`}
            >
              {showDetectors ? "Hide" : "Show"} Detectors
            </button>

            <button
              onClick={() => setShowCompositeDetectors(!showCompositeDetectors)}
              className={`w-full px-3 py-2 rounded transition-colors ${showCompositeDetectors ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-700"} text-white`}
            >
              {showCompositeDetectors ? "Hide" : "Show"} Composite Detectors
            </button>

            <button
              onClick={() => setShowReferenceLines(!showReferenceLines)}
              className={`w-full px-3 py-2 rounded transition-colors ${showReferenceLines ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-700"} text-white`}
            >
              {showReferenceLines ? "Hide" : "Show"} Reference Lines
            </button>

            {backgroundImage && (
              <button
                onClick={() => setShowBackgroundImage(!showBackgroundImage)}
                className={`w-full px-3 py-2 rounded transition-colors ${showBackgroundImage ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-700"} text-white`}
              >
                {showBackgroundImage ? "Hide" : "Show"} Background Image
              </button>
            )}
          </div>
        </div>

        <div className="border-b border-gray-700 pb-4 mb-4">
          <h3 className="text-lg font-medium text-white mb-3">
            Clear Elements
          </h3>
          <div className="space-y-2">
            <button
              onClick={() => setReferenceLines([])}
              className="w-full bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 transition-colors"
            >
              Clear Reference Lines
            </button>

            <button
              onClick={() => setDetectors([])}
              className="w-full bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 transition-colors"
            >
              Clear Detectors
            </button>

            <button
              onClick={() => setRays([])}
              className="w-full bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 transition-colors"
            >
              Clear Sunbursts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
