import React from "react";

interface ControlPanelProps {
  // Ray controls
  numRays: number;
  setNumRays: (value: number) => void;
  transparency: number;
  setTransparency: (value: number) => void;

  // Detector controls
  binOpacity: number;
  setBinOpacity: (value: number) => void;
  maxDetectorHeight: number;
  setMaxDetectorHeight: (value: number) => void;
  numSlices: number;
  setNumSlices: (value: number) => void;
  amplification: number;
  setAmplification: (value: number) => void;
  maxBarWidth: number;
  setMaxBarWidth: (value: number) => void;
  colorBandRange: number;
  setColorBandRange: (value: number) => void;

  // Background image controls
  backgroundImage: HTMLImageElement | null;
  setBackgroundImage: (image: HTMLImageElement | null) => void;
  imageOpacity: number;
  setImageOpacity: (value: number) => void;
  imageWidth: number;
  setImageWidth: (value: number) => void;
  imageHeight: number;
  setImageHeight: (value: number) => void;

  // Element placement controls
  setIsPlacingDetector: (value: boolean) => void;
  setIsPlacingCompositeDetector: (value: boolean) => void;

  // Visibility toggles
  showRays: boolean;
  setShowRays: (value: boolean) => void;
  showDetectors: boolean;
  setShowDetectors: (value: boolean) => void;
  showCompositeDetectors: boolean;
  setShowCompositeDetectors: (value: boolean) => void;
  showReferenceLines: boolean;
  setShowReferenceLines: (value: boolean) => void;
  showBackgroundImage: boolean;
  setShowBackgroundImage: (value: boolean) => void;

  // Clear functions
  clearReferenceLines: () => void;
  clearDetectors: () => void;
  clearRays: () => void;
}

/**
 * Control panel component for the ray-tracing visualization
 */
