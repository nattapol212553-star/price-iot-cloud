import { useState, useEffect, useMemo, useCallback } from 'react';
import { query, orderByKey, startAt, endAt } from 'firebase/database';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { subscribeToPath } from '../../firebase/cache';
import type { Datastream, HistoryPoint } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { useDeviceStatus } from '../../hooks/useDeviceStatus';
import { getPushIdStart, getPushIdEnd } from '../../utils/firebaseUtils';

interface Props {
  projectId: string;
  datastreams: Datastream[];
}

// Use chart-specific colors, avoiding duplication of theme vars
const EXTRA_COLORS = ['#F97316', '#F472B6', '#A78BFA', '#FBBF24', '#34D399', '#60A5FA'];

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1e1e1e] border border-[#3a3a3a] rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-[#a0a0a0] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-bold">{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(date: Date) {
  const today = new Date();
  const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  if (isToday) return 'Today';

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return 'Yesterday';

  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();
}

function useMultiHistory(projectId: string, pinsKey: string, targetDateTs: number) {
  const [data, setData] = useState<Record<string, HistoryPoint[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pins = pinsKey ? pinsKey.split(',').filter(Boolean) : [];

    if (!projectId || pins.length === 0) {
      setLoading(false);
      setData({});
      return;
    }
    setLoading(true);
    setData({}); // Clear old data when date/pins change

    const getTodayBounds = () => {
      const startOfDay = new Date(targetDateTs);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDateTs);
      endOfDay.setHours(23, 59, 59, 999);
      return { startTimestamp: startOfDay.getTime(), endTimestamp: endOfDay.getTime() };
    };

    const unsubs: (() => void)[] = [];

    pins.forEach(pin => {
      const path = `history/${projectId}/${pin}`;
      
      const unsub = subscribeToPath(
        path,
        (val) => {
          let list: HistoryPoint[] = [];
          if (val) {
            list = Object.values(val)
              .filter((d: any) => d && typeof d === 'object' && 'timestamp' in d)
              .map((d: any) => d as HistoryPoint);
          }
          list.sort((a, b) => a.timestamp - b.timestamp);

          // Sample down to ~100 points to prevent browser freeze when rendering large datasets
          const step = Math.max(1, Math.floor(list.length / 100));
          const sampledList = list.filter((_, i) => i % step === 0);
          const lastPoint = list[list.length - 1];
          if (lastPoint && sampledList.length > 0 && sampledList[sampledList.length - 1].timestamp !== lastPoint.timestamp) {
            sampledList.push(lastPoint);
          }

          setData(prev => ({ ...prev, [pin]: sampledList }));
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
        `${path}::${getTodayBounds().startTimestamp}`
      );
      unsubs.push(unsub);
    });

    return () => unsubs.forEach(u => u());
    // C1 fix: use a stable string key (joined pins) instead of JSON.stringify([...])
  }, [projectId, pinsKey, targetDateTs]);

  return { data, loading };
}

import { useProjectSettings } from '../../hooks/useProjectSettings';

