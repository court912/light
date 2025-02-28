import { useState, useCallback, useEffect } from "react";
import { Candle, ChartRange } from "../types";

export const useChartData = () => {
  const [candleData, setCandleData] = useState<Candle[]>([]);
  const [xRange, setXRange] = useState<ChartRange>({ min: 0, max: 0 });
  const [yRange, setYRange] = useState<ChartRange>({ min: 0, max: 0 });

  // Parse CSV data function
  const parseCSVData = useCallback((csvText: string) => {
    console.log("Starting CSV parsing");
    try {
      // Parse the CSV data
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
      const parsedData: Candle[] = [];

      // Process each line
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const values = line.split(",");
        if (values.length < 5) {
          console.warn(`Line ${i} has insufficient values:`, line);
          continue; // Skip invalid lines
        }

        try {
          // Try to parse the timestamp - handle both unix timestamps and date strings
          let timestamp: number;
          if (isNaN(parseInt(values[0]))) {
            // Try to parse as date string
            const date = new Date(values[0]);
            if (isNaN(date.getTime())) {
              console.warn(`Invalid date format in line ${i}:`, values[0]);
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
            console.warn(`Invalid price values in line ${i}:`, values);
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

      console.log(`Imported ${parsedData.length} candles from CSV`);

      // Sort data by timestamp to ensure proper ordering
      parsedData.sort((a, b) => a.time - b.time);

      // Use a direct state update to ensure React processes it immediately
      setCandleData(parsedData);

      // Add a small delay and then force a redraw
      setTimeout(() => {
        console.log("Delayed force redraw after setting candleData");
        window.dispatchEvent(new Event("force-chart-reload"));
      }, 200);

      // Set initial ranges
      if (parsedData.length > 0) {
        const minX = Math.min(...parsedData.map((d) => d.time));
        const maxX = Math.max(...parsedData.map((d) => d.time));
        const minY = Math.min(...parsedData.map((d) => d.low));
        const maxY = Math.max(...parsedData.map((d) => d.high));

        // Add some padding to the y-range
        const yPadding = (maxY - minY) * 0.1;

        setXRange({ min: minX, max: maxX });
        setYRange({ min: minY - yPadding, max: maxY + yPadding });
      }
    } catch (error) {
      console.error("Error parsing CSV data:", error);
    }
  }, []);

  // Update ranges based on data
  const updateRanges = useCallback((data: Candle[]) => {
    if (data.length > 0) {
      const minX = Math.min(...data.map((d) => d.time));
      const maxX = Math.max(...data.map((d) => d.time));
      const minY = Math.min(...data.map((d) => d.low));
      const maxY = Math.max(...data.map((d) => d.high));

      // Add some padding to the y-range
      const yPadding = (maxY - minY) * 0.1;

      setXRange({ min: minX, max: maxX });
      setYRange({ min: minY - yPadding, max: maxY + yPadding });
    }
  }, []);

  // Expose the setCandleData function globally for direct access
  useEffect(() => {
    window.chartData = candleData;
    window.setChartData = (data: Candle[]) => {
      console.log("Direct setCandleData called with", data.length, "candles");
      setCandleData(data);
      updateRanges(data);
    };

    return () => {
      delete window.chartData;
      delete window.setChartData;
    };
  }, [updateRanges]);

  // Log when candleData changes
  useEffect(() => {
    console.log("Candle data updated, length:", candleData.length);

    if (candleData.length > 0) {
      console.log("First candle:", candleData[0]);
      console.log("Last candle:", candleData[candleData.length - 1]);
    }
  }, [candleData]);

  return {
    candleData,
    setCandleData,
    xRange,
    setXRange,
    yRange,
    setYRange,
    parseCSVData,
    updateRanges,
  };
};