const ControlPanel: React.FC<ControlPanelProps> = ({
  // Ray controls
  numRays,
  setNumRays,
  transparency,
  setTransparency,

  // Detector controls
  binOpacity,
  setBinOpacity,
  maxDetectorHeight,
  setMaxDetectorHeight,
  numSlices,
  setNumSlices,
  amplification,
  setAmplification,
  maxBarWidth,
  setMaxBarWidth,
  colorBandRange,
  setColorBandRange,

  // Background image controls
  backgroundImage,
  setBackgroundImage,
  imageOpacity,
  setImageOpacity,
  imageWidth,
  setImageWidth,
  imageHeight,
  setImageHeight,

  // Element placement controls
  setIsPlacingDetector,
  setIsPlacingCompositeDetector,

  // Visibility toggles
  showRays,
  setShowRays,
  showDetectors,
  setShowDetectors,
  showCompositeDetectors,
  setShowCompositeDetectors,
  showReferenceLines,
  setShowReferenceLines,
  showBackgroundImage,
  setShowBackgroundImage,

  // Clear functions
  clearReferenceLines,
  clearDetectors,
  clearRays,
}) => {
  return (
    <div className="w-64 bg-gray-900 p-4 flex flex-col gap-4 border-l border-gray-800 overflow-y-auto">
      {/* Ray Controls */}
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

      {/* Detector Controls */}
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

      {/* Background Image Controls */}
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

      {/* Add Elements Section */}
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

      {/* Toggle Visibility Section */}
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

          <button
            onClick={() => {
              // Access the CombinedChart's showTimeLines state
              if (window.toggleTimeLines) {
                window.toggleTimeLines();
              }
            }}
            className="w-full px-3 py-2 rounded transition-colors bg-blue-600 hover:bg-blue-700 text-white"
          >
            Toggle Time Lines
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

      {/* Import/Export Section */}
      <div className="border-b border-gray-700 pb-4 mb-4">
        <h3 className="text-lg font-medium text-white mb-3">
          Import/Export Data
        </h3>
        <div className="space-y-2">
          <div className="mb-2 text-xs text-gray-400">
            Expected CSV format: timestamp,open,high,low,close
            <br />
            Example: 1625097600,4300.50,4350.25,4290.75,4320.00
          </div>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                  const csvText = event.target?.result as string;
                  if (csvText) {
                    console.log(
                      "CSV file read, length:",
                      csvText.length,
                      "first 100 chars:",
                      csvText.substring(0, 100),
                    );

                    try {
                      // Parse the CSV directly here
                      const lines = csvText.split("\n");

                      // Check if we have any data
                      if (lines.length < 2) {
                        console.error("CSV file has insufficient data");
                        alert(
                          "The CSV file doesn't contain enough data. Please check the format.",
                        );
                        return;
                      }

                      // Try to determine if there's a header row
                      const firstLine = lines[0].toLowerCase();
                      const hasHeader =
                        firstLine.includes("time") ||
                        firstLine.includes("open") ||
                        firstLine.includes("high") ||
                        firstLine.includes("low") ||
                        firstLine.includes("close") ||
                        firstLine.includes("date") ||
                        isNaN(parseFloat(firstLine.split(",")[0]));

                      const startIndex = hasHeader ? 1 : 0;
                      const parsedData = [];

                      // Process each line
                      for (let i = startIndex; i < lines.length; i++) {
                        const line = lines[i];
                        if (!line.trim()) continue;

                        const values = line.split(",");
                        if (values.length < 5) {
                          console.warn(
                            `Line ${i} has insufficient values:`,
                            line,
                          );
                          continue; // Skip invalid lines
                        }

                        try {
                          // Try to parse the timestamp - handle both unix timestamps and date strings
                          let timestamp;
                          if (isNaN(parseInt(values[0]))) {
                            // Try to parse as date string
                            const date = new Date(values[0]);
                            if (isNaN(date.getTime())) {
                              console.warn(
                                `Invalid date format in line ${i}:`,
                                values[0],
                              );
                              continue;
                            }
                            timestamp = Math.floor(date.getTime() / 1000);
                          } else {
                            timestamp = parseInt(values[0]);
                            // If timestamp is too large (milliseconds instead of seconds), convert it
                            if (timestamp > 10000000000) {
                              // Timestamps after year 2286
                              timestamp = Math.floor(timestamp / 1000);
                            }
                          }

                          const candle = {
                            time: timestamp,
                            open: parseFloat(values[1]),
                            high: parseFloat(values[2]),
                            low: parseFloat(values[3]),
                            close: parseFloat(values[4]),
                          };

                          // Validate the candle data
                          if (
                            isNaN(candle.open) ||
                            isNaN(candle.high) ||
                            isNaN(candle.low) ||
                            isNaN(candle.close)
                          ) {
                            console.warn(
                              `Invalid price values in line ${i}:`,
                              values,
                            );
                            continue;
                          }

                          parsedData.push(candle);
                        } catch (e) {
                          console.warn(`Error parsing line ${i}:`, line, e);
                        }
                      }

                      if (parsedData.length === 0) {
                        console.error("No valid data found in CSV");
                        alert(
                          "No valid data could be parsed from the CSV file. Please check the format.",
                        );
                        return;
                      }

                      console.log(
                        `Parsed ${parsedData.length} candles from CSV`,
                      );

                      // Sort data by timestamp to ensure proper ordering
                      parsedData.sort((a, b) => a.time - b.time);

                      // Use the direct setter function
                      if (!window.setChartData) {
                        alert(
                          "Chart component not initialized yet. Please try again in a moment.",
                        );
                        return;
                      }

                      // Call the setter function directly
                      window.setChartData(parsedData);

                      // Show toast notification
                      const toast = document.createElement("div");
                      toast.className =
                        "fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50";
                      toast.textContent = "CSV data imported successfully!";
                      document.body.appendChild(toast);
                      setTimeout(() => document.body.removeChild(toast), 3000);
                    } catch (error) {
                      console.error("Error processing CSV:", error);
                      alert("Error processing CSV. Check console for details.");
                    }
                  }
                };
                reader.readAsText(file);
              }
            }}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            id="csv-file-input"
          />

          <button
            onClick={() => {
              // Force a reload of the chart
              window.dispatchEvent(new Event("force-chart-reload"));

              // Get all horizontal reference lines with their prices
              const horizontalLines = window.horizontalReferenceLines || [];
              if (horizontalLines.length === 0) {
                alert("No horizontal reference lines to export");
                return;
              }

              // Format as CSV
              const csv = horizontalLines
                .map((line) => line.price.toFixed(2))
                .join(",");

              try {
                // Use a textarea element for more reliable clipboard copying
                const textarea = document.createElement("textarea");
                textarea.value = csv;
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand("copy");
                document.body.removeChild(textarea);

                // Show toast notification
                const toast = document.createElement("div");
                toast.className =
                  "fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50";
                toast.textContent = "Prices copied to clipboard!";
                document.body.appendChild(toast);

                // Remove toast after 3 seconds
                setTimeout(() => {
                  document.body.removeChild(toast);
                }, 3000);
              } catch (err) {
                console.error("Failed to copy: ", err);
                alert("Failed to copy to clipboard. Please try again.");
              }
            }}
            className="w-full bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 transition-colors"
          >
            Copy Horizontal Lines to Clipboard
          </button>
        </div>
      </div>

      {/* Clear Elements Section */}
      <div className="border-b border-gray-700 pb-4 mb-4">
        <h3 className="text-lg font-medium text-white mb-3">Clear Elements</h3>
        <div className="space-y-2">
          <button
            onClick={clearReferenceLines}
            className="w-full bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 transition-colors"
          >
            Clear Reference Lines
          </button>

          <button
            onClick={clearDetectors}
            className="w-full bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 transition-colors"
          >
            Clear Detectors
          </button>

          <button
            onClick={clearRays}
            className="w-full bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 transition-colors"
          >
            Clear Sunbursts
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
