import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Rocket, Code2 } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SetupGuideModal({ open, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.2 }}
            className="relative bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a2a] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)]/10 flex items-center justify-center">
                  <Rocket className="w-4 h-4 text-[var(--theme-primary)]" />
                </div>
                <h2 className="text-[15px] font-semibold text-white">Device Authentication Setup (Firebase)</h2>
              </div>
              <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-[#a0a0a0]" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              <p className="text-sm text-[#a0a0a0] leading-relaxed">
                For every new project, you must create an account to allow your ESP32 board to log into the database. Follow these steps in the <strong>Firebase Console</strong>:
              </p>

              <div className="space-y-6">

                {/* Step 1 */}
                <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[var(--theme-primary)]"></div>
                  <h3 className="text-[14px] font-semibold text-white flex items-center gap-2 mb-3">
                    <span className="w-5 h-5 rounded-full bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] flex items-center justify-center text-[11px] font-bold shrink-0">1</span>
                    Go to Authentication
                  </h3>
                  <div className="ml-7 space-y-3">
                    <p className="text-[12px] text-[#808080]">
                      In your Firebase project console, look for the left sidebar and click on <strong className="text-[#a0a0a0]">Authentication</strong>.
                    </p>
                    <div className="rounded-lg overflow-hidden border border-[#2a2a2a]">
                      <img src="/images/guide/step1.png" alt="Step 1" className="w-full h-auto" />
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[var(--theme-secondary)]"></div>
                  <h3 className="text-[14px] font-semibold text-white flex items-center gap-2 mb-3">
                    <span className="w-5 h-5 rounded-full bg-[var(--theme-secondary)]/20 text-[var(--theme-secondary)] flex items-center justify-center text-[11px] font-bold shrink-0">2</span>
                    Click Add User
                  </h3>
                  <div className="ml-7 space-y-3">
                    <p className="text-[12px] text-[#808080]">
                      In the Users tab, find and click the blue <strong className="text-[#a0a0a0]">Add user</strong> button.
                    </p>
                    <div className="rounded-lg overflow-hidden border border-[#2a2a2a]">
                      <img src="/images/guide/step2.png" alt="Step 2" className="w-full h-auto" />
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#f59e0b]"></div>
                  <h3 className="text-[14px] font-semibold text-white flex items-center gap-2 mb-3">
                    <span className="w-5 h-5 rounded-full bg-[#f59e0b]/20 text-[#f59e0b] flex items-center justify-center text-[11px] font-bold shrink-0">3</span>
                    Enter Auth Email and Token
                  </h3>
                  <div className="ml-7 space-y-3">
                    <p className="text-[12px] text-[#808080]">
                      Copy the <strong className="text-[#a0a0a0]">Auth Email</strong> and <strong className="text-[#a0a0a0]">Auth Token</strong> from the Device Info page, and paste them into the respective fields.
                    </p>
                    <div className="rounded-lg overflow-hidden border border-[#2a2a2a]">
                      <img src="/images/guide/step3.png" alt="Step 3" className="w-full h-auto" />
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="bg-[#121212] border border-[#2a2a2a] rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#10b981]"></div>
                  <h3 className="text-[14px] font-semibold text-white flex items-center gap-2 mb-3">
                    <span className="w-5 h-5 rounded-full bg-[#10b981]/20 text-[#10b981] flex items-center justify-center text-[11px] font-bold shrink-0">4</span>
                    Create Account
                  </h3>
                  <div className="ml-7 space-y-3">
                    <p className="text-[12px] text-[#808080]">
                      Click the <strong className="text-[#a0a0a0]">Add user</strong> button to confirm and create the account.
                    </p>
                    <div className="rounded-lg overflow-hidden border border-[#2a2a2a]">
                      <img src="/images/guide/step4.png" alt="Step 4" className="w-full h-auto" />
                    </div>
                    <div className="mt-3 flex items-start gap-2 text-[11px] text-[#f59e0b] bg-[#f59e0b]/10 px-3 py-2.5 rounded-lg">
                      <Code2 className="w-4 h-4 mt-0.5 shrink-0" />
                      <span className="leading-relaxed">Once created, the ESP32 board using this code will be able to log into Firebase securely!</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#2a2a2a] flex justify-end shrink-0 bg-[#1e1e1e]">
              <button onClick={onClose}
                className="px-5 py-2.5 bg-[var(--theme-primary)] text-black text-[13px] font-bold rounded-lg hover:brightness-110 transition-all glow-btn flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Got it!
              </button>
            </div>
            
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
