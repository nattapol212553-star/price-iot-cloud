import { useId } from 'react';
import { usePinValue } from '../../hooks/usePinValue';
import type { Datastream } from '../../types';

interface Props { projectId: string; datastream: Datastream; }

const R = 72; const CX = 100; const CY = 96;
const ARC_LEN = Math.PI * R;

function pol(deg: number) {
  const rad = ((deg - 180) * Math.PI) / 180;
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
}
function arc(start: number, end: number) {
  const s = pol(start); const e = pol(end);
  return `M ${s.x} ${s.y} A ${R} ${R} 0 ${end - start > 180 ? 1 : 0} 1 ${e.x} ${e.y}`;
}

function pickGradient(semantics: string) {
  if (semantics === 'Temperature') return [{ o: '0%', c: 'var(--theme-primary)' }, { o: '50%', c: '#FFD93D' }, { o: '100%', c: '#FF4D4D' }];
  if (semantics === 'Humidity' || semantics === 'Soil Moisture') return [{ o: '0%', c: 'var(--theme-primary)' }, { o: '100%', c: 'var(--theme-secondary)' }];
  if (semantics === 'Voltage' || semantics === 'Current') return [{ o: '0%', c: '#8B5CF6' }, { o: '100%', c: '#EC4899' }];
  return [{ o: '0%', c: 'var(--theme-primary)' }, { o: '100%', c: 'var(--theme-secondary)' }];
}

function pickColor(semantics: string) {
  if (semantics === 'Temperature') return '#FFD93D';
  if (semantics === 'Humidity' || semantics === 'Soil Moisture') return 'var(--theme-secondary)';
  if (semantics === 'Voltage' || semantics === 'Current') return '#8B5CF6';
  return 'var(--theme-primary)';
}

export default function GaugeWidget({ projectId, datastream }: Props) {
  const { value } = usePinValue(projectId, datastream.pin);
  const num = typeof value === 'number' ? value : (parseFloat(String(value)) || 0);
  const min = datastream.min ?? 0; const max = datastream.max ?? 100;
  const pct = max > min ? Math.min(Math.max((num - min) / (max - min), 0), 1) : 0;
  const dashLen = pct * ARC_LEN;
  const needleXY = pol(pct * 180);
  const uid = useId().replace(/:/g, '');
  const gradId = `g-${uid}`;
  const stops = pickGradient(datastream.semantics || '');
  // TODO: Make tick count dynamic if arc angle becomes configurable
  const ticks = Array.from({ length: 11 }, (_, i) => i * 18);

  return (
    <div className="card-hover bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-3 md:p-4 flex flex-col items-center justify-between h-full">
      <div className="flex items-center justify-between w-full mb-1">
        <span className="text-[10px] md:text-[11px] text-[#a0a0a0] uppercase tracking-widest font-medium line-clamp-1">{datastream.name}</span>
        <span className="hidden sm:inline text-[9px] md:text-[10px] font-mono text-[#3a3a3a]">{datastream.pin}</span>
      </div>
      <svg width="100%" height="100%" viewBox="0 0 200 120" className="w-full h-auto max-w-[200px] overflow-visible flex-1 mt-2">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            {stops.map(s => <stop key={s.o} offset={s.o} style={{ stopColor: s.c }} />)}
          </linearGradient>
        </defs>
        <path d={arc(0, 180)} fill="none" stroke="#2A2A2A" strokeWidth="10" strokeLinecap="round" />
        <path d={arc(0, 180)} fill="none" stroke={`url(#${gradId})`} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${ARC_LEN}`} strokeDashoffset={ARC_LEN - dashLen}
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.34,1.56,0.64,1)' }} />
        {ticks.map(a => {
          const ri = R - 14; const ro = R - 8;
          const rad = ((a - 180) * Math.PI) / 180;
          return <line key={a} x1={CX + ri * Math.cos(rad)} y1={CY + ri * Math.sin(rad)}
            x2={CX + ro * Math.cos(rad)} y2={CY + ro * Math.sin(rad)}
            stroke={a % 90 === 0 ? '#505050' : '#303030'} strokeWidth={a % 90 === 0 ? 2 : 1} strokeLinecap="round" />;
        })}
        <line x1={CX} y1={CY} x2={needleXY.x} y2={needleXY.y} stroke="white" strokeWidth="2" strokeLinecap="round"
          style={{ transition: 'x2 0.6s cubic-bezier(0.34,1.56,0.64,1), y2 0.6s cubic-bezier(0.34,1.56,0.64,1)' }} />
        <circle cx={CX} cy={CY} r="4" fill="white" /><circle cx={CX} cy={CY} r="2" fill="#121212" />
        <text x="20" y="116" fill="#606060" fontSize="9" textAnchor="middle">{min}</text>
        <text x="180" y="116" fill="#606060" fontSize="9" textAnchor="middle">{max}</text>
      </svg>
      <div className="relative flex items-baseline gap-1 mt-1">
        <span className="text-2xl md:text-3xl font-bold" style={{ color: pickColor(datastream.semantics || '') }}>{num.toFixed(1)}</span>
        {datastream.units && <span className="text-xs md:text-sm text-[#a0a0a0]">{datastream.units}</span>}
      </div>
    </div>
  );
}
