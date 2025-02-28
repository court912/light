import React from "react";

interface ScaleInputsProps {
  xScale: number;
  yScale: number;
  onXScaleChange: (value: number) => void;
  onYScaleChange: (value: number) => void;
}

const ScaleInputs: React.FC<ScaleInputsProps> = ({
  xScale,
  yScale,
  onXScaleChange,
  onYScaleChange,
}) => {
  const [xScaleInput, setXScaleInput] = React.useState(xScale.toString());
  const [yScaleInput, setYScaleInput] = React.useState(yScale.toString());

  // Update local state when props change
  React.useEffect(() => {
    setXScaleInput(xScale.toString());
  }, [xScale]);

  React.useEffect(() => {
    setYScaleInput(yScale.toString());
  }, [yScale]);

  const handleXChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setXScaleInput(e.target.value);
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      onXScaleChange(value);
    }
  };

  const handleYChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYScaleInput(e.target.value);
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      onYScaleChange(value);
    }
  };

  return (
    <div className="border-b border-gray-700 pb-4 mb-4">
      <h3 className="text-lg font-medium text-white mb-3">Scale Inputs</h3>
      <div className="space-y-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">
            X Scale
          </label>
          <input
            type="text"
            value={xScaleInput}
            onChange={handleXChange}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">
            Y Scale
          </label>
          <input
            type="text"
            value={yScaleInput}
            onChange={handleYChange}
            className="w-full bg-gray-800 text-white px-3 py-2 rounded"
          />
        </div>
      </div>
    </div>
  );
};

export default ScaleInputs;