export default function MultiChartWidget({ projectId, datastreams }: Props) {
  const { theme } = useTheme();
  const isOnline = useDeviceStatus(projectId);
  const { settings, loading: sLoading } = useProjectSettings(projectId);
  const isContinuous = settings.graphContinuous ?? true;
  
  const [selectedDate, setSelectedDate] = useState<number>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  });

  // C1 fix: stabilize pins into a single string key — avoids triggering the
  // effect on every render when datastreams array reference changes.
  const pinsKey = datastreams.map(d => d.pin).join(',');
  const { data: historyData, loading: hLoading } = useMultiHistory(projectId, pinsKey, selectedDate);
  const loading = hLoading || sLoading;

  // H1 fix: compare date components, not Date objects, to avoid time-of-day issues
  const isTodaySelected = useMemo(() => isSameDay(new Date(selectedDate), new Date()), [selectedDate]);

  const handlePrevDay = useCallback(() => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 1);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    });
  }, []);

  const handleNextDay = useCallback(() => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 1);
      d.setHours(0, 0, 0, 0);
      // Block navigation to any future day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return d.getTime() <= today.getTime() ? d.getTime() : prev;
    });
  }, []);

  // M2 fix: memoize the expensive chart data computation
  const chartData = useMemo(() => {
    const allTimestamps = Array.from(new Set(
      Object.values(historyData).flatMap(h => h.map(p => p.timestamp))
    )).sort((a, b) => a - b);

    if (allTimestamps.length === 0) return [];

    let finalTimestamps = [...allTimestamps];

    if (isContinuous && allTimestamps.length > 0) {
      finalTimestamps = [];
      // BUG FIX: Cap interpolated points to prevent runaway loops for large time gaps
      const MAX_POINTS = 1000;
      for (let i = 0; i < allTimestamps.length - 1; i++) {
        const curr = allTimestamps[i];
        const next = allTimestamps[i + 1];
        finalTimestamps.push(curr);
        let t = curr + 120000;
        while (t < next && finalTimestamps.length < MAX_POINTS) {
          finalTimestamps.push(t);
          t += 120000;
        }
      }
      
      const lastTs = allTimestamps[allTimestamps.length - 1];
      finalTimestamps.push(lastTs);

      // Forward fill up to "now" if viewing today and online
      if (isTodaySelected && isOnline) {
        let t = lastTs + 120000;
        const now = Date.now();
        while (t < now && finalTimestamps.length < MAX_POINTS) {
          finalTimestamps.push(t);
          t += 120000;
        }
        if (now - lastTs > 60000 && finalTimestamps[finalTimestamps.length - 1] !== now) {
          finalTimestamps.push(now);
        }
      }
    }

    // Relax sampling to allow more dots (up to 1000 points instead of 100)
    const step = Math.max(1, Math.floor(finalTimestamps.length / 1000));
    const sampledTimestamps = finalTimestamps.filter((_, i) => i % step === 0);
    const lastTs = finalTimestamps[finalTimestamps.length - 1];
    if (sampledTimestamps.length > 0 && sampledTimestamps[sampledTimestamps.length - 1] !== lastTs) {
      sampledTimestamps.push(lastTs);
    }

    const pins = pinsKey.split(',').filter(Boolean);
    const dsMap = new Map(datastreams.map(ds => [ds.pin, ds]));

    return sampledTimestamps.map(ts => {
      const entry: Record<string, number | string> = { time: formatTime(ts) };
      pins.forEach(pin => {
        const h = historyData[pin] ?? [];
        if (h.length === 0) return;
        
        let latestBefore: HistoryPoint | null = null;
        for (let i = h.length - 1; i >= 0; i--) {
          if (h[i].timestamp <= ts) {
            latestBefore = h[i];
            break;
          }
        }
        
        if (latestBefore) {
          const ds = dsMap.get(pin);
          const key = ds ? ds.pin : pin;
          entry[key] = typeof latestBefore.value === 'number' ? latestBefore.value : parseFloat(String(latestBefore.value)) || 0;
        }
      });
      return entry;
    });
  }, [historyData, pinsKey, isTodaySelected, isOnline, isContinuous, datastreams]);

  const getLineColor = (index: number) => {
    if (index === 0) return theme.primaryColor;
    if (index === 1) return theme.secondaryColor;
    return EXTRA_COLORS[(index - 2) % EXTRA_COLORS.length];
  };

  return (
    <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-5 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#a0a0a0] uppercase tracking-widest font-medium">History Trend</span>
        </div>

        {/* Day Picker */}
        <div className="flex items-center gap-3 bg-[#151515] border border-[#2a2a2a] rounded-lg px-2 py-1">
          <button
            onClick={handlePrevDay}
            className="p-1 hover:bg-[#2a2a2a] rounded-md transition-colors text-[#808080] hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 min-w-[80px] justify-center">
            <Calendar className="w-3.5 h-3.5" style={{ color: theme.secondaryColor }} />
            <span className="text-[11px] font-medium text-[#e0e0e0]">
              {formatDateLabel(new Date(selectedDate))}
            </span>
          </div>

          <button
            onClick={handleNextDay}
            disabled={isTodaySelected}
            className={`p-1 rounded-md transition-colors ${
              isTodaySelected
                ? 'text-[#333333] cursor-not-allowed'
                : 'text-[#808080] hover:bg-[#2a2a2a] hover:text-white'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="h-56">
        {loading ? (
          <div className="h-full flex items-center justify-center text-sm animate-pulse" style={{ color: theme.secondaryColor }}>
            Loading {formatDateLabel(new Date(selectedDate))}...
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#606060] text-sm">
            No data for {formatDateLabel(new Date(selectedDate))}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333333" vertical={false} />
              <XAxis dataKey="time" stroke="#A0A0A0" fontSize={10} tickLine={false} axisLine={false} minTickGap={30} />
              <YAxis stroke="#A0A0A0" fontSize={10} tickLine={false} axisLine={false} width={28} />
              <Tooltip content={DarkTooltip} />
              <Legend wrapperStyle={{ fontSize: 10, color: '#a0a0a0', paddingTop: '10px' }} />
              {datastreams.map((ds, i) => (
                <Line
                  key={ds.pin}
                  type="stepAfter"
                  dataKey={ds.pin}
                  name={ds.name}
                  stroke={getLineColor(i)}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  connectNulls={true}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
