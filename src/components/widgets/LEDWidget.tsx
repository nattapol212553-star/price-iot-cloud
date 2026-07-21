import { usePinValue } from '../../hooks/usePinValue';
import type { Datastream } from '../../types';

interface Props {
  projectId: string;
  datastream: Datastream;
  color?: 'red' | 'green' | 'blue' | 'yellow';
}

// Each state's FULL class string is defined up front — never concatenated
// piecemeal at render time. That was the source of the "old color glow
// lingers" bug: when isOn flipped quickly, React sometimes reused the DOM
// node and merged transition classes from the previous color/state before
// the browser had committed the paint for the old one.
const STATES = {
  red: {
    on: 'bg-[#ff4d4d] glow-red led-active',
    off: 'bg-[#2a2a2a]',
    ring: 'ring-[#ff4d4d]/30',
    label: 'text-[#ff4d4d]',
  },
  green: {
    on: 'bg-[var(--theme-primary)] glow-green led-active',
    off: 'bg-[#2a2a2a]',
    ring: 'ring-[var(--theme-primary)]/30',
    label: 'text-[var(--theme-primary)]',
  },
  blue: {
    on: 'bg-[var(--theme-secondary)] led-active',
    off: 'bg-[#2a2a2a]',
    ring: 'ring-[var(--theme-secondary)]/30',
    label: 'text-[var(--theme-secondary)]',
  },
  yellow: {
    on: 'bg-[#fbbf24] led-active',
    off: 'bg-[#2a2a2a]',
    ring: 'ring-[#fbbf24]/30',
    label: 'text-[#fbbf24]',
  },
} as const;

export default function LEDWidget({ projectId, datastream, color = 'green' }: Props) {
  const { value } = usePinValue(projectId, datastream.pin);
  const isOn = value === 1 || value === '1' || value === true;
  const c = STATES[color];

  return (
    <div className="card-hover bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-3 md:p-5 flex flex-col gap-2 md:gap-4 justify-between h-full">
      <div className="flex items-center justify-between">
        <span className="text-[10px] md:text-[11px] text-[#a0a0a0] uppercase tracking-widest font-medium line-clamp-1">
          {datastream.name}
        </span>
        <span className="hidden sm:inline text-[9px] md:text-[10px] font-mono text-[#3a3a3a]">{datastream.pin}</span>
      </div>

      <div className="flex flex-col items-center gap-2 md:gap-3 flex-1 justify-center">
        <div className="relative flex items-center justify-center">
          {/* Outer ring that fades in */}
          <div 
            className={`absolute w-12 h-12 md:w-16 md:h-16 rounded-full ring-4 ${c.ring} transition-opacity duration-500 ${isOn ? 'opacity-40' : 'opacity-0'}`} 
          />
          
          {/* Main LED Container (Always Dark Gray) */}
          <div className="w-8 h-8 md:w-11 md:h-11 rounded-full relative overflow-visible bg-[#2a2a2a] transition-all duration-500">
            {/* The colored LED that fades in (Opacity 0 -> 100) */}
            <div
              className={`absolute inset-0 rounded-full transition-all duration-500 ${isOn ? `opacity-100 ${c.on}` : 'opacity-0'}`}
            />
            {/* Glossy reflection on top */}
            <div
              style={{ background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.3) 0%, transparent 60%)' }}
              className="absolute inset-0 rounded-full"
            />
          </div>
        </div>
        <span className={`text-[9px] md:text-[10px] font-bold tracking-[0.18em] uppercase ${isOn ? c.label : 'text-[#606060]'}`}>
          {isOn ? 'ACTIVE' : 'INACTIVE'}
        </span>
      </div>
    </div>
  );
}
