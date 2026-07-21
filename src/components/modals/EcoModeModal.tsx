import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, AlertTriangle, X, Loader2, ServerCrash } from 'lucide-react';

interface EcoModeModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<boolean>;
}

export default function EcoModeModal({ open, onClose, onConfirm }: EcoModeModalProps) {
  const mountedRef = useRef(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // BUG FIX: StrictMode double-mount fix — set true at start, not just false at cleanup
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    if (!open) {
      setVerifying(false);
      setError(false);
      setCooldown(0);
    }
  }, [open]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleConfirm = async () => {
    setVerifying(true);
    setError(false);
    
    const success = await onConfirm();

    if (!mountedRef.current) return;

    if (success) {
      setVerifying(false);
      onClose();
    } else {
      setVerifying(false);
      setError(true);
      setCooldown(3); // 3 seconds cooldown as requested
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={!verifying && cooldown === 0 ? onClose : undefined}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="p-6">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${error ? 'bg-[#ef4444]/10 text-[#ef4444]' : 'bg-[#10b981]/10 text-[#10b981]'}`}>
                {error ? <ServerCrash className="w-6 h-6" /> : <Leaf className="w-6 h-6" />}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {error ? 'Board Not Supported' : 'Enable Eco Mode?'}
              </h3>
              
              {error ? (
                <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg p-3 text-sm text-[#ef4444] mb-6 leading-relaxed">
                  <strong>Verification failed.</strong> Your ESP32 board did not respond to the Eco Mode handshake. Please ensure you have flashed the latest <code>CloudESP32_SDK</code> code to your board.
                </div>
              ) : (
                <>
                  <p className="text-[#a0a0a0] text-sm mb-4 leading-relaxed">
                    Eco Mode is a smart data-saving feature that filters redundant sensor data at the hardware level. It reduces bandwidth and storage usage by up to 95%.
                  </p>
                  
                  <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-lg p-3 flex gap-3 mb-6">
                    <AlertTriangle className="w-5 h-5 text-[#f59e0b] shrink-0" />
                    <div className="text-sm text-[#d1d5db]">
                      <strong className="text-[#f59e0b] block mb-1">How it works:</strong>
                      Data will only be logged to Firebase when the value changes by more than <span className="font-mono text-[#f59e0b]">0.1</span> or every 1 hour as a heartbeat. Graphs will use step interpolation to hold previous values.
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={verifying}
                  className="flex-1 py-2.5 bg-[#2a2a2a] hover:bg-[#3a3a3a] disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  {error ? 'Close' : 'Cancel'}
                </button>
                {!error && (
                  <button
                    onClick={handleConfirm}
                    disabled={verifying || cooldown > 0}
                    className="flex-1 py-2.5 flex items-center justify-center gap-2 bg-[#10b981] hover:bg-[#10b981]/90 disabled:opacity-50 disabled:bg-[#3a3a3a] disabled:text-[#a0a0a0] text-black rounded-lg text-sm font-bold transition-all glow-btn"
                  >
                    {verifying ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                    ) : cooldown > 0 ? (
                      `Wait ${cooldown}s`
                    ) : (
                      'I Understand, Enable'
                    )}
                  </button>
                )}
              </div>
            </div>
            
            <button
              onClick={onClose}
              disabled={verifying}
              className="absolute top-4 right-4 text-[#606060] hover:text-white disabled:opacity-50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
