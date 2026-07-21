import { useState, useEffect } from 'react';
import { Trash2, LineChart, X, GripHorizontal, WifiOff } from 'lucide-react';
import SwitchWidget from './SwitchWidget';
import LEDWidget from './LEDWidget';
import GaugeWidget from './GaugeWidget';
import HistoryChartWidget from './HistoryChartWidget';
import MultiChartWidget from './MultiChartWidget';
import LabelWidget from './LabelWidget';
import SliderWidget from './SliderWidget';
import NumberInputWidget from './NumberInputWidget';
import ButtonWidget from './ButtonWidget';
import TriggerWidget from './TriggerWidget';
import CameraWidget from './CameraWidget';
import type { Widget, Datastream } from '../../types';

interface Props {
  projectId: string;
  widget: Widget;
  datastreams: Datastream[];
  editMode?: boolean;
  offline?: boolean; // true when the parent device (ESP32) hasn't checked in recently
  onDelete?: (id: string) => void;
  // H3 fix: properly type dragHandleProps as spread-able HTML div attributes
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export default function WidgetRenderer({
  projectId,
  widget,
  datastreams,
  editMode,
  offline,
  onDelete,
  dragHandleProps,
}: Props) {
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const ds = datastreams.find((d) => d.id === widget.datastreamId);
  const multiDs = (widget.datastreamIds ?? [])
    .map((id) => datastreams.find((d) => d.id === id))
    .filter(Boolean) as Datastream[];

  if (isMobile && (widget.type === 'chart' || widget.type === 'multichart')) {
    // If in edit mode on mobile, we might still want to show a placeholder so they can delete it?
    // But drag and drop on mobile isn't really supported anyway.
    if (!editMode) return null;
  }

  const renderWidget = () => {
    switch (widget.type) {
      case 'switch':
        return ds ? <SwitchWidget projectId={projectId} datastream={ds} editMode={editMode} /> : null;
      case 'led':
        return ds ? <LEDWidget projectId={projectId} datastream={ds} color={widget.config?.color as any} /> : null;
      case 'gauge':
        return ds ? <GaugeWidget projectId={projectId} datastream={ds} /> : null;
      case 'chart':
        if (!ds) return null;
        if (isMobile && !showMobileModal) return null; // Prevent background fetch on mobile
        return <HistoryChartWidget projectId={projectId} datastream={ds} />;
      case 'multichart':
        if (multiDs.length === 0) return null;
        if (isMobile && !showMobileModal) return null; // Prevent background fetch on mobile
        return <MultiChartWidget projectId={projectId} datastreams={multiDs} />;
      case 'label':
        return ds ? <LabelWidget projectId={projectId} datastream={ds} /> : null;
      case 'slider':
        return ds ? <SliderWidget projectId={projectId} datastream={ds} editMode={editMode} /> : null;
      case 'number_input':
        return ds ? <NumberInputWidget projectId={projectId} datastream={ds} editMode={editMode} /> : null;
      case 'button':
        return ds ? <ButtonWidget projectId={projectId} datastream={ds} editMode={editMode} /> : null;
      case 'trigger':
        return ds ? <TriggerWidget projectId={projectId} datastream={ds} editMode={editMode} /> : null;
      case 'camera':
        return <CameraWidget widget={widget} />;
      default:
        return null;
    }
  };

  let content = renderWidget();
  let isError = false;

  if (!content && widget.type !== 'camera') {
    isError = true;
    content = (
      <div className="bg-[#1e1e1e] border border-dashed border-[#3a3a3a] rounded-xl p-5 flex items-center justify-center text-[#606060] text-sm h-full w-full">
        Datastream not found
      </div>
    );
  }

  const isChart = !isError && (widget.type === 'chart' || widget.type === 'multichart');

  const wrappedContent = isChart ? (
    <>
      {/* Desktop View */}
      <div className="hidden md:block h-full w-full">{content}</div>

      {/* Mobile View - Button */}
      <div
        className="md:hidden bg-[#1e1e1e] rounded-xl p-4 flex items-center justify-between shadow-sm border border-[#2a2a2a] active:bg-[#2a2a2a] transition-colors cursor-pointer"
        onClick={() => setShowMobileModal(true)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--theme-secondary)]/10 flex items-center justify-center">
            <LineChart className="w-5 h-5 text-[var(--theme-secondary)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{widget.type === 'multichart' ? 'Multi-Sensor Chart' : 'History Chart'}</h3>
            <p className="text-[11px] text-[#808080]">Tap to view data</p>
          </div>
        </div>
        <div className="px-3 py-1.5 bg-[#2a2a2a] rounded-md text-[10px] font-medium text-white">View</div>
      </div>

      {/* Mobile Modal */}
      {showMobileModal && (
        <div className="fixed inset-0 z-50 bg-[#121212] flex flex-col md:hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a] pt-[max(env(safe-area-inset-top),16px)]">
            <h3 className="text-sm font-semibold text-white">{widget.type === 'multichart' ? 'Multi-Sensor Chart' : 'History Chart'}</h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMobileModal(false);
              }}
              className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center text-white active:bg-[#3a3a3a]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="min-h-[300px]">{content}</div>
          </div>
        </div>
      )}
    </>
  ) : (
    content
  );

  return (
    <div className="relative group h-full">
      {/* Offline dims the widget without unmounting it, so live data resumes
          instantly the moment the device reconnects. pointer-events-none
          blocks writes (switch taps etc.) while offline. */}
      <div
        className={[
          'h-full w-full transition-all duration-300',
          offline ? 'grayscale opacity-50 pointer-events-none' : '',
        ].join(' ')}
      >
        {wrappedContent}
      </div>

      {offline && !editMode && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-[10px] text-[#a0a0a0] z-10">
          <WifiOff className="w-3 h-3" /> Offline
        </div>
      )}

      {!editMode ? null : (
        <>
          {/* Edit overlay */}
          <div className="absolute inset-0 rounded-xl border-2 border-dashed border-[var(--theme-primary)]/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

          {/* Delete button */}
          <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(widget.id);
              }}
              className="w-7 h-7 bg-[#ff4d4d]/90 rounded-lg flex items-center justify-center hover:bg-[#ff4d4d] text-white"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Drag handle */}
          <div
            className="widget-drag-handle absolute top-2 left-1/2 -translate-x-1/2 w-12 h-6 flex items-center justify-center bg-[#1e1e1e]/80 rounded-full cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-all z-10 hover:bg-[#2a2a2a]"
            {...dragHandleProps}
          >
            <GripHorizontal className="w-4 h-4 text-[#808080]" />
          </div>
        </>
      )}
    </div>
  );
}
