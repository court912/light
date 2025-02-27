# Understanding Detector Lines and Bin Calculations

## Detector Line Basics

In our ray-tracing visualization system, detector lines are vertical lines that record where rays intersect with them. Each detector line:

1. Has a fixed position along the x-axis
2. Has a center point that can be dragged up and down
3. Has a fixed height (144,000 pixels total - extending 72,000 pixels above and below the center)
4. Is divided into a configurable number of equal-sized bins

## Bin System

Each detector line is divided into bins that count ray hits:

```javascript
// If we have a detector height of 144000 pixels and 100 bins
// each bin represents 1440 pixels of the detector line
const binSize = maxDetectorHeight / numSlices;  // 144000 / 100 = 1440 pixels per bin
```

### How Bins Work

1. **Bin Creation**: When a detector is placed, we create an array of bins initialized to zero:
   ```javascript
   const bins = new Array(numSlices).fill(0);
   ```

2. **Determining Bin Location**: When a ray hits the detector, we calculate which bin it belongs to:
   ```javascript
   // Calculate the top of the detector
   const detectorTop = detector.centerY - maxDetectorHeight / 2;
   
   // When a ray hits at position intersectY on the detector:
   const relativeY = intersectY - detectorTop;
   const binIndex = Math.floor((relativeY / maxDetectorHeight) * numSlices);
   ```

3. **Accumulating Hits**: Each bin keeps track of how many rays hit it:
   ```javascript
   // When a ray hits the calculated bin
   if (binIndex >= 0 && binIndex < bins.length) {
     bins[binIndex]++;
   }
   ```

## Intensity and Visualization Calculations

### Bar Width Calculation

The width of each bin's visualization bar is calculated based on:

1. The raw hit count for that bin
2. The maximum hit count across all bins
3. The amplification factor (user-configurable)
4. The maximum bar width (user-configurable)

```javascript
// Find the bin with the most hits
const maxIntensity = Math.max(...bins, 1); // Minimum of 1 to avoid division by zero

// Calculate the maximum possible bar width
const globalMaxBarWidth = Math.min(maxBarWidth, maxIntensity * amplification);

// For each bin, calculate its bar width
const barWidth = intensity > 0 ? (intensity / maxIntensity) * globalMaxBarWidth : 0;
```

### Color Intensity

The opacity of each bin's visualization is directly proportional to its relative intensity:

```javascript
// Calculate opacity for color intensity
const opacity = intensity > 0 ? Math.min(1, intensity / maxIntensity) : 0;

// Use this opacity in the color
ctx.fillStyle = `rgba(0, 255, 255, ${opacity})`; // For regular detectors
// or
ctx.fillStyle = `rgba(255, 165, 0, ${opacity})`; // For composite detectors
```

## Composite Detectors

Composite detectors (orange) combine data from all regular detectors (cyan) to their left:

1. **Data Collection**: When a composite detector is drawn, it finds all regular detectors to its left:
   ```javascript
   const leftDetectors = detectors.filter(d => d.x < detector.x && !d.isComposite);
   ```

2. **Bin Combination**: It then combines the bin data from all those detectors:
   ```javascript
   const combinedBins = new Array(numSlices).fill(0);
   
   leftDetectors.forEach(leftDetector => {
     leftDetector.bins.forEach((value, index) => {
       if (index < combinedBins.length) {
         combinedBins[index] += value;
       }
     });
   });
   ```

3. **Visualization**: The combined data is then visualized using the same principles as regular detectors, but with orange coloring instead of cyan.

## Example Scenarios

1. **Single Ray Hit**
   ```javascript
   // One ray hits bin 5
   bins[5] = 1;
   maxIntensity = 1;
   barWidth = maxBarWidth * 1; // Full width
   opacity = 1;  // Full opacity
   ```

2. **Multiple Hits in Same Bin**
   ```javascript
   // Three rays hit bin 5
   bins[5] = 3;
   maxIntensity = 3;
   barWidth = maxBarWidth * 1; // Still full width (it's the max)
   opacity = 1;  // Still full opacity
   ```

3. **Multiple Bins with Different Hits**
   ```javascript
   bins = [1, 3, 2, 4, 1];
   maxIntensity = 4;
   
   // For bin with 1 hit:
   barWidth = maxBarWidth * 0.25; // 25% of max width
   opacity = 0.25; // 25% opacity
   
   // For bin with 4 hits:
   barWidth = maxBarWidth * 1; // 100% of max width
   opacity = 1; // 100% opacity
   ```

## Amplification Effect

The amplification setting multiplies the raw hit counts before calculating bar widths:

```javascript
// With amplification = 2
const globalMaxBarWidth = Math.min(maxBarWidth, maxIntensity * 2);

// This can make bars wider, but is limited by maxBarWidth
```

## Practical Considerations

1. **Detector Placement**: Place detectors strategically to capture ray intersections of interest

2. **Bin Count**: More bins (slices) give higher resolution but may dilute the hit count per bin

3. **Amplification**: Use amplification to make subtle patterns more visible

4. **Composite Detectors**: Use these to see the combined effect of multiple detectors

5. **Draggable Centers**: Adjust detector centers to align with features of interest

Remember: The bin system is essentially a histogram along the vertical axis of each detector, counting ray intersections and visualizing their distribution.