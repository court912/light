import React, { useEffect, useRef } from "react";
import * as LightweightCharts from "lightweight-charts";

const TradingChart = ({ className = "" }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = LightweightCharts.createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { color: "#000000" },
        textColor: "#d1d4dc",
      },
      grid: {
        vertLines: { color: "rgba(42, 46, 57, 0.5)" },
        horzLines: { color: "rgba(42, 46, 57, 0.5)" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Create candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    // Sample data
    const data = [
      { time: "2023-01-01", open: 100, high: 105, low: 95, close: 102 },
      { time: "2023-01-02", open: 102, high: 110, low: 100, close: 109 },
      { time: "2023-01-03", open: 109, high: 115, low: 105, close: 107 },
      { time: "2023-01-04", open: 107, high: 112, low: 105, close: 110 },
      { time: "2023-01-05", open: 110, high: 115, low: 108, close: 112 },
      { time: "2023-01-06", open: 112, high: 120, low: 110, close: 118 },
      { time: "2023-01-07", open: 118, high: 125, low: 115, close: 122 },
      { time: "2023-01-08", open: 122, high: 125, low: 115, close: 118 },
      { time: "2023-01-09", open: 118, high: 122, low: 112, close: 115 },
      { time: "2023-01-10", open: 115, high: 118, low: 110, close: 112 },
      { time: "2023-01-11", open: 112, high: 115, low: 105, close: 107 },
      { time: "2023-01-12", open: 107, high: 112, low: 105, close: 110 },
      { time: "2023-01-13", open: 110, high: 115, low: 108, close: 112 },
      { time: "2023-01-14", open: 112, high: 120, low: 110, close: 118 },
      { time: "2023-01-15", open: 118, high: 125, low: 115, close: 122 },
      { time: "2023-01-16", open: 122, high: 125, low: 115, close: 118 },
      { time: "2023-01-17", open: 118, high: 122, low: 112, close: 115 },
      { time: "2023-01-18", open: 115, high: 118, low: 110, close: 112 },
      { time: "2023-01-19", open: 112, high: 115, low: 105, close: 107 },
      { time: "2023-01-20", open: 107, high: 112, low: 105, close: 110 },
    ];

    candlestickSeries.setData(data);

    // Fit content to container
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);
    chartRef.current = chart;

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  return (
    <div
      ref={chartContainerRef}
      className={`w-full h-full bg-black ${className}`}
    />
  );
};

export default TradingChart;
