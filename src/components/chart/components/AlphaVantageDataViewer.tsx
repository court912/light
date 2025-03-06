import React, { useState } from "react";

interface AlphaVantageDataViewerProps {
  onClose: () => void;
}

const AlphaVantageDataViewer: React.FC<AlphaVantageDataViewerProps> = ({
  onClose,
}) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=SPY&interval=5min&apikey=29U03GQWNKG9J5DM&outputsize=full",
      );

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const jsonData = await response.json();
      setData(jsonData);
    } catch (err) {
      console.error("Error fetching AlphaVantage data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  // Format the JSON data for display
  const formatJson = (json: any): string => {
    return JSON.stringify(json, null, 2);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-3/4 max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            AlphaVantage API Data
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="mb-4 flex space-x-4">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? "Loading..." : "Fetch Data"}
          </button>

          {data && (
            <button
              onClick={() => {
                const dataStr = formatJson(data);
                navigator.clipboard.writeText(dataStr);

                // Show toast notification
                const toast = document.createElement("div");
                toast.className =
                  "fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50";
                toast.textContent = "JSON copied to clipboard!";
                document.body.appendChild(toast);
                setTimeout(() => document.body.removeChild(toast), 3000);
              }}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Copy to Clipboard
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900 bg-opacity-50 text-red-200 rounded">
            Error: {error}
          </div>
        )}

        <div className="flex-1 overflow-auto bg-gray-900 p-4 rounded font-mono text-sm">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
            </div>
          ) : data ? (
            <pre className="text-gray-300 whitespace-pre-wrap">
              {formatJson(data)}
            </pre>
          ) : (
            <div className="text-gray-400 flex items-center justify-center h-full">
              Click "Fetch Data" to load the API response
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlphaVantageDataViewer;
