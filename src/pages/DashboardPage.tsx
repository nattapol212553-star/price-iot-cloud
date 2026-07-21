import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, LayoutDashboard, WifiOff, Leaf, ExternalLink, Activity } from 'lucide-react';
// @ts-ignore
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import 'react-grid-layout/css/styles.css';

import { useWidgets } from '../hooks/useWidgets';
import { useDatastreams } from '../hooks/useDatastreams';
import { useDeviceStatus } from '../hooks/useDeviceStatus';
import { useProjectSettings } from '../hooks/useProjectSettings';
import WidgetRenderer from '../components/widgets/WidgetRenderer';
import ConfirmModal from '../components/modals/ConfirmModal';
import { GRID_COLS, GRID_BREAKPOINTS, GRID_ROW_HEIGHT, buildGridLayout, buildMobileLayout } from '../utils/dashboardGrid';

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function DashboardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  // Rules of Hooks: ALL hooks must be called unconditionally before any early return.
  const pid = projectId ?? '';
  const { widgets, loading: wLoading } = useWidgets(pid);
  const { datastreams, loading: dsLoading } = useDatastreams(pid);
  const isOnline = useDeviceStatus(pid);
  const { settings, loading: sLoading, updateEcoMode, updateGraphMode } = useProjectSettings(pid);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const toggleEcoMode = async () => {
    if (!isOnline || sLoading) return;
    
    // If turning ON from Dashboard, redirect to Datastreams page.
    if (!settings.ecoMode) {
      navigate(`/project/${pid}/datastreams`);
      return;
    }

    // Turning OFF requires confirmation
    setConfirmOpen(true);
  };

  const toggleGraphMode = async () => {
    if (sLoading) return;
    try {
      // If undefined, default is true. So toggle to false.
      const isContinuous = settings.graphContinuous ?? true;
      await updateGraphMode(!isContinuous);
    } catch (e) {
      console.error(e);
    }
  };

  const loading = wLoading || dsLoading || sLoading;

  const layout = useMemo(() => buildGridLayout(widgets), [widgets]);
  const mobileLayout = useMemo(() => buildMobileLayout(widgets), [widgets]);

  // Guard AFTER all hooks
  if (!projectId) {
    return <div className="p-6 text-[#606060]">Invalid project URL.</div>;
  }

  if (loading) {
    return <div className="p-6 text-white">Loading dashboard...</div>;
  }

  const isContinuous = settings.graphContinuous ?? true;

  return (
    <div className="h-full flex flex-col bg-[#121212]">
      {/* Header */}
      <div className="px-6 py-3 border-b border-[#2a2a2a] flex items-center justify-between shrink-0 bg-[#1e1e1e]">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-4 h-4 text-[var(--theme-primary)]" />
          <span className="text-[14px] font-semibold text-white">Dashboard</span>
          <span className="text-[12px] text-[#606060] ml-1 mr-4">· {widgets.length} widgets</span>
          {!isOnline && (
            <span className="flex items-center gap-1 text-[11px] text-[#ff4d4d]">
              <WifiOff className="w-3.5 h-3.5" /> Device offline
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Graph Display Mode Toggle */}
          {!sLoading && (
            <button
              onClick={toggleGraphMode}
              title={isContinuous ? 'Switch to Raw Mode' : 'Switch to Continuous Mode'}
              className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] font-bold tracking-wide transition-all ${
                isContinuous
                  ? 'bg-[#34D399]/10 border-[#34D399]/30 text-[#34D399] hover:bg-[#34D399]/20'
                  : 'bg-transparent border-[#2a2a2a] text-[#a0a0a0] hover:text-white hover:border-[#3a3a3a]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              {isContinuous ? 'GRAPH: CONTINUOUS' : 'GRAPH: RAW'}
            </button>
          )}

          {/* Eco Mode Toggle */}
          {!sLoading && (
            <button
              onClick={toggleEcoMode}
              disabled={!isOnline || sLoading}
              title={!isOnline ? 'Device is offline' : settings.ecoMode ? 'Turn off Eco Mode' : 'Go to Datastreams to enable Eco Mode'}
              className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] font-bold tracking-wide transition-all ${
                !isOnline
                  ? 'bg-transparent border-[#2a2a2a] text-[#4a4a4a] cursor-not-allowed'
                  : settings.ecoMode
                    ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981]/20 glow-btn'
                    : 'bg-transparent border-[#2a2a2a] text-[#606060] hover:text-[#a0a0a0] hover:border-[#3a3a3a]'
              }`}
            >
              <Leaf className="w-3.5 h-3.5" />
              {settings.ecoMode 
                ? 'ECO ON' 
                : <><ExternalLink className="w-3 h-3" /> ECO OFF</>
              }
            </button>
          )}

          <button onClick={() => navigate(`/project/${pid}/dashboard/edit`)}
            className="hidden md:flex items-center gap-2 px-4 py-1.5 border border-[#2a2a2a] text-[12px] font-medium text-[#a0a0a0] rounded-lg hover:text-white hover:border-[#3a3a3a] transition-all">
            <Pencil className="w-3.5 h-3.5" />Edit Dashboard
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto p-6 dot-grid">
        {widgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 gap-4 text-[#606060]">
            <LayoutDashboard className="w-10 h-10 text-[#2a2a2a]" />
            <p className="text-sm">No widgets yet.</p>
            <button onClick={() => navigate(`/project/${pid}/dashboard/edit`)}
              className="px-4 py-2 bg-[var(--theme-primary)] text-black text-sm font-bold rounded-lg hover:brightness-110 transition-all glow-btn">
              Edit Dashboard
            </button>
          </div>
        ) : (
          <ResponsiveGridLayout
            className="layout"
            layouts={{ lg: layout, md: layout, sm: mobileLayout }}
            breakpoints={GRID_BREAKPOINTS}
            cols={GRID_COLS}
            rowHeight={GRID_ROW_HEIGHT}
            margin={[24, 24]}
            compactType={null}
            isDraggable={false}
            isResizable={false}
          >
            {widgets.map((w) => (
              <div key={w.id}>
                <WidgetRenderer 
                  projectId={pid} 
                  widget={w} 
                  datastreams={datastreams} 
                  offline={!isOnline} 
                />
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="ปิดระบบ ECO Mode?"
        message="การปิด ECO Mode จะทำให้เซ็นเซอร์กลับมาส่งข้อมูลตลอดเวลา ซึ่งอาจใช้โควต้า Firebase มากขึ้น คุณต้องการดำเนินการต่อหรือไม่?"
        confirmText="ปิด ECO Mode"
        cancelText="ยกเลิก"
        danger={true}
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          try {
            await updateEcoMode(false);
          } catch (e) {
            console.error(e);
          }
        }}
      />
    </div>
  );
}
