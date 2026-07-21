import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Search, Leaf } from 'lucide-react';
import { useDatastreams } from '../hooks/useDatastreams';
import { usePinValue } from '../hooks/usePinValue';
import { useProjectSettings } from '../hooks/useProjectSettings';
import DatastreamDrawer from '../components/modals/DatastreamDrawer';
import EcoModeModal from '../components/modals/EcoModeModal';
import ConfirmModal from '../components/modals/ConfirmModal';
import type { Datastream, DataType } from '../types';

const TYPE_COLORS: Record<DataType, string> = {
  Integer: 'text-[var(--theme-secondary)] bg-[var(--theme-secondary)]/10',
  Double:  'text-[var(--theme-primary)] bg-[var(--theme-primary)]/10',
  String:  'text-[#F97316] bg-[#F97316]/10',
  Enum:    'text-[#A78BFA] bg-[#A78BFA]/10',
  Boolean: 'text-[#10B981] bg-[#10B981]/10',
};

const FILTERS: (DataType | 'All')[] = ['All', 'Boolean', 'Integer', 'Double', 'String', 'Enum'];

function LiveValue({ projectId, pin }: { projectId: string; pin: string }) {
  const { value } = usePinValue(projectId, pin);
  if (value === null) return <span className="text-[#3a3a3a]">—</span>;
  return <span className="text-white font-mono text-[12px]">{String(value)}</span>;
}

export default function DatastreamsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const pid = projectId!;
  const { datastreams, loading, createDatastream, updateDatastream, deleteDatastream } = useDatastreams(pid);
  const { settings, loading: settingsLoading, updateEcoMode, pingHandshake } = useProjectSettings(pid);

  const [filter, setFilter] = useState<DataType | 'All'>('All');
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Datastream | null>(null);
  const [ecoModalOpen, setEcoModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const visible = datastreams.filter(d =>
    (filter === 'All' || d.dataType === filter) &&
    (search === '' || d.name.toLowerCase().includes(search.toLowerCase()) || d.pin.toLowerCase().includes(search.toLowerCase()))
  );

  const openCreate = () => { setEditing(null); setDrawerOpen(true); };
  const openEdit = (ds: Datastream) => { setEditing(ds); setDrawerOpen(true); };

  const handleSave = async (data: Omit<Datastream, 'id' | 'createdAt'>) => {
    if (editing) {
      await updateDatastream(editing.id, data);
    } else {
      await createDatastream(data);
    }
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  return (
    <div className="h-full flex flex-col bg-[#121212]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-[17px] font-semibold text-white">Datastreams</h2>
            <p className="text-[12px] text-[#606060] mt-0.5">{datastreams.length} streams · {datastreams.filter(d => d.dataType === 'Integer' || d.dataType === 'Double').length} numeric</p>
          </div>
          
          <div className="h-8 w-[1px] bg-[#2a2a2a] mx-2"></div>
          
          <button
            onClick={async () => {
              if (settings.ecoMode) {
                setConfirmOpen(true);
              } else {
                setEcoModalOpen(true);
              }
            }}
            disabled={settingsLoading}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
              settings.ecoMode 
                ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981]/20' 
                : 'bg-transparent border-[#2a2a2a] text-[#a0a0a0] hover:text-white hover:border-[#3a3a3a]'
            }`}
          >
            <Leaf className="w-4 h-4" />
            <span className="text-[12px] font-bold tracking-wide">
              ECO MODE {settings.ecoMode ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-primary)] text-black text-[13px] font-bold rounded-lg hover:brightness-110 transition-all glow-btn">
          <Plus className="w-4 h-4" />New Datastream
        </button>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-[#2a2a2a] flex items-center justify-between gap-4 shrink-0">
        <div className="flex gap-1.5">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={['px-3 py-1 rounded-full text-[11px] font-medium transition-all duration-150',
                filter === f ? 'bg-[var(--theme-primary)]/15 text-[var(--theme-primary)] ring-1 ring-[var(--theme-primary)]/40' : 'text-[#606060] hover:text-[#a0a0a0] hover:bg-white/[0.04]'].join(' ')}>
              {f === 'All' ? `All ${datastreams.length}` : f}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#606060]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            className="pl-8 pr-3 py-1.5 bg-[#1e1e1e] border border-[#2a2a2a] rounded-lg text-[12px] text-white placeholder:text-[#606060] focus:outline-none focus:border-[var(--theme-primary)]/50 w-36 transition-colors" />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-[#606060]">Loading…</div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-[#606060]">
            <p>No datastreams yet.</p>
            <button onClick={openCreate} className="text-[var(--theme-primary)] text-sm hover:brightness-110">+ Create your first datastream</button>
          </div>
        ) : (
          <table className="w-full text-[13px] border-collapse">
            <thead className="sticky top-0 bg-[#121212] z-10">
              <tr>
                {['Pin', 'Name', 'Data Type', 'Semantics', 'Min', 'Max', 'Units', 'Live Value', 'Actions'].map(c => (
                  <th key={c} className="px-4 py-3 text-left text-[10px] font-semibold text-[#606060] uppercase tracking-[0.12em] border-b border-[#2a2a2a] whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {visible.map((d, i) => (
                  <motion.tr key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-[#2a2a2a]/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-[11px] font-medium px-2 py-0.5 rounded bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]">{d.pin}</span>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-white">{d.name}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${TYPE_COLORS[d.dataType]}`}>{d.dataType}</span>
                    </td>
                    <td className="px-4 py-3.5 text-[#a0a0a0]">{d.semantics}</td>
                    <td className="px-4 py-3.5 text-[#606060] font-mono text-[12px]">{d.min ?? '—'}</td>
                    <td className="px-4 py-3.5 text-[#606060] font-mono text-[12px]">{d.max ?? '—'}</td>
                    <td className="px-4 py-3.5 text-[#a0a0a0]">{d.units || '—'}</td>
                    <td className="px-4 py-3.5"><LiveValue projectId={pid} pin={d.pin} /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(d)}
                          className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
                          <Pencil className="w-3.5 h-3.5 text-[#a0a0a0]" />
                        </button>
                        <button onClick={() => handleDelete(d.id)}
                          className="w-7 h-7 rounded-lg hover:bg-[#ff4d4d]/15 flex items-center justify-center transition-colors">
                          <Trash2 className="w-3.5 h-3.5 text-[#ff4d4d]" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>

      <DatastreamDrawer open={drawerOpen} onClose={() => { setDrawerOpen(false); setEditing(null); }}
        onSave={handleSave} initial={editing ?? undefined} datastreams={datastreams} />

      <EcoModeModal 
        open={ecoModalOpen} 
        onClose={() => setEcoModalOpen(false)} 
        onConfirm={async () => {
          const success = await pingHandshake();
          if (success) {
            await updateEcoMode(true);
            return true;
          }
          return false;
        }} 
      />

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

      <ConfirmModal
        open={deleteConfirmOpen}
        title="ลบ Datastream?"
        message="คุณแน่ใจหรือไม่ว่าต้องการลบ Datastream นี้? ข้อมูลทั้งหมดที่เกี่ยวข้องจะถูกลบอย่างถาวรและไม่สามารถกู้คืนได้"
        confirmText="ลบทิ้ง"
        cancelText="ยกเลิก"
        danger={true}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeletingId(null);
        }}
        onConfirm={async () => {
          if (deletingId) {
            await deleteDatastream(deletingId);
            setDeletingId(null);
          }
        }}
      />
    </div>
  );
}
