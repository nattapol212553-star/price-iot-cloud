import { useState } from 'react';
import { Video, WifiOff } from 'lucide-react';
import type { Widget } from '../../types';

interface Props {
  widget: Widget;
}

export default function CameraWidget({ widget }: Props) {
  const [error, setError] = useState(false);
  
  // If no streamUrl is provided, it's an error.
  if (!widget.streamUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-[#121212] rounded-2xl border border-[#2a2a2a] text-[#606060]">
        <Video className="w-8 h-8 mb-2 opacity-50" />
        <span className="text-xs font-semibold">No Stream URL</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#1e1e1e] rounded-2xl border border-[#2a2a2a] overflow-hidden shadow-sm relative group">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[#2a2a2a] flex items-center justify-between shrink-0 bg-[#1e1e1e]/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2">
          <Video className="w-3.5 h-3.5 text-[#a0a0a0]" />
          <span className="text-[11px] font-semibold text-[#a0a0a0] uppercase tracking-wider truncate">
            {widget.title}
          </span>
        </div>
        {!error && (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-[9px] font-bold text-red-500 tracking-wider">LIVE</span>
          </div>
        )}
      </div>

      {/* Video Container */}
      <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center justify-center text-[#606060]">
            <WifiOff className="w-8 h-8 mb-2 opacity-50" />
            <span className="text-xs font-medium">Stream Offline</span>
            <span className="text-[10px] mt-1 opacity-70 px-4 text-center truncate w-full max-w-xs">{widget.streamUrl}</span>
          </div>
        ) : (
          <img 
            src={widget.streamUrl} 
            alt={widget.title}
            className="w-full h-full object-cover"
            onError={() => setError(true)}
            onLoad={() => setError(false)}
          />
        )}
      </div>
    </div>
  );
}
