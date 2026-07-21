import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  danger?: boolean;
}

export default function ConfirmModal({ 
  open, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel', 
  onClose, 
  onConfirm,
  danger = false
}: ConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-sm bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="p-6">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${danger ? 'bg-[#ef4444]/10 text-[#ef4444]' : 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]'}`}>
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {title}
              </h3>
              
              <p className="text-[#a0a0a0] text-sm mb-6 leading-relaxed">
                {message}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    try {
                      await onConfirm();
                      onClose();
                    } catch (err) {
                      console.error('[ConfirmModal] onConfirm failed:', err);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className={`flex-1 py-2.5 flex items-center justify-center gap-2 rounded-lg text-sm font-bold transition-all glow-btn text-black ${
                    danger 
                      ? 'bg-[#ef4444] hover:bg-[#ef4444]/90' 
                      : 'bg-[var(--theme-primary)] hover:brightness-110'
                  }`}
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : confirmText}
                </button>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-[#606060] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
