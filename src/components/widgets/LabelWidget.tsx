import { Clock } from 'lucide-react';
import { usePinValue } from '../../hooks/usePinValue';
import type { Datastream } from '../../types';

interface Props {
  projectId: string;
  datastream: Datastream;
}

export default function LabelWidget({ projectId, datastream }: Props) {
  const { value } = usePinValue(projectId, datastream.pin);
  const display = value !== null && value !== undefined ? String(value) : '—';

  return (
    <div className="breathe-border bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-3 md:p-5 flex flex-col gap-2 md:gap-3 justify-between h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 md:gap-2">
          <Clock className="w-3 md:w-3.5 h-3 md:h-3.5 text-[#606060]" />
          <span className="text-[10px] md:text-[11px] text-[#a0a0a0] uppercase tracking-widest font-medium line-clamp-1">{datastream.name}</span>
        </div>
        <span className="hidden sm:inline text-[9px] md:text-[10px] font-mono text-[#3a3a3a]">{datastream.pin}</span>
      </div>
      <div className="h-px bg-[#2a2a2a]" />
      <p className="text-lg md:text-[22px] font-medium text-white tracking-wide leading-tight break-all flex-1 flex items-center"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {display}
      </p>
      {datastream.units && <span className="text-[9px] md:text-[11px] text-[#606060]">{datastream.units}</span>}
    </div>
  );
}
