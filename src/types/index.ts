// ─── Project ────────────────────────────────────────────────────────────────
export interface Project {
  id: string;
  name: string;
  description: string;
  board: 'ESP32' | 'ESP8266' | 'Arduino' | 'Raspberry Pi' | 'Other';
  deviceToken: string;
  status?: string;
  lastSeen?: number;
  createdAt: number;
  theme?: string; // theme id from THEMES config
}

// ─── Datastream ──────────────────────────────────────────────────────────────
export type DataType = 'Integer' | 'Double' | 'String' | 'Enum' | 'Boolean';

export const SEMANTICS_OPTIONS = [
  'Custom', 'Temperature', 'Humidity', 'Pressure', 'Light', 'Soil Moisture',
  'Voltage', 'Current', 'Power', 'Speed', 'Distance', 'CO2', 'pH',
  'Time', 'Date', 'Status', 'Count', 'Color',
];

export const BOARD_OPTIONS = ['ESP32', 'ESP8266', 'Arduino', 'Raspberry Pi', 'Other'];

export const UNITS_BY_SEMANTICS: Record<string, string> = {
  Temperature: '°C', Humidity: '%', Pressure: 'hPa', Light: 'lux',
  'Soil Moisture': '%', Voltage: 'V', Current: 'A', Power: 'W',
  Speed: 'km/h', Distance: 'cm', CO2: 'ppm', pH: '',
  Time: '', Date: '', Status: '', Count: '', Color: '', Custom: '',
};

export interface Datastream {
  id: string;
  pin: string;       // 'V0' – 'V255'
  name: string;
  dataType: DataType;
  semantics: string;
  min?: number;
  max?: number;
  step?: number;
  units?: string;
  createdAt: number;
}

// ─── Widget ──────────────────────────────────────────────────────────────────
export type WidgetType = 'switch' | 'led' | 'gauge' | 'chart' | 'multichart' | 'label' | 'slider' | 'number_input' | 'button' | 'trigger' | 'camera';

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  datastreamId?: string;      // single-stream widgets
  datastreamIds?: string[];   // multichart
  config?: {
    color?: string;
    showHistory?: boolean;
    [key: string]: unknown;
  };
  streamUrl?: string; // For camera widget
  order?: number;   // legacy 1D ordering, kept for back-compat / view-mode fallback
  colSpan?: number; // legacy, kept for back-compat with DashboardPage's static grid
  // ── 2D grid layout (react-grid-layout) ──
  // Grid positioning (all or none should be set)
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  createdAt: number;
}

// ─── History ─────────────────────────────────────────────────────────────────
export interface HistoryPoint {
  value: number | string;
  timestamp: number;
}
