import { X, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import type { ThemeConfig } from '../../theme/config';
import { ref, update } from 'firebase/database';
import { database } from '../../firebase/config';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projectId: string; // The project whose theme we're editing
}

export default function ThemeSwitcher({ isOpen, onClose, projectId }: Props) {
  const { theme, themes } = useTheme();

  if (!isOpen) return null;

  const handleSelect = async (themeId: string) => {
    await update(ref(database, `projects/${projectId}`), { theme: themeId });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Choose Project Theme</h2>
            <p className="text-sm text-[#a0a0a0]">This theme applies only to this project</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#2a2a2a] transition-colors text-[#a0a0a0] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {themes.map((t: ThemeConfig) => {
              const isActive = theme.id === t.id;

              return (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t.id)}
                  className={`relative flex flex-col items-center gap-3 p-3 rounded-xl border-2 transition-all text-left overflow-hidden group
                    ${isActive ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/10' : 'border-[#2a2a2a] hover:border-[#3a3a3a] bg-[#121212]'}`}
                >
                  {/* Background Preview */}
                  <div className="w-full h-24 rounded-lg bg-[#2a2a2a] overflow-hidden relative border border-[#3a3a3a]">
                    {t.bgImage ? (
                      <img src={t.bgImage} alt={t.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-[#121212] flex items-center justify-center">
                        <span className="text-xs font-mono text-[#606060]">No Background</span>
                      </div>
                    )}

                    {/* Active Checkmark */}
                    {isActive && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[var(--theme-primary)] text-black flex items-center justify-center shadow-lg">
                        <Check className="w-4 h-4 font-bold" />
                      </div>
                    )}
                  </div>

                  {/* Theme Info */}
                  <div className="w-full flex items-center justify-between">
                    <span className={`font-semibold text-sm ${isActive ? 'text-white' : 'text-[#a0a0a0] group-hover:text-white'}`}>
                      {t.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.primaryColor }} />
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.secondaryColor }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
