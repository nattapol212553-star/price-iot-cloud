import { Zap, Lock } from 'lucide-react';
import { usePinValue } from '../../hooks/usePinValue';
import type { Datastream } from '../../types';

interface Props {
  projectId: string;
  datastream: Datastream;
  editMode?: boolean;
}

export default function SwitchWidget({ projectId, datastream, editMode }: Props) {
  const { value, write } = usePinValue(projectId, datastream.pin);
  const { value: lockedValue } = usePinValue(projectId, `lock_${datastream.pin}`);

  const isOn = value === 1 || value === '1' || value === 2 || value === '2';
  const isHardLocked = lockedValue === 1 || lockedValue === '1' || lockedValue === true;
  const isAuto = value === 2 || value === '2' || isHardLocked;
  const isLocked = editMode || isAuto;

  const toggle = () => {
    if (isLocked) return;
    write(isOn ? 0 : 1);
  };

  return (
    <div
      onClick={toggle}
      className={[
        'card-hover bg-[#1e1e1e] border rounded-xl p-3 sm:p-4 md:p-5 flex flex-col justify-between h-full select-none',
        !isLocked && 'cursor-pointer',
        isAuto ? 'opacity-60 grayscale' : '',
        isOn ? 'border-[var(--theme-primary)]/30' : 'border-[#2a2a2a]',
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 md:gap-2">
          <Zap className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isOn && !isAuto ? 'text-[var(--theme-primary)]' : 'text-[#606060]'}`} />
          <span className="text-[10px] md:text-[11px] text-[#a0a0a0] uppercase tracking-widest font-medium line-clamp-1">
            {datastream.name}
          </span>
        </div>
        <span className="hidden sm:inline text-[9px] md:text-[10px] font-mono text-[#3a3a3a]">{datastream.pin}</span>
      </div>

      {/* Track */}
      <div className="flex flex-col items-center justify-center flex-1">
        <div
          className={`relative w-14 h-7 md:w-20 md:h-10 rounded-full p-1 transition-colors duration-300 ${
            isOn && !isAuto ? 'bg-[var(--theme-primary)]' : 'bg-[#2a2a2a]'
          }`}
        >
          <div
            className={`w-5 h-5 md:w-8 md:h-8 rounded-full bg-white transition-transform duration-300 shadow-sm ${
              isOn && !isAuto ? 'translate-x-7 md:translate-x-10' : 'translate-x-0'
            }`}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-1 md:mt-2 border-t border-[#2a2a2a] pt-2 md:pt-3 gap-1">
        <span
          className={`flex items-center justify-center sm:justify-start gap-1 text-[9px] md:text-[10px] font-bold tracking-wider uppercase ${
            isOn && !isAuto ? 'text-[var(--theme-primary)]' : 'text-[#606060]'
          }`}
        >
          {isAuto && <Lock className="w-2.5 h-2.5 md:w-3 md:h-3" />}
          {isAuto ? 'Auto' : isOn ? 'On' : 'Off'}
        </span>
        <span className="hidden sm:block text-[9px] md:text-[10px] text-[#606060] truncate">
          {isAuto ? 'System' : 'Tap'}
        </span>
      </div>
    </div>
  );
}
