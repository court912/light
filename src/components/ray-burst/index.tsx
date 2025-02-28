import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Detector,
  RayBurst as RayBurstType,
  ReferenceLine,
  CONSTANTS,
} from "./types";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useDetectorBins } from "./hooks/useDetectorBins";
import { useCanvasInteractions } from "./hooks/useCanvasInteractions";
import {
  renderBackgroundImage,
  renderRays,
  renderReferenceLines,
  calculateColorBands,
  drawDetectorControlPoint,
  getBinColor,
} from "./utils/rendering";
import ControlPanel from "./components/ControlPanel";
import { calculateRayLength } from "./utils/calculation";

/**
 * Main component for the ray-tracing visualization system
 */
const RayBurst: React.FC = () => {
  // Canvas reference
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animation frame reference
  const animationFrameRef = useRef<number | null>(null);

  // Ray state
  const [rays, setRays] = useState<RayBurstType[]>([]);
  const [numRays, setNumRays] = useState(36);
  const [transparency, setTransparency] = useState(100);

  // Detector state
  const [detectors, setDetectors] = useState<Detector[]>([]);
  const [binOpacity, setBinOpacity] = useState(50);
  const [numSlices, setNumSlices] = useState(14000);
  const [maxDetectorHeight, setMaxDetectorHeight] = useState(288000);
  const [amplification, setAmplification] = useState(10);
  const [maxBarWidth, setMaxBarWidth] = useState(300);
  const [colorBandRange, setColorBandRange] = useState(0.09);

  // Background image state
  const [backgroundImage, setBackgroundImage] =
    useState<HTMLImageElement | null>(null);
  const [imageOpacity, setImageOpacity] = useState(100);
  const [imageWidth, setImageWidth] = useState(100);
  const [imageHeight, setImageHeight] = useState(100);

  // Reference lines state
  const [referenceLines, setReferenceLines] = useState<ReferenceLine[]>([]);

  // Interaction state
  const [isPanning, setIsPanning] = useState(false);
  const [isHorizontalRefLine, setIsHorizontalRefLine] = useState(false);
  const [isVerticalRefLine, setIsVerticalRefLine] = useState(false);
  const [isDraggingDetector, setIsDraggingDetector] = useState(false);
  const [selectedDetectorIndex, setSelectedDetectorIndex] = useState<
    number | null
  >(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [wasDragging, setWasDragging] = useState(false);

  // Element placement state
  const [isPlacingDetector, setIsPlacingDetector] = useState(false);
  const [isPlacingCompositeDetector, setIsPlacingCompositeDetector] =
    useState(false);

  // Visibility toggles
  const [showRays, setShowRays] = useState(true);
  const [showDetectors, setShowDetectors] = useState(true);
  const [showCompositeDetectors, setShowCompositeDetectors] = useState(true);
  const [showReferenceLines, setShowReferenceLines] = useState(true);
  const [showBackgroundImage, setShowBackgroundImage] = useState(true);

  // Custom hooks
  const { updateDetectorBins, calculateCompositeBins } = useDetectorBins();
  const {
    isPointNearDetectorHandle,
    createRayBurst,
    findReferenceLineAtPoint,
    findDetectorAtPoint,
    findRayBurstAtPoint,
    createDetector,
  } = useCanvasInteractions();

  // Set up keyboard shortcuts
  useKeyboardShortcuts({
    onSpaceDown: () => setIsPanning(true),
    onSpaceUp: () => setIsPanning(false),
    onHKeyDown: () => setIsHorizontalRefLine(true),
    onHKeyUp: () => setIsHorizontalRefLine(false),
    onVKeyDown: () => setIsVerticalRefLine(true),
    onVKeyUp: () => setIsVerticalRefLine(false),
  });

  // Initialize canvas and handle resizing
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

  // Update ray bursts when numRays changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setRays((prev) =>
      prev.map((burst) => ({
        ...burst,
        rays: Array.from({ length: numRays }, (_, i) => {
          const angle = (Math.PI * 2 * i) / numRays;
          // Calculate ray length to ensure it reaches the canvas boundary
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

  // Update detector bins when rays or detectors change
  useEffect(() => {
    setDetectors((prev) =>
      updateDetectorBins(prev, rays, numSlices, maxDetectorHeight),
    );
  }, [
    rays,
    numSlices,
    detectors.length,
    updateDetectorBins,
    maxDetectorHeight,
  ]);

  // Update bins when dragging a detector
  useEffect(() => {
    if (isDraggingDetector && selectedDetectorIndex !== null) {
      // Force a full update of all detector bins when dragging
      setDetectors((prev) =>
        updateDetectorBins(prev, rays, numSlices, maxDetectorHeight),
      );
    }
  }, [
    isDraggingDetector,
    selectedDetectorIndex,
    detectors.map((d) => d.centerY).join(","),
    rays,
    numSlices,
    updateDetectorBins,
    maxDetectorHeight,
  ]);

  // Render function that will be called in the animation loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    // Clear the entire canvas before each render
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background image if exists and visible
    if (backgroundImage && showBackgroundImage) {
      renderBackgroundImage(
        ctx,
        backgroundImage,
        canvas.width,
        canvas.height,
        imageOpacity,
        imageWidth,
        imageHeight,
      );
    }

    // Draw rays if visible
    if (showRays) {
      renderRays(ctx, rays, transparency / 100);
    }

    // Draw reference lines if visible
    if (showReferenceLines) {
      renderReferenceLines(ctx, referenceLines, canvas.width, canvas.height);
    }

    // Draw detectors directly in this effect to ensure synchronized rendering
    if (detectors.length > 0) {
      // Process each detector
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
    }

    // Continue the animation loop
    animationFrameRef.current = requestAnimationFrame(renderCanvas);
  }, [
    rays,
    transparency,
    detectors,
    numSlices,
    amplification,
    maxBarWidth,
    backgroundImage,
    imageOpacity,
    imageWidth,
    imageHeight,
    referenceLines,
    binOpacity,
    panOffset,
    colorBandRange,
    showRays,
    showDetectors,
    showCompositeDetectors,
    showReferenceLines,
    showBackgroundImage,
    maxDetectorHeight,
    calculateCompositeBins,
  ]);

  // Start and stop the animation loop
  useEffect(() => {
    // Start the animation loop
    animationFrameRef.current = requestAnimationFrame(renderCanvas);

    // Clean up the animation loop when component unmounts
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [renderCanvas]);

  // Handle mouse move events
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check if hovering over any reference line delete dot or ray centroid
    const isHoveringRefDot =
      findReferenceLineAtPoint(mouseX, mouseY, referenceLines) !== -1;
    const isHoveringDetectorDot =
      findDetectorAtPoint(mouseX, mouseY, detectors) !== -1;
    const isHoveringRayCentroid =
      findRayBurstAtPoint(mouseX, mouseY, rays) !== -1;

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
      // Update the detector position without clearing the canvas
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

  // Handle mouse down events
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if we clicked on any detector handle
    const clickedDetectorIndex = detectors.findIndex((detector) =>
      isPointNearDetectorHandle(clickX, clickY, detector),
    );

    if (clickedDetectorIndex !== -1) {
      setIsDraggingDetector(true);
      setSelectedDetectorIndex(clickedDetectorIndex);
      return;
    }
  };

  // Handle mouse up events
  const handleCanvasMouseUp = () => {
    if (isDraggingDetector) {
      setWasDragging(true);
    }
    setIsDraggingDetector(false);
    setSelectedDetectorIndex(null);
  };

  // Handle click events
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning || wasDragging) {
      setWasDragging(false);
      return; // Prevent clicks while panning or after dragging
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if we clicked on a reference line delete dot
    const clickedRefLineIndex = findReferenceLineAtPoint(
      clickX,
      clickY,
      referenceLines,
    );
    if (clickedRefLineIndex !== -1) {
      setReferenceLines((prev) =>
        prev.filter((_, index) => index !== clickedRefLineIndex),
      );
      return;
    }

    // Check if we clicked on a detector delete dot
    const clickedDetectorIndex = findDetectorAtPoint(clickX, clickY, detectors);
    if (clickedDetectorIndex !== -1) {
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

    // Handle detector placement
    if (isPlacingDetector || isPlacingCompositeDetector) {
      setDetectors((prev) => [
        ...prev,
        createDetector(
          clickX,
          clickY,
          numSlices,
          maxDetectorHeight,
          isPlacingCompositeDetector,
        ),
      ]);
      setIsPlacingDetector(false);
      setIsPlacingCompositeDetector(false);
      return;
    }

    // Check if we clicked on any existing ray burst
    const clickedBurstIndex = findRayBurstAtPoint(clickX, clickY, rays);
    if (clickedBurstIndex !== -1) {
      setRays((prev) => prev.filter((_, index) => index !== clickedBurstIndex));
      return;
    }

    // Create new ray burst
    const canvas = canvasRef.current;
    if (!canvas) return;

    setRays((prev) => [
      ...prev,
      createRayBurst(clickX, clickY, numRays, canvas.width, canvas.height),
    ]);
  };

  // Clear functions
  const clearReferenceLines = () => setReferenceLines([]);
  const clearDetectors = () => setDetectors([]);
  const clearRays = () => setRays([]);

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
        {/* Note: Detectors are now rendered directly in the animation loop */}
      </div>

      <ControlPanel
        // Ray controls
        numRays={numRays}
        setNumRays={setNumRays}
        transparency={transparency}
        setTransparency={setTransparency}
        // Detector controls
        binOpacity={binOpacity}
        setBinOpacity={setBinOpacity}
        maxDetectorHeight={maxDetectorHeight}
        setMaxDetectorHeight={setMaxDetectorHeight}
        numSlices={numSlices}
        setNumSlices={setNumSlices}
        amplification={amplification}
        setAmplification={setAmplification}
        maxBarWidth={maxBarWidth}
        setMaxBarWidth={setMaxBarWidth}
        colorBandRange={colorBandRange}
        setColorBandRange={setColorBandRange}
        // Background image controls
        backgroundImage={backgroundImage}
        setBackgroundImage={setBackgroundImage}
        imageOpacity={imageOpacity}
        setImageOpacity={setImageOpacity}
        imageWidth={imageWidth}
        setImageWidth={setImageWidth}
        imageHeight={imageHeight}
        setImageHeight={setImageHeight}
        // Element placement controls
        setIsPlacingDetector={setIsPlacingDetector}
        setIsPlacingCompositeDetector={setIsPlacingCompositeDetector}
        // Visibility toggles
        showRays={showRays}
        setShowRays={setShowRays}
        showDetectors={showDetectors}
        setShowDetectors={setShowDetectors}
        showCompositeDetectors={showCompositeDetectors}
        setShowCompositeDetectors={setShowCompositeDetectors}
        showReferenceLines={showReferenceLines}
        setShowReferenceLines={setShowReferenceLines}
        showBackgroundImage={showBackgroundImage}
        setShowBackgroundImage={setShowBackgroundImage}
        // Clear functions
        clearReferenceLines={clearReferenceLines}
        clearDetectors={clearDetectors}
        clearRays={clearRays}
      />
    </div>
  );
};

export default RayBurst;
