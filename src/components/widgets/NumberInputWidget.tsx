import { useState, useEffect, useRef } from 'react';
import { Type, Check } from 'lucide-react';
import { usePinValue } from '../../hooks/usePinValue';
import type { Datastream } from '../../types';

interface Props {
  projectId: string;
  datastream: Datastream;
  editMode?: boolean;
}

export default function NumberInputWidget({ projectId, datastream, editMode }: Props) {
  const { value, write } = usePinValue(projectId, datastream.pin);
  const [localValue, setLocalValue] = useState<string>('0');
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing && value !== undefined && value !== null) {
      setLocalValue(String(value));
    }
  }, [value, isEditing]);

  const handleSave = () => {
    if (editMode) return;
    const num = Number(localValue);
    if (!isNaN(num)) {
      write(num);
    } else {
      // Revert if invalid
      setLocalValue(String(value ?? 0));
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setLocalValue(String(value ?? 0));
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  const min = datastream.min ?? Number.MIN_SAFE_INTEGER;
  const max = datastream.max ?? Number.MAX_SAFE_INTEGER;
  const step = datastream.step ?? 'any';

  return (
    <div className="card-hover bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-3 sm:p-4 md:p-5 flex flex-col justify-between h-full select-none group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 md:gap-2">
          <Type className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#606060] group-hover:text-[var(--theme-primary)] transition-colors" />
          <span className="text-[10px] md:text-[11px] text-[#a0a0a0] uppercase tracking-widest font-medium line-clamp-1">
            {datastream.name}
          </span>
        </div>
        <span className="hidden sm:inline text-[9px] md:text-[10px] font-mono text-[#3a3a3a]">{datastream.pin}</span>
      </div>

      <div className="flex-1 flex flex-col justify-center mt-3 relative">
        {!isEditing ? (
          <div 
            className={`flex items-baseline cursor-text p-2 -mx-2 rounded-lg hover:bg-white/5 transition-colors ${editMode ? 'pointer-events-none' : ''}`}
            onClick={() => {
              if (editMode) return;
              setIsEditing(true);
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
          >
            <span className="text-[28px] md:text-[36px] font-bold text-white leading-none tracking-tight">
              {localValue}
            </span>
            {datastream.units && (
              <span className="text-[12px] md:text-[14px] text-[#606060] ml-2 font-normal">
                {datastream.units}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="number"
                min={min}
                max={max}
                step={step}
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSave}
                className="w-full bg-[#121212] border border-[var(--theme-primary)] rounded-lg px-3 py-2 text-[24px] font-bold text-white outline-none"
              />
              {datastream.units && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#606060] text-[12px]">
                  {datastream.units}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <button 
                onMouseDown={(e) => { e.preventDefault(); handleSave(); }}
                className="p-1.5 bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] hover:bg-[var(--theme-primary)] hover:text-black rounded-md transition-colors"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
