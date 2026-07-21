import { useState, useRef, useEffect } from 'react';
import { Target } from 'lucide-react';
import { usePinValue } from '../../hooks/usePinValue';
import type { Datastream } from '../../types';

interface Props {
  projectId: string;
  datastream: Datastream;
  editMode?: boolean;
}

export default function TriggerWidget({ projectId, datastream, editMode }: Props) {
  const { write } = usePinValue(projectId, datastream.pin);
  const [isTriggering, setIsTriggering] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleTrigger = () => {
    if (editMode || isTriggering) return;
    
    setIsTriggering(true);
    write(1); // Send high pulse

    // Automatically send low pulse after 200ms
    timerRef.current = setTimeout(() => {
      write(0);
      setIsTriggering(false);
    }, 200);
  };

  return (
    <div 
      className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-3 sm:p-4 md:p-5 flex flex-col justify-between h-full select-none"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 md:gap-2">
          <Target className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isTriggering ? 'text-[var(--theme-primary)]' : 'text-[#606060]'}`} />
          <span className="text-[10px] md:text-[11px] text-[#a0a0a0] uppercase tracking-widest font-medium line-clamp-1">
            {datastream.name}
          </span>
        </div>
        <span className="hidden sm:inline text-[9px] md:text-[10px] font-mono text-[#3a3a3a]">{datastream.pin}</span>
      </div>

      <div className="flex-1 flex items-center justify-center mt-2">
        <button
          onClick={handleTrigger}
          disabled={editMode || isTriggering}
          className={`
            relative w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center
            transition-all duration-100 outline-none
            ${editMode ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
            ${isTriggering 
              ? 'bg-[var(--theme-primary)]/20 scale-90 shadow-[inset_0_4px_15px_rgba(0,0,0,0.5)]' 
              : 'bg-[#2a2a2a] shadow-[0_8px_20px_rgba(0,0,0,0.3)] hover:bg-[#333] hover:shadow-[0_12px_25px_rgba(0,0,0,0.4)] hover:-translate-y-1'
            }
          `}
        >
          {/* Inner ring */}
          <div className={`
            absolute inset-2 md:inset-3 rounded-full border-2 transition-colors duration-100
            ${isTriggering ? 'border-[var(--theme-primary)]/50' : 'border-[#404040]'}
          `} />
          
          <span className={`
            font-bold tracking-wider uppercase transition-colors duration-100
            text-[14px] md:text-[16px]
            ${isTriggering ? 'text-[var(--theme-primary)] drop-shadow-[0_0_8px_var(--theme-primary)]' : 'text-[#808080]'}
          `}>
            {isTriggering ? 'Fired' : 'Trigger'}
          </span>
        </button>
      </div>
    </div>
  );
}
