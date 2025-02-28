export interface Candle {
  time: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ChartDimensions {
  width: number;
  height: number;
  padding: number;
  chartWidth: number;
  chartHeight: number;
  originX: number;
  originY: number;
  controlPanelWidth: number;
}

export interface ChartRange {
  min: number;
  max: number;
}

export interface ChartOffset {
  x: number;
  y: number;
}

export interface ChartColors {
  upColor: string;
  downColor: string;
  backgroundColor: string;
  axisColor: string;
  xSkew?: number;
  ySkew?: number;
  chartWidthPercent?: number;
  chartHeightPercent?: number;
}

export interface ChartConfig {
  candleWidth: number;
  candleGap: number;
  xAxisLabel: string;
  yAxisLabel: string;
  showTimeLines: boolean;
  chartWidthPercent?: number;
  chartHeightPercent?: number;
  xSkew?: number;
  ySkew?: number;
}
