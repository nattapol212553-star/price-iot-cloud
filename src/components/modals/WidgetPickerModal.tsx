import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ToggleLeft, Circle, Gauge, LineChart, BarChart3, Type, ChevronLeft, SlidersHorizontal, Hash, CircleDot, Target, Video, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { WidgetType, Datastream } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  datastreams: Datastream[];
  onAdd: (widget: { type: WidgetType; title: string; datastreamId?: string; datastreamIds?: string[]; streamUrl?: string }) => void;
}

const WIDGET_TYPES: { type: WidgetType; icon: React.ElementType; label: string; desc: string; multi: boolean; numericOnly: boolean; noDatastream?: boolean }[] = [
  { type: 'switch',     icon: ToggleLeft, label: 'Switch',       desc: 'Toggle ON/OFF → ESP32', multi: false, numericOnly: false },
  { type: 'led',        icon: Circle,     label: 'LED',          desc: 'Show status indicator', multi: false, numericOnly: false },
  { type: 'gauge',      icon: Gauge,      label: 'Gauge',        desc: 'Semi-circular dial',    multi: false, numericOnly: true  },
  { type: 'chart',      icon: LineChart,  label: 'History Chart',desc: 'Single sensor history', multi: false, numericOnly: true  },
  { type: 'multichart', icon: BarChart3,  label: 'Multi Chart',  desc: 'Compare multiple data', multi: true,  numericOnly: true  },
  { type: 'label',      icon: Type,       label: 'Label',        desc: 'Display text/value',    multi: false, numericOnly: false },
  { type: 'slider',     icon: SlidersHorizontal, label: 'Slider', desc: 'Slide to set value',   multi: false, numericOnly: true  },
  { type: 'number_input', icon: Hash,     label: 'Number Input', desc: 'Precise number entry',  multi: false, numericOnly: true  },
  { type: 'button',     icon: CircleDot,  label: 'Hold Button',  desc: 'Active while pressed',  multi: false, numericOnly: true  },
  { type: 'trigger',    icon: Target,     label: 'Trigger Button',desc: 'Send one-time pulse',   multi: false, numericOnly: true  },
  { type: 'camera',     icon: Video,      label: 'Live Camera',  desc: 'Stream live video',     multi: false, numericOnly: false, noDatastream: true },
];

const isNumericDs = (ds: Datastream) => ds.dataType === 'Integer' || ds.dataType === 'Double' || ds.dataType === 'Boolean';

