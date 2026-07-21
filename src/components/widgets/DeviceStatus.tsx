import { useDeviceStatus } from '../../hooks/useDeviceStatus';

interface Props {
  projectId: string;
}

export default function DeviceStatus({ projectId }: Props) {
  const isOnline = useDeviceStatus(projectId);

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#121212] border border-[#2a2a2a] mr-4 shadow-inner">
      <div className="relative flex items-center justify-center w-2.5 h-2.5">
        {isOnline && <div className="absolute inset-0 bg-[var(--theme-primary)] rounded-full animate-ping opacity-75"></div>}
        <div className={`relative w-2 h-2 rounded-full ${isOnline ? 'bg-[var(--theme-primary)] shadow-[0_0_8px_rgba(46,214,137,0.8)]' : 'bg-[#ff4d4d]'}`}></div>
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-wider ${isOnline ? 'text-[var(--theme-primary)]' : 'text-[#ff4d4d]'}`}>
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}
