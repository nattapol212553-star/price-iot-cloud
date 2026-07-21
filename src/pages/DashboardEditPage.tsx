import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Check } from 'lucide-react';
// IMPORTANT: react-grid-layout ships its own TypeScript types since v1.4.
// If you have `@types/react-grid-layout` installed, remove it —
// having both is what causes the "cannot find WidthProvider" TS error.
//   npm uninstall @types/react-grid-layout
// @ts-ignore
import { Responsive, WidthProvider } from 'react-grid-layout/legacy';
import type { Layout, LayoutItem } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { useWidgets } from '../hooks/useWidgets';
import { useDatastreams } from '../hooks/useDatastreams';
import WidgetRenderer from '../components/widgets/WidgetRenderer';
import WidgetPickerModal from '../components/modals/WidgetPickerModal';
import type { WidgetType, Widget } from '../types';
import { GRID_COLS, GRID_BREAKPOINTS, GRID_ROW_HEIGHT, defaultWidgetSize, buildGridLayout, buildMobileLayout } from '../utils/dashboardGrid';

const ResponsiveGridLayout = WidthProvider(Responsive);

export default function DashboardEditPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = projectId!;
  const navigate = useNavigate();
  const { widgets, loading: wLoading, addWidget, updateWidget, deleteWidget } = useWidgets(pid);
  const { datastreams, loading: dsLoading } = useDatastreams(pid);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [items, setItems] = useState<Widget[]>([]);
  const [layout, setLayout] = useState<LayoutItem[]>([]);
  const [mobileLayout, setMobileLayout] = useState<LayoutItem[]>([]);
  // BUG FIX: replaced hasInitialized ref with a loading-aware init flag.
  // The old pattern (hasInitialized.current = true on first non-empty widgets)
  // had two problems:
  //   1. Empty dashboards (widgets.length === 0) never initialized, so the
  //      first Add Widget was invisible until re-entering the page.
  //   2. The flag was never reset, so Add/Delete changes coming back from
  //      Firebase were ignored — items stayed stale.
  // New approach: sync items/layout from Firebase only once (on initial load),
  // then keep local state as source-of-truth. Add/Delete immediately update
  // local state so the UI reflects changes without a round-trip.
  const didInit = useRef(false);

  useEffect(() => {
    if (wLoading) return;        // wait until Firebase data has arrived
    if (didInit.current) return; // only run once
    didInit.current = true;
    setItems(widgets);
    setLayout(buildGridLayout(widgets));
    setMobileLayout(buildMobileLayout(widgets));
  }, [wLoading, widgets]);

  const handleLayoutChange = useCallback((currentLayout: Layout, allLayouts: Partial<Record<string, Layout>>) => {
    // Save lg layout to prevent mobile 1-column layout from overwriting the desktop design.
    if (allLayouts.lg) {
      setLayout([...allLayouts.lg]);
    } else {
      setLayout([...currentLayout]);
    }
  }, []);

  // NOTE (Bug H3): handleAdd captures layout and items from the outer scope via closure.
  // If this function were memoized with useCallback, layout and items would need to be
  // in its dependency array to avoid stale closure. Currently it is not memoized, so it
  // always captures the latest values — no stale closure risk.
  const handleAdd = async (widget: {
    type: WidgetType;
    title: string;
    datastreamId?: string;
    datastreamIds?: string[];
    streamUrl?: string;
  }) => {
    const size = defaultWidgetSize(widget.type);
    const bottomY = layout.reduce((max, l) => Math.max(max, l.y + l.h), 0);
    const newWidget: Omit<Widget, 'id' | 'createdAt'> = {
      ...widget,
      order: items.length,
      x: 0,
      y: bottomY,
      w: size.w,
      h: size.h,
    };
    try {
      // BUG FIX: addWidget (Firebase push) returns a DatabaseReference whose
      // .key is the new push-ID. We use that to build the full Widget object
      // and update local state immediately — no need to wait for the onValue
      // callback to round-trip through Firebase.
      const ref = await addWidget(newWidget);
      if (ref?.key) {
        const added: Widget = { ...newWidget, id: ref.key, createdAt: Date.now() };
        const newItems = [...items, added];
        const newLayout = buildGridLayout(newItems);
        const newMobileLayout = buildMobileLayout(newItems);
        setItems(newItems);
        setLayout(newLayout);
        setMobileLayout(newMobileLayout);
      }
    } catch (err) {
      console.error('Add widget failed:', err);
    }
  };

  // BUG FIX: wrap deleteWidget so local state (items + layout) is updated
  // immediately after the Firebase delete succeeds. Previously onDelete was
  // wired directly to deleteWidget, meaning:
  //   • items kept the deleted widget → it stayed visible on-screen
  //   • layout kept the deleted widget's entry → handleSave would call
  //     updateWidget(deletedId, …) which re-created a "ghost" widget in DB
  const handleDelete = async (id: string) => {
    try {
      await deleteWidget(id);
      setItems(prev => prev.filter(w => w.id !== id));
      setLayout(prev => prev.filter(l => l.i !== id));
      setMobileLayout(prev => prev.filter(l => l.i !== id));
    } catch (err) {
      console.error('Delete widget failed:', err);
    }
  };

  const handleSave = async () => {
    try {
      const sorted = [...layout].sort((a, b) => a.y - b.y || a.x - b.x);
      const promises = sorted.map((l, index) =>
        updateWidget(l.i, { x: l.x, y: l.y, w: l.w, h: l.h, order: index })
      );
      await Promise.all(promises);
      navigate(`/project/${pid}/dashboard`);
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const loading = wLoading || dsLoading;

  return (
    <div className="h-full flex flex-col bg-[#121212]">
      {/* Header */}
      <div className="px-6 py-3 border-b border-[#2a2a2a] flex items-center justify-between shrink-0 bg-[#1e1e1e]">
        <div className="flex items-center gap-3">
          <span className="text-[14px] font-semibold text-white">Dashboard</span>
          <span className="text-[12px] text-[#606060] ml-1 mr-4">· Edit Mode</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPickerOpen(true)}
            className="flex items-center gap-2 px-4 py-1.5 bg-[#2a2a2a] text-white text-[12px] font-medium rounded-lg hover:bg-[#3a3a3a] transition-all"
          >
            <Plus className="w-3.5 h-3.5" />Add Widget
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-1.5 bg-[var(--theme-primary)] text-black text-[12px] font-bold rounded-lg hover:brightness-110 transition-all glow-btn"
          >
            <Check className="w-3.5 h-3.5" />Save & Exit
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        className="flex-1 overflow-auto p-6"
        style={{
          background: '#121212',
          backgroundImage: 'radial-gradient(circle, var(--theme-primary)20 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-40 text-[#606060]">Loading…</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 gap-4 border-2 border-dashed border-[#2a2a2a] rounded-2xl text-[#606060]">
            <Plus className="w-8 h-8 text-[#2a2a2a]" />
            <p className="text-sm">Click "Add Widget" to start building your dashboard</p>
          </div>
        ) : (
          <ResponsiveGridLayout
            className="layout"
            layouts={{ lg: layout, md: layout, sm: mobileLayout }}
            breakpoints={GRID_BREAKPOINTS}
            cols={GRID_COLS}
            rowHeight={GRID_ROW_HEIGHT}
            margin={[24, 24]}
            onLayoutChange={handleLayoutChange}
            draggableHandle=".widget-drag-handle"
            compactType={null}
            preventCollision={true}
          >
            {items.map((w) => (
              <div key={w.id}>
                <WidgetRenderer
                  projectId={pid}
                  widget={w}
                  datastreams={datastreams}
                  editMode
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </div>

      <WidgetPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        datastreams={datastreams}
        onAdd={handleAdd}
      />
    </div>
  );
}
