import React, { useState } from "react";
import { Candle } from "../types";
import AlphaVantageDataViewer from "./AlphaVantageDataViewer";

interface ApiDataCheckboxProps {
  onDataLoaded: (data: Candle[]) => void;
}

const ApiDataCheckbox: React.FC<ApiDataCheckboxProps> = ({ onDataLoaded }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDataViewer, setShowDataViewer] = useState(false);

  const fetchAlphaVantageData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=SPY&interval=5min&apikey=29U03GQWNKG9J5DM&outputsize=full",
      );

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();

      // Check if we have the expected data structure
      if (!data["Time Series (5min)"]) {
        throw new Error("Invalid API response format");
      }

      // Convert AlphaVantage data to our Candle format
      const timeSeriesData = data["Time Series (5min)"];
      const parsedData: Candle[] = [];

      for (const timestamp in timeSeriesData) {
        const entry = timeSeriesData[timestamp];
        const unixTime = Math.floor(new Date(timestamp).getTime() / 1000);

        parsedData.push({
          time: unixTime,
          open: parseFloat(entry["1. open"]),
          high: parseFloat(entry["2. high"]),
          low: parseFloat(entry["3. low"]),
          close: parseFloat(entry["4. close"]),
        });
      }

      // Sort by timestamp (oldest first)
      parsedData.sort((a, b) => a.time - b.time);

      console.log(`Parsed ${parsedData.length} candles from AlphaVantage API`);

      // Pass the data to the parent component
      onDataLoaded(parsedData);

      // Show success toast
      const toast = document.createElement("div");
      toast.className =
        "fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50";
      toast.textContent = `Loaded ${parsedData.length} candles from AlphaVantage API`;
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 3000);
    } catch (err) {
      console.error("Error fetching AlphaVantage data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");

      // Show error toast
      const toast = document.createElement("div");
      toast.className =
        "fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow-lg z-50";
      toast.textContent = `Error loading AlphaVantage data: ${err instanceof Error ? err.message : "Unknown error"}`;
      document.body.appendChild(toast);
      setTimeout(() => document.body.removeChild(toast), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {showDataViewer && (
        <AlphaVantageDataViewer onClose={() => setShowDataViewer(false)} />
      )}

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="alphaVantageData"
            onChange={(e) => {
              if (e.target.checked) {
                fetchAlphaVantageData();
              }
            }}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            disabled={isLoading}
          />
          <label
            htmlFor="alphaVantageData"
            className="text-sm font-medium text-gray-200"
          >
            Load SPY 5min data from AlphaVantage
          </label>
          {isLoading && (
            <div className="ml-2 animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
          )}
        </div>
        {error && (
          <div className="mt-2 text-xs text-red-400">Error: {error}</div>
        )}
        <div className="mt-2 text-xs text-gray-400 flex items-center">
          <span>Data source: AlphaVantage API (SPY 5min candles)</span>
          <button
            onClick={() => setShowDataViewer(true)}
            className="ml-2 text-blue-400 hover:text-blue-300 underline"
          >
            View API JSON
          </button>
        </div>
      </div>
    </>
  );
};

export default ApiDataCheckbox;
