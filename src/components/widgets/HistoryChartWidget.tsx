import { useState, useEffect, useId } from 'react';
import { query, orderByKey, startAt, endAt } from 'firebase/database';
import { subscribeToPath } from '../../firebase/cache';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Datastream, HistoryPoint } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { getPushIdStart, getPushIdEnd } from '../../utils/firebaseUtils';

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

/** Compute today's start/end timestamps (midnight boundaries) */
function getTodayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { startTimestamp: start.getTime(), endTimestamp: end.getTime() };
}

function useHistory(projectId: string, pin: string) {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || !pin) { setLoading(false); return; }
    setLoading(true);
    setHistory([]);

    // KEY FIX: Use orderByKey with startAt/endAt using generated push IDs.
    // Firebase Push Keys are chronologically ordered by design.
    // This allows exact date queries without needing an index on 'timestamp'.
    const unsub = subscribeToPath(
      `history/${projectId}/${pin}`,
      (val) => {
        let list: HistoryPoint[] = [];
        if (val) {
          list = Object.values(val)
            .filter((d: any) => d && typeof d === 'object' && 'timestamp' in d)
            .map((d: any) => d as HistoryPoint);
        }
        list.sort((a, b) => a.timestamp - b.timestamp);

        // Sample down to ~100 points but always keep the last point
        const step = Math.max(1, Math.floor(list.length / 100));
        const sampledList = list.filter((_, i) => i % step === 0);
        const lastPoint = list[list.length - 1];
        if (lastPoint && sampledList.length > 0 && sampledList[sampledList.length - 1].timestamp !== lastPoint.timestamp) {
          sampledList.push(lastPoint);
        }
        setHistory(sampledList);
        setLoading(false);
      },
      (dbRef) => {
        const { startTimestamp, endTimestamp } = getTodayBounds();
        return query(
          dbRef, 
          orderByKey(), 
          startAt(getPushIdStart(startTimestamp)), 
          endAt(getPushIdEnd(endTimestamp))
        );
      },
      `history/${projectId}/${pin}::${getTodayBounds().startTimestamp}`
    );

    return () => unsub();
  }, [projectId, pin]);

  return { history, loading };
}

interface Props {
  projectId: string;
  datastream: Datastream;
}

import { useDeviceStatus } from '../../hooks/useDeviceStatus';
import { useProjectSettings } from '../../hooks/useProjectSettings';

export default function HistoryChartWidget({ projectId, datastream }: Props) {
  const { theme } = useTheme();
  const { history, loading: hLoading } = useHistory(projectId, datastream.pin);
  const isOnline = useDeviceStatus(projectId);
  const { settings, loading: sLoading } = useProjectSettings(projectId);
  const isContinuous = settings.graphContinuous ?? true;
  
  // H4 fix: React 18's useId() generates a unique ID per component instance,
  // preventing SVG gradient ID collisions when the same chart renders in
  // both desktop view and the mobile modal simultaneously.
  const uid = useId().replace(/:/g, '');
  const gradientId = `gradient-${uid}`;

  let chartData: { time: string; value: any }[] = [];

  if (isContinuous && history.length > 0) {
    // BUG FIX: Cap interpolated points to prevent runaway loops for large time gaps
    const MAX_INTERPOLATED_POINTS = 500;
    // Interpolate points every 2 minutes (120000 ms) for smooth tooltip hovering
    for (let i = 0; i < history.length - 1; i++) {
      const current = history[i];
      const next = history[i + 1];
      chartData.push({ time: formatTime(current.timestamp), value: current.value });

      let t = current.timestamp + 120000;
      while (t < next.timestamp && chartData.length < MAX_INTERPOLATED_POINTS) {
        chartData.push({ time: formatTime(t), value: current.value });
        t += 120000;
      }
    }
    
    // Add the very last point from DB
    const lastPoint = history[history.length - 1];
    chartData.push({ time: formatTime(lastPoint.timestamp), value: lastPoint.value });

    // Forward fill up to "now" if online
    if (isOnline) {
      let t = lastPoint.timestamp + 120000;
      const now = Date.now();
      while (t < now && chartData.length < MAX_INTERPOLATED_POINTS) {
        chartData.push({ time: formatTime(t), value: lastPoint.value });
        t += 120000;
      }
      
      // Ensure the very current moment is also drawn if it's far enough
      if (now - lastPoint.timestamp > 60000) {
        const nowStr = formatTime(now);
        if (chartData[chartData.length - 1].time !== nowStr) {
          chartData.push({ time: nowStr, value: lastPoint.value });
        }
      }
    }
  } else {
    // RAW Mode (original logic)
    chartData = history.map(p => ({
      time: formatTime(p.timestamp),
      value: p.value
    }));
  }

  const loading = hLoading || sLoading;

  const chartColor = theme.primaryColor;

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] rounded-xl border border-[#2a2a2a] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center justify-between bg-black/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: chartColor }} />
          <h3 className="text-sm font-semibold text-white">{datastream.name}</h3>
        </div>
        <span className="text-[10px] text-[#606060] font-medium">Today</span>
      </div>

      <div className="flex-1 p-4 min-h-0 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-[#606060]">
            Loading data...
          </div>
        ) : chartData.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-[#606060]">
            No data for today
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="#606060"
                fontSize={10}
                tickMargin={8}
                minTickGap={30}
              />
              <YAxis
                stroke="#606060"
                fontSize={10}
                tickFormatter={(val) => `${val}${datastream.units || ''}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e1e1e',
                  border: '1px solid #3a3a3a',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                itemStyle={{ color: chartColor }}
              />
              <Area
                type="stepAfter"
                dataKey="value"
                stroke={chartColor}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
