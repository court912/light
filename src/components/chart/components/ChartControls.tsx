import React, { useState } from "react";

interface ChartControlsProps {
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onXSkewChange: (skew: number) => void;
  onYSkewChange: (skew: number) => void;
  initialWidth?: number;
  initialHeight?: number;
  initialXSkew?: number;
  initialYSkew?: number;
}

const ChartControls: React.FC<ChartControlsProps> = ({
  onWidthChange,
  onHeightChange,
  onXSkewChange,
  onYSkewChange,
  initialWidth = 100,
  initialHeight = 100,
  initialXSkew = 0,
  initialYSkew = 0,
}) => {
  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);
  const [xSkew, setXSkew] = useState(initialXSkew);
  const [ySkew, setYSkew] = useState(initialYSkew);

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWidth = parseInt(e.target.value);
    if (!isNaN(newWidth) && newWidth > 0) {
      setWidth(newWidth);
      onWidthChange(newWidth);
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeight = parseInt(e.target.value);
    if (!isNaN(newHeight) && newHeight > 0) {
      setHeight(newHeight);
      onHeightChange(newHeight);
    }
  };

  const handleXSkewChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSkew = parseInt(e.target.value);
    if (!isNaN(newSkew)) {
      setXSkew(newSkew);
      onXSkewChange(newSkew);
    }
  };

  const handleYSkewChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSkew = parseInt(e.target.value);
    if (!isNaN(newSkew)) {
      setYSkew(newSkew);
      onYSkewChange(newSkew);
    }
  };

  return (
    <div className="border-b border-gray-700 pb-4 mb-4">
      <h3 className="text-lg font-medium text-white mb-3">Chart Controls</h3>
      <div className="space-y-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">
            Chart Width (%): {width}
          </label>
          <input
            type="range"
            min="50"
            max="200"
            value={width}
            onChange={handleWidthChange}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">
            Chart Height (%): {height}
          </label>
          <input
            type="range"
            min="50"
            max="200"
            value={height}
            onChange={handleHeightChange}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">
            X Skew (°): {xSkew}
          </label>
          <input
            type="range"
            min="-45"
            max="45"
            value={xSkew}
            onChange={handleXSkewChange}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">
            Y Skew (°): {ySkew}
          </label>
          <input
            type="range"
            min="-45"
            max="45"
            value={ySkew}
            onChange={handleYSkewChange}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};

export default ChartControls;
