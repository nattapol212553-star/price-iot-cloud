import type { LayoutItem } from 'react-grid-layout';
import type { Widget, WidgetType } from '../types';

// Single source of truth for grid sizing, shared by DashboardEditPage
// (interactive) and DashboardPage (read-only). They used to each keep their
// own copy of this logic — the Edit page used react-grid-layout's x/y/w/h,
// while the view page used a completely different CSS-grid + `order` scheme
// that ignored x/y entirely. That divergence is what made dragging a widget
// in Edit mode "not stick" on the real dashboard. Both pages now build their
// layout from this one function.
export const GRID_COLS = { lg: 4, md: 2, sm: 2 };
export const GRID_BREAKPOINTS = { lg: 1200, md: 768, sm: 0 };
export const GRID_ROW_HEIGHT = 90;

export function defaultWidgetSize(type: WidgetType): { w: number; h: number } {
  return type === 'chart' || type === 'multichart' || type === 'camera' ? { w: 2, h: 3 } : { w: 1, h: 2 };
}

// Turns a widget list into a react-grid-layout Layout[]. Widgets that
// already have a saved x/y/w/h use it as-is. Widgets that don't (e.g.
// migrating from the old order/colSpan model, or brand new) get auto-flowed
// into a sensible position instead of crashing or overlapping.
export function buildGridLayout(widgets: Widget[]): LayoutItem[] {
  let cursorX = 0;
  let cursorY = 0;

  return widgets.map((w) => {
    const size = defaultWidgetSize(w.type);
    const hasSavedPosition = w.x != null && w.y != null && w.w != null && w.h != null;

    // M8 fix: perform the row-wrap check BEFORE computing `base` so that the
    // new cursorX/cursorY are already correct when `base` is constructed.
    if (!hasSavedPosition) {
      if (cursorX + size.w > GRID_COLS.lg) {
        cursorX = 0;
        cursorY += size.h;
      }
    }

    const base = hasSavedPosition
      ? { x: w.x as number, y: w.y as number, w: w.w as number, h: w.h as number }
      : { x: cursorX, y: cursorY, w: size.w, h: size.h };

    if (!hasSavedPosition) {
      cursorX += size.w;
    }

    return { i: w.id, ...base, minW: 1, minH: 2 };
  });
}

// Generates a 2-column layout for mobile breakpoints (sm)
// so widgets stack neatly instead of overlapping when compactType=null.
export function buildMobileLayout(widgets: Widget[]): LayoutItem[] {
  const TYPE_WEIGHT: Record<string, number> = {
    switch: 1,
    led: 2,
    gauge: 3,
    label: 4,
    multichart: 5,
    chart: 6,
  };

  // Sort widgets by type so they are grouped together nicely on mobile
  const sorted = [...widgets].sort((a, b) => {
    const weightA = TYPE_WEIGHT[a.type] ?? 99;
    const weightB = TYPE_WEIGHT[b.type] ?? 99;
    if (weightA !== weightB) return weightA - weightB;
    // If same type, fallback to desktop Y/X order
    const yA = a.y ?? 0;
    const yB = b.y ?? 0;
    if (yA !== yB) return yA - yB;
    return (a.x ?? 0) - (b.x ?? 0);
  });

  let cursorX = 0;
  let cursorY = 0;
  let currentMaxHeightInRow = 0;

  return sorted.map((w) => {
    const size = defaultWidgetSize(w.type);
    
    // On mobile, if a widget is w:2 on desktop, it stays w:2 (full width).
    // If it is w:1 on desktop, it stays w:1 (half width).
    // We must ensure w doesn't exceed mobile columns (2).
    const wWidth = Math.min(size.w, 2);
    const wHeight = size.h;

    // Check if it fits in the current row
    if (cursorX + wWidth > 2) {
      cursorX = 0;
      cursorY += currentMaxHeightInRow;
      currentMaxHeightInRow = 0;
    }

    const layout = {
      i: w.id,
      x: cursorX,
      y: cursorY,
      w: wWidth,
      h: wHeight,
      minW: 1,
      minH: 2
    };

    cursorX += wWidth;
    currentMaxHeightInRow = Math.max(currentMaxHeightInRow, wHeight);

    return layout;
  });
}
