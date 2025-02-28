# Chart Scaling System

## Overview

The chart scaling system in this application controls how data is displayed on the canvas. There are two key concepts to understand:

1. **Data Range**: Defined by `xRange` and `yRange`, these determine what portion of the data is visible in the chart.
2. **Rendering Scale**: How the visible data is mapped to pixel coordinates on the canvas.

## How Scaling Works

### Data Range Adjustment

When you adjust the scale inputs in the control panel:

- A larger scale value means you see less data (zoom in)
- A smaller scale value means you see more data (zoom out)

The system calculates new min/max values for the range while keeping the center point fixed:

```javascript
const rangeWidth = xRange.max - xRange.min;
const centerPoint = xRange.min + rangeWidth / 2;

// Calculate new range width based on scale factor
const newRangeWidth = rangeWidth / scaleValue;

// Update range while keeping center point fixed
xRange.min = centerPoint - newRangeWidth / 2;
xRange.max = centerPoint + newRangeWidth / 2;
```

### Rendering Process

Once the data range is determined, the rendering system maps data points to canvas coordinates:

```javascript
// Calculate scales for mapping data to pixels
const xScale = chartWidth / (xRange.max - xRange.min);
const yScale = chartHeight / (yRange.max - yRange.min);

// Calculate position of a data point
const x = originX + (dataPoint.time - xRange.min) * xScale;
const y = originY - (dataPoint.value - yRange.min) * yScale;
```

## Key Components

1. **Scale Inputs**: UI controls in the control panel that let users adjust the scale values
2. **Event Listeners**: Handle scale change events and update the data ranges
3. **Renderers**: Use the current data ranges to map data points to canvas coordinates

## Important Notes

- The mouse wheel is intentionally disabled for zooming to ensure scaling is only controlled via the scale inputs
- Panning (via mouse drag) adjusts the view without changing the scale
- The chart maintains aspect ratio and center point when scaling