export default function WidgetPickerModal({ open, onClose, datastreams, onAdd }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<typeof WIDGET_TYPES[0] | null>(null);
  const [title, setTitle] = useState('');
  const [datastreamId, setDatastreamId] = useState('');
  const [datastreamIds, setDatastreamIds] = useState<string[]>([]);
  const [streamUrl, setStreamUrl] = useState('');
  const [urlStatus, setUrlStatus] = useState<'idle' | 'testing' | 'online' | 'offline'>('idle');
  const [urlError, setUrlError] = useState<string | null>(null);

  const reset = () => { 
    setStep(1); setSelectedType(null); setTitle(''); 
    setDatastreamId(''); setDatastreamIds([]); 
    setStreamUrl(''); setUrlStatus('idle'); setUrlError(null); 
  };

  useEffect(() => {
    if (!selectedType?.noDatastream) return;
    
    const url = streamUrl.trim();
    if (!url) {
      setUrlStatus('idle');
      setUrlError(null);
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setUrlStatus('idle');
      setUrlError('URL ต้องขึ้นต้นด้วย http:// หรือ https://');
      return;
    }

    setUrlError(null);
    setUrlStatus('testing');

    const img = new Image();
    let isMounted = true;
    
    img.onload = () => {
      if (isMounted) setUrlStatus('online');
    };
    img.onerror = () => {
      if (isMounted) setUrlStatus('offline');
    };
    img.src = url;

    return () => {
      isMounted = false;
      img.src = '';
    };
  }, [streamUrl, selectedType]);

  const handleClose = () => { reset(); onClose(); };

  const handleTypeSelect = (wt: typeof WIDGET_TYPES[0]) => {
    setSelectedType(wt);
    setTitle(wt.label);
    setStep(2);
  };

  const handleAdd = () => {
    if (!selectedType) return;
    onAdd({
      type: selectedType.type,
      title: title || selectedType.label,
      ...(selectedType.multi ? { datastreamIds } : { datastreamId }),
      ...(selectedType.noDatastream ? { streamUrl } : {}),
    });
    handleClose();
  };

  const availableDs = selectedType?.numericOnly ? datastreams.filter(isNumericDs) : datastreams;
  const canSubmit = selectedType?.noDatastream ? (!!streamUrl.trim() && !urlError) : selectedType?.multi ? datastreamIds.length > 0 : !!datastreamId;

  const toggleMultiDs = (id: string) =>
    setDatastreamIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.2 }}
            className="relative bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
              <div className="flex items-center gap-3">
                {step === 2 && (
                  <button onClick={() => setStep(1)} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
                    <ChevronLeft className="w-4 h-4 text-[#a0a0a0]" />
                  </button>
                )}
                <h2 className="text-[15px] font-semibold text-white">
                  {step === 1 ? 'Choose Widget Type' : `Configure ${selectedType?.label}`}
                </h2>
              </div>
              <button onClick={handleClose} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-[#a0a0a0]" />
              </button>
            </div>

            {/* Step 1: Widget Type Grid */}
            {step === 1 && (
              <div className="p-6 grid grid-cols-2 gap-3">
                {WIDGET_TYPES.map(wt => (
                  <button key={wt.type} onClick={() => handleTypeSelect(wt)}
                    className="flex items-start gap-3 p-4 bg-[#121212] border border-[#2a2a2a] rounded-xl hover:border-[var(--theme-primary)]/40 hover:bg-[var(--theme-primary)]/5 transition-all text-left group">
                    <div className="w-9 h-9 rounded-lg bg-[#2a2a2a] group-hover:bg-[var(--theme-primary)]/15 flex items-center justify-center transition-colors shrink-0">
                      <wt.icon className="w-4 h-4 text-[#a0a0a0] group-hover:text-[var(--theme-primary)] transition-colors" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{wt.label}</p>
                      <p className="text-[11px] text-[#606060] mt-0.5">{wt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Configure */}
            {step === 2 && selectedType && (
              <div className="p-6 space-y-5">
                {/* Title */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#606060] mb-2">Widget Title</label>
                  <input value={title} onChange={e => setTitle(e.target.value)}
                    className="w-full bg-[#121212] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--theme-primary)]/50 transition-colors" />
                </div>

                {/* Datastream selection or Custom inputs */}
                {selectedType.noDatastream ? (
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#606060] mb-2">Stream URL</label>
                    <input value={streamUrl} onChange={e => setStreamUrl(e.target.value)}
                      placeholder="http://192.168.1.100:81/stream"
                      className={`w-full bg-[#121212] border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none transition-colors ${
                        urlError ? 'border-[#ff4d4d]/50 focus:border-[#ff4d4d]' : 'border-[#2a2a2a] focus:border-[var(--theme-primary)]/50'
                      }`} />
                    
                    {/* URL Validation Status */}
                    <div className="mt-3">
                      {urlError ? (
                        <p className="text-[12px] text-[#ff4d4d] flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> {urlError}</p>
                      ) : urlStatus === 'testing' ? (
                        <p className="text-[12px] text-[#a0a0a0] flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> กำลังตรวจสอบการเชื่อมต่อ...</p>
                      ) : urlStatus === 'online' ? (
                        <p className="text-[12px] text-[#10b981] flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> ตรวจพบสัญญาณภาพจากกล้อง!</p>
                      ) : urlStatus === 'offline' ? (
                        <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/20 p-3 rounded-lg">
                          <p className="text-[12px] text-[#f59e0b] flex items-start gap-1.5 font-medium mb-1">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            ไม่สามารถดึงภาพจากกล้องได้ในขณะนี้
                          </p>
                          <p className="text-[11px] text-[#a0a0a0] ml-5.5 leading-relaxed">
                            (หากใช้ Local IP โปรดตรวจสอบว่าคุณเชื่อมต่อ Wi-Fi วงเดียวกับกล้องอยู่หรือไม่) คุณสามารถกดเพิ่ม Widget ไว้ก่อนเพื่อไปดูภายหลังได้
                          </p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-[#606060]">ใส่ URL ของ MJPEG Stream จาก ESP32-CAM หรือ IP Camera</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#606060] mb-2">
                      {selectedType.multi ? 'Select Datastreams (multiple)' : 'Select Datastream'}
                      {selectedType.numericOnly && <span className="ml-2 text-[#606060] normal-case font-normal">(numeric only)</span>}
                    </label>

                    {availableDs.length === 0 ? (
                      <p className="text-[#606060] text-sm">No compatible datastreams. Create one first.</p>
                    ) : (
                      <div className="space-y-2 max-h-52 overflow-y-auto">
                        {availableDs.map(ds => {
                          const checked = selectedType.multi ? datastreamIds.includes(ds.id) : datastreamId === ds.id;
                          return (
                            <label key={ds.id}
                              className={['flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                                checked ? 'border-[var(--theme-primary)]/40 bg-[var(--theme-primary)]/8' : 'border-[#2a2a2a] hover:border-[#3a3a3a]'].join(' ')}>
                              <input type={selectedType.multi ? 'checkbox' : 'radio'} name="ds"
                                checked={checked}
                                onChange={() => selectedType.multi ? toggleMultiDs(ds.id) : setDatastreamId(ds.id)}
                                className="accent-[var(--theme-primary)]" />
                              <div>
                                <p className="text-sm font-medium text-white">{ds.name}</p>
                                <p className="text-[11px] text-[#606060]">{ds.pin} · {ds.dataType} · {ds.semantics}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep(1)}
                    className="flex-1 px-4 py-2.5 border border-[#2a2a2a] rounded-lg text-sm text-[#a0a0a0] hover:text-white transition-all">
                    Back
                  </button>
                  <button onClick={handleAdd} disabled={!canSubmit}
                    className="flex-1 px-4 py-2.5 bg-[var(--theme-primary)] text-black text-sm font-bold rounded-lg hover:brightness-110 transition-all disabled:opacity-40 glow-btn">
                    Add Widget
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
