import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cpu, Palette, Check } from 'lucide-react';
import { BOARD_OPTIONS } from '../../types';
import { THEMES } from '../../theme/config';
import type { ThemeConfig } from '../../theme/config';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; description: string; board: string; theme: string }) => void;
}

export default function NewProjectModal({ open, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [board, setBoard] = useState('ESP32');
  const [theme, setTheme] = useState('default');
  const [step, setStep] = useState<'info' | 'theme'>('info');

  const handleClose = () => {
    onClose();
    // Reset after animation
    setTimeout(() => { setStep('info'); setName(''); setDescription(''); setBoard('ESP32'); setTheme('default'); }, 200);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(), description: description.trim(), board, theme });
    handleClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.2 }}
            className="relative bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl w-full max-w-md mx-4 shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)]/10 flex items-center justify-center">
                  {step === 'info' ? <Cpu className="w-4 h-4 text-[var(--theme-primary)]" /> : <Palette className="w-4 h-4 text-[var(--theme-primary)]" />}
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-white">{step === 'info' ? 'New Project' : 'Choose Theme'}</h2>
                  <p className="text-[10px] text-[#606060]">{step === 'info' ? 'Step 1 of 2' : 'Step 2 of 2'}</p>
                </div>
              </div>
              <button onClick={handleClose} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-[#a0a0a0]" />
              </button>
            </div>

            {/* Step 1: Info */}
            <AnimatePresence mode="wait">
              {step === 'info' && (
                <motion.form key="info" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  onSubmit={(e) => { e.preventDefault(); if (name.trim()) setStep('theme'); }}
                  className="p-6 space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#606060] mb-2">Project Name *</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="My ESP32 Garden"
                      className="w-full bg-[#121212] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#3a3a3a] focus:outline-none focus:border-[var(--theme-primary)]/50 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#606060] mb-2">Description</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                      placeholder="Smart garden monitoring system..."
                      className="w-full bg-[#121212] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#3a3a3a] focus:outline-none focus:border-[var(--theme-primary)]/50 transition-colors resize-none" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#606060] mb-2">Board Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      {BOARD_OPTIONS.map(b => (
                        <button key={b} type="button" onClick={() => setBoard(b)}
                          className={['px-3 py-2 rounded-lg text-sm font-medium transition-all border',
                            board === b ? 'border-[var(--theme-primary)]/50 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]' : 'border-[#2a2a2a] text-[#a0a0a0] hover:border-[#3a3a3a]'].join(' ')}>
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={handleClose}
                      className="flex-1 px-4 py-2.5 border border-[#2a2a2a] rounded-lg text-sm text-[#a0a0a0] hover:text-white hover:border-[#3a3a3a] transition-all">
                      Cancel
                    </button>
                    <button type="submit" disabled={!name.trim()}
                      className="flex-1 px-4 py-2.5 bg-[var(--theme-primary)] text-black text-sm font-bold rounded-lg hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                      Next: Choose Theme →
                    </button>
                  </div>
                </motion.form>
              )}

              {/* Step 2: Theme */}
              {step === 'theme' && (
                <motion.div key="theme" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="p-6">
                  <div className="grid grid-cols-2 gap-3 mb-4 max-h-64 overflow-y-auto">
                    {THEMES.map((t: ThemeConfig) => {
                      const isActive = theme === t.id;
                      return (
                        <button key={t.id} type="button" onClick={() => setTheme(t.id)}
                          className={`relative flex flex-col gap-2 p-2 rounded-xl border-2 transition-all text-left overflow-hidden group
                            ${isActive ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/10' : 'border-[#2a2a2a] hover:border-[#3a3a3a] bg-[#121212]'}`}>
                          <div className="w-full h-16 rounded-lg overflow-hidden relative">
                            {t.bgImage ? (
                              <img src={t.bgImage} alt={t.name} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center">
                                <span className="text-[10px] text-[#606060]">Default</span>
                              </div>
                            )}
                            {isActive && (
                              <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[var(--theme-primary)] text-black flex items-center justify-center">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between px-1">
                            <span className={`text-[11px] font-semibold ${isActive ? 'text-white' : 'text-[#a0a0a0]'}`}>{t.name}</span>
                            <div className="flex gap-1">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.primaryColor }} />
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.secondaryColor }} />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep('info')}
                      className="flex-1 px-4 py-2.5 border border-[#2a2a2a] rounded-lg text-sm text-[#a0a0a0] hover:text-white hover:border-[#3a3a3a] transition-all">
                      ← Back
                    </button>
                    <button type="button" onClick={handleSubmit as any}
                      className="flex-1 px-4 py-2.5 bg-[var(--theme-primary)] text-black text-sm font-bold rounded-lg hover:brightness-110 transition-all">
                      Create Project ✓
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
