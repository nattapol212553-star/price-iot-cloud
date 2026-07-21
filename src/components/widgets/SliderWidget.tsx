import { useState, useEffect } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { usePinValue } from '../../hooks/usePinValue';
import type { Datastream } from '../../types';

interface Props {
  projectId: string;
  datastream: Datastream;
  editMode?: boolean;
}

export default function SliderWidget({ projectId, datastream, editMode }: Props) {
  const { value, write } = usePinValue(projectId, datastream.pin);
  const [localValue, setLocalValue] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);

  const min = datastream.min ?? 0;
  const max = datastream.max ?? 100;
  const step = datastream.step ?? 1;

  useEffect(() => {
    if (!isDragging && value !== undefined && value !== null) {
      setLocalValue(Number(value));
    }
  }, [value, isDragging]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editMode) return;
    setLocalValue(Number(e.target.value));
  };

  const handlePointerDown = () => {
    if (editMode) return;
    setIsDragging(true);
  };

  const handlePointerUp = () => {
    if (editMode) return;
    setIsDragging(false);
    write(localValue);
  };

  return (
    <div className="card-hover bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-3 sm:p-4 md:p-5 flex flex-col justify-between h-full select-none relative group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 md:gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#606060] group-hover:text-[var(--theme-primary)] transition-colors" />
          <span className="text-[10px] md:text-[11px] text-[#a0a0a0] uppercase tracking-widest font-medium line-clamp-1">
            {datastream.name}
          </span>
        </div>
        <span className="hidden sm:inline text-[9px] md:text-[10px] font-mono text-[#3a3a3a]">{datastream.pin}</span>
      </div>

      <div className="flex-1 flex flex-col justify-center mt-3">
        <div className="flex justify-between items-end mb-2">
          <span className="text-[24px] md:text-[32px] font-bold text-white leading-none tracking-tight">
            {localValue}
            <span className="text-[12px] md:text-[14px] text-[#606060] ml-1 font-normal tracking-normal">{datastream.units || ''}</span>
          </span>
        </div>
        
        <div className="relative w-full h-10 flex items-center">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={localValue}
            onChange={handleChange}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            disabled={editMode}
            className={`w-full h-1.5 bg-[#2a2a2a] rounded-lg appearance-none accent-[var(--theme-primary)] outline-none transition-all ${
              editMode ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            }`}
            style={{
              background: `linear-gradient(to right, var(--theme-primary) ${((localValue - min) / (max - min)) * 100}%, #2a2a2a ${((localValue - min) / (max - min)) * 100}%)`
            }}
          />
        </div>

        <div className="flex justify-between mt-0.5">
          <span className="text-[10px] text-[#505050] font-mono">{min}</span>
          <span className="text-[10px] text-[#505050] font-mono">{max}</span>
        </div>
      </div>
    </div>
  );
}
