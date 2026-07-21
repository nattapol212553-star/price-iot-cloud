import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';
import { SEMANTICS_OPTIONS, UNITS_BY_SEMANTICS } from '../../types';
import type { Datastream, DataType } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Datastream, 'id' | 'createdAt'>) => void;
  initial?: Partial<Datastream>;
  datastreams: Datastream[];
}

const DATA_TYPES: DataType[] = ['Integer', 'Double', 'Boolean', 'String', 'Enum'];
const PIN_OPTIONS = Array.from({ length: 50 }, (_, i) => `V${i}`);
const isNumeric = (dt: DataType) => dt === 'Integer' || dt === 'Double';

export default function DatastreamDrawer({ open, onClose, onSave, initial, datastreams }: Props) {
  const [pin, setPin] = useState(initial?.pin ?? 'V0');
  const [name, setName] = useState(initial?.name ?? '');
  const [dataType, setDataType] = useState<DataType>(initial?.dataType ?? 'Double');
  const [semantics, setSemantics] = useState(initial?.semantics ?? 'Custom');
  const [min, setMin] = useState(String(initial?.min ?? 0));
  const [max, setMax] = useState(String(initial?.max ?? 100));
  const [units, setUnits] = useState(initial?.units ?? '');

  // BUG FIX: Previously, `if (!initial) return;` caused the form to keep
  // stale values from the last edit when opening for "New Datastream".
  // Now we reset to defaults when initial is undefined (create mode).
  useEffect(() => {
    if (initial) {
      setPin(initial.pin ?? 'V0'); setName(initial.name ?? '');
      setDataType(initial.dataType ?? 'Double'); setSemantics(initial.semantics ?? 'Custom');
      setMin(String(initial.min ?? 0)); setMax(String(initial.max ?? 100));
      setUnits(initial.units ?? '');
    } else {
      setPin('V0'); setName('');
      setDataType('Double'); setSemantics('Custom');
      setMin('0'); setMax('100');
      setUnits('');
    }
    setError('');
  }, [initial, open]);

  const handleSemanticsChange = (s: string) => {
    setSemantics(s);
    if (UNITS_BY_SEMANTICS[s]) setUnits(UNITS_BY_SEMANTICS[s]);
  };

  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !pin) return;
    
    const duplicate = datastreams.find(d => d.pin === pin && d.id !== initial?.id);
    if (duplicate) {
      setError(`Pin ${pin} is already used by "${duplicate.name}".`);
      return;
    }
    
    setError('');
    onSave({
      pin, name: name.trim(), dataType, semantics, units: units.trim(),
      ...(isNumeric(dataType) ? { min: parseFloat(min) || 0, max: parseFloat(max) || 100 } : {}),
      ...(dataType === 'Boolean' ? { min: 0, max: 1 } : {}),
    });
    onClose();
  };

  const inputCls = "w-full bg-[#121212] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#3a3a3a] focus:outline-none focus:border-[var(--theme-primary)]/50 transition-colors";
  const labelCls = "block text-[11px] font-semibold uppercase tracking-widest text-[#606060] mb-2";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative ml-auto w-full max-w-md h-full bg-[#1e1e1e] border-l border-[#2a2a2a] flex flex-col shadow-2xl">

            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a] shrink-0">
              <h2 className="text-[15px] font-semibold text-white">
                {initial?.id ? 'Edit Datastream' : 'New Datastream'}
              </h2>
              <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-[#a0a0a0]" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {error && (
                <div className="p-3 bg-[#ff4d4d]/10 border border-[#ff4d4d]/30 text-[#ff4d4d] text-[12px] rounded-lg">
                  {error}
                </div>
              )}
              {/* PIN */}
              <div>
                <label className={labelCls}>Virtual Pin *</label>
                <div className="relative">
                  <select value={pin} onChange={e => setPin(e.target.value)} className={inputCls + ' appearance-none pr-8'}>
                    {PIN_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#606060] pointer-events-none" />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className={labelCls}>Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Temperature" className={inputCls} />
              </div>

              {/* Data Type */}
              <div>
                <label className={labelCls}>Data Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {DATA_TYPES.map(dt => (
                    <button key={dt} type="button" onClick={() => setDataType(dt)}
                      className={['px-2 py-2 rounded-lg text-xs font-medium transition-all border',
                        dataType === dt ? 'border-[var(--theme-primary)]/50 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]' : 'border-[#2a2a2a] text-[#a0a0a0] hover:border-[#3a3a3a]'].join(' ')}>
                      {dt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Semantics */}
              <div>
                <label className={labelCls}>Semantics</label>
                <div className="relative">
                  <select value={semantics} onChange={e => handleSemanticsChange(e.target.value)} className={inputCls + ' appearance-none pr-8'}>
                    {SEMANTICS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#606060] pointer-events-none" />
                </div>
              </div>

              {/* Min / Max (numeric only) */}
              {isNumeric(dataType) && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Min</label>
                    <input type="number" value={min} onChange={e => setMin(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Max</label>
                    <input type="number" value={max} onChange={e => setMax(e.target.value)} className={inputCls} />
                  </div>
                </div>
              )}

              {/* Units */}
              <div>
                <label className={labelCls}>Units</label>
                <input value={units} onChange={e => setUnits(e.target.value)} placeholder="°C, %, V, A…" className={inputCls} />
              </div>
            </form>

            <div className="px-6 py-4 border-t border-[#2a2a2a] flex gap-3 shrink-0">
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-[#2a2a2a] rounded-lg text-sm text-[#a0a0a0] hover:text-white hover:border-[#3a3a3a] transition-all">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={!name.trim() || !pin}
                className="flex-1 px-4 py-2.5 bg-[var(--theme-primary)] text-black text-sm font-bold rounded-lg hover:brightness-110 transition-all disabled:opacity-40 glow-btn">
                Save Datastream
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
