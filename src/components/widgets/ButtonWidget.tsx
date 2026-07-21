import { useState, useRef, useEffect } from 'react';
import { CircleDot } from 'lucide-react';
import { usePinValue } from '../../hooks/usePinValue';
import type { Datastream } from '../../types';

interface Props {
  projectId: string;
  datastream: Datastream;
  editMode?: boolean;
}

export default function ButtonWidget({ projectId, datastream, editMode }: Props) {
  const { write } = usePinValue(projectId, datastream.pin);
  const [isPressed, setIsPressed] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-reset logic in case mouse up doesn't fire (e.g. mouse leaves window)
  useEffect(() => {
    if (isPressed) {
      pressTimer.current = setTimeout(() => {
        setIsPressed(false);
        write(0);
      }, 3000); // Failsafe reset after 3 seconds max pulse
    }
    return () => {
      if (pressTimer.current) clearTimeout(pressTimer.current);
    };
  }, [isPressed, write]);

  const handlePressDown = () => {
    if (editMode) return;
    setIsPressed(true);
    write(1); // Send pulse high
  };

  const handlePressUp = () => {
    if (editMode || !isPressed) return;
    setIsPressed(false);
    write(0); // Send pulse low
  };

  return (
    <div 
      className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-3 sm:p-4 md:p-5 flex flex-col justify-between h-full select-none"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 md:gap-2">
          <CircleDot className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isPressed ? 'text-[var(--theme-primary)]' : 'text-[#606060]'}`} />
          <span className="text-[10px] md:text-[11px] text-[#a0a0a0] uppercase tracking-widest font-medium line-clamp-1">
            {datastream.name}
          </span>
        </div>
        <span className="hidden sm:inline text-[9px] md:text-[10px] font-mono text-[#3a3a3a]">{datastream.pin}</span>
      </div>

      <div className="flex-1 flex items-center justify-center mt-2">
        <button
          onPointerDown={handlePressDown}
          onPointerUp={handlePressUp}
          onPointerLeave={handlePressUp}
          disabled={editMode}
          className={`
            relative w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center
            transition-all duration-150 ease-out outline-none
            ${editMode ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
            ${isPressed 
              ? 'bg-[var(--theme-primary)]/20 scale-95 shadow-[inset_0_4px_15px_rgba(0,0,0,0.5)]' 
              : 'bg-[#2a2a2a] shadow-[0_8px_20px_rgba(0,0,0,0.3)] hover:bg-[#333] hover:shadow-[0_12px_25px_rgba(0,0,0,0.4)] hover:-translate-y-1'
            }
          `}
        >
          {/* Inner ring */}
          <div className={`
            absolute inset-2 md:inset-3 rounded-full border-2 transition-colors duration-150
            ${isPressed ? 'border-[var(--theme-primary)]/50' : 'border-[#404040]'}
          `} />
          
          <span className={`
            font-bold tracking-wider uppercase transition-colors duration-150
            text-[14px] md:text-[16px]
            ${isPressed ? 'text-[var(--theme-primary)] drop-shadow-[0_0_8px_var(--theme-primary)]' : 'text-[#808080]'}
          `}>
            {isPressed ? 'Active' : 'Push'}
          </span>
        </button>
      </div>
    </div>
  );
}
