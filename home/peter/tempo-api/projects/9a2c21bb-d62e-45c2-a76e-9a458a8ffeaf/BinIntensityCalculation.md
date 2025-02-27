# Understanding Bin Height and Ray Hit Calculations

## Basic Concepts

When a ray hits a detector line, we need to:
1. Determine which bin it belongs to
2. Calculate how that hit affects the bin's intensity
3. Visualize the intensity through color and height

### Step 1: Determining Bin Location

```javascript
// Example: If we have a detector line of length 288000 pixels (144000 each direction)
// and 360 bins, each bin represents 800 pixels of the line
const binWidth = totalLineLength / binCount;  // 288000 / 360 = 800 pixels per bin

// When a ray hits at position 2400 on the line:
const binIndex = Math.floor(2400 / 800);  // = 3 (fourth bin)
```

### Step 2: Accumulating Hits

Each bin keeps track of how many rays hit it:

```javascript
const bins = new Array(binCount).fill(0);  // Start with all bins at 0

// When a ray hits bin 3
bins[3]++;  // Increment the hit counter for that bin
```

### Intensity Calculation

The intensity of each bin is relative to the bin with the most hits:

```javascript
// Find the bin with the most hits
const maxHits = Math.max(...bins);

// Calculate intensity for each bin (0 to 1)
const intensities = bins.map(hits => hits / maxHits);
```

## Value Area Percentage

The "Value Area %" setting helps identify significant bins:

```javascript
// If Value Area % is set to 70
const valueAreaThreshold = maxHits * (70 / 100);

// A bin is considered significant if:
const isSignificant = binHits > valueAreaThreshold;
```

## Visualization

### Color Mapping

We map the intensity to a color scale:

```javascript
function getColorForIntensity(intensity) {
  // Convert intensity (0-1) to RGB
  const red = Math.round(intensity * 255);
  return `rgb(${red}, 0, 0)`;  // Brighter red = more hits
}
```

### Example Scenarios

1. **Single Ray Hit**
   ```javascript
   // One ray hits bin 5
   bins[5] = 1;
   maxHits = 1;
   intensity = 1;  // Full intensity for this bin
   ```

2. **Multiple Hits in Same Bin**
   ```javascript
   // Three rays hit bin 5
   bins[5] = 3;
   maxHits = 3;
   intensity = 1;  // Still full intensity
   ```

3. **Multiple Bins with Different Hits**
   ```javascript
   bins = [1, 3, 2, 4, 1];
   maxHits = 4;
   intensities = [0.25, 0.75, 0.5, 1, 0.25];
   ```

## Practical Example

Let's walk through a complete example:

```javascript
// Setup
const binCount = 360;
const lineLength = 288000;  // 144000 * 2
const bins = new Array(binCount).fill(0);
const binWidth = lineLength / binCount;

// Recording hits
function recordHit(position) {
  const binIndex = Math.floor(position / binWidth);
  if (binIndex >= 0 && binIndex < binCount) {
    bins[binIndex]++;
  }
}

// Some ray hits
recordHit(800);   // Hits bin 1
recordHit(850);   // Also hits bin 1
recordHit(1600);  // Hits bin 2

// Calculate intensities
const maxHits = Math.max(...bins);  // = 2 (bin 1 has 2 hits)
const intensities = bins.map(hits => hits / maxHits);
// intensities[1] = 1.0 (2/2)
// intensities[2] = 0.5 (1/2)
// other bins = 0
```

## Tips for Understanding

1. **Bin Width vs. Hit Count**
   - Bin width determines which hits go into which bins
   - Hit count determines the intensity of each bin
   - These are independent calculations

2. **Relative vs. Absolute Values**
   - Intensities are always relative to the maximum hits
   - A bin with 2 hits could be full intensity if it's the maximum
   - The same bin could be half intensity if another bin has 4 hits

3. **Value Area Percentage Effect**
   - Higher percentage = fewer bins shown as significant
   - Lower percentage = more subtle variations visible
   - Example: At 70%, only bins with >70% of max hits are highlighted

4. **Performance Considerations**
   - Bin calculations happen in real-time as rays hit
   - We store raw hit counts and calculate intensities when needed
   - This allows for dynamic updates to visualization settings

Remember: The bin system is essentially a histogram, counting hits in fixed-width segments of the detector line, then normalizing those counts for visualization.
