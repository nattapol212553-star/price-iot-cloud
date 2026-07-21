import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Cpu, ChevronRight, Palette } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';
import NewProjectModal from '../components/modals/NewProjectModal';
import ThemeSwitcher from '../components/modals/ThemeSwitcher';
import ConfirmModal from '../components/modals/ConfirmModal';
import { THEMES } from '../theme/config';

const BOARD_COLORS: Record<string, string> = {
  'ESP32': 'var(--theme-primary)', 'ESP8266': 'var(--theme-secondary)', 'Arduino': '#F97316',
  'Raspberry Pi': '#EC4899', 'Other': '#A78BFA',
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function HomePage() {
  const navigate = useNavigate();
  const { projects, loading, createProject, deleteProject } = useProjects();
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [themeEditProjectId, setThemeEditProjectId] = useState<string | null>(null);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    setDeleteConfirmOpen(true);
  };

  const handleThemeEdit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setThemeEditProjectId(id);
  };

  const handleCreateProject = (data: { name: string; description: string; board: string; theme: string }) => {
    createProject(data as any);
  };

  return (
    <div className="h-full flex flex-col bg-[#121212] overflow-auto">
      {/* Header */}
      <div className="px-8 pt-8 pb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Projects</h1>
        <p className="text-[#606060] text-sm">Manage your IoT devices and dashboards</p>
      </div>

      <div className="px-8 pb-8 flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-[#606060]">Loading…</div>
        ) : (
          <motion.div variants={{ show: { transition: { staggerChildren: 0.07 } } }} initial="hidden" animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* New Project Card */}
            <motion.button variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
              onClick={() => setShowModal(true)}
              className="hidden md:flex flex-col items-center justify-center gap-3 p-8 bg-[#1e1e1e] border-2 border-dashed border-[#2a2a2a] rounded-2xl hover:border-[var(--theme-primary)]/50 hover:bg-[var(--theme-primary)]/5 transition-all group min-h-[180px]">
              <div className="w-12 h-12 rounded-xl border-2 border-dashed border-[#2a2a2a] group-hover:border-[var(--theme-primary)]/50 group-hover:bg-[var(--theme-primary)]/10 flex items-center justify-center transition-all">
                <Plus className="w-6 h-6 text-[#606060] group-hover:text-[var(--theme-primary)] transition-colors" />
              </div>
              <span className="text-[13px] font-semibold text-[#606060] group-hover:text-[var(--theme-primary)] transition-colors">New Project</span>
            </motion.button>

            {/* Project Cards */}
            <AnimatePresence>
              {projects.map(p => {
                const color = BOARD_COLORS[p.board] ?? '#A78BFA';
                const projectTheme = THEMES.find(t => t.id === p.theme);
                const themeColor = projectTheme?.primaryColor ?? 'var(--theme-primary)';

                return (
                  <motion.div key={p.id}
                    variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                    layout exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => navigate(`/project/${p.id}/dashboard`)}
                    className="relative bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6 cursor-pointer transition-all hover:border-[#4a4a4a] group card-hover min-h-[180px] flex flex-col justify-between overflow-hidden">

                    {/* Subtle theme bg hint on card */}
                    {projectTheme?.bgImage && (
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-[0.07] transition-opacity group-hover:opacity-[0.12] pointer-events-none"
                        style={{ backgroundImage: `url(${projectTheme.bgImage})` }}
                      />
                    )}

                    {/* Top */}
                    <div className="relative">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${color}18` }}>
                          <Cpu className="w-5 h-5" style={{ color }} />
                        </div>
                        <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Theme edit button */}
                          <button
                            onClick={(e) => handleThemeEdit(e, p.id)}
                            title="Change Theme"
                            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-all"
                          >
                            <Palette className="w-4 h-4" style={{ color: themeColor }} />
                          </button>
                          {/* Delete button */}
                          <button onClick={(e) => handleDelete(e, p.id)}
                            disabled={deletingId === p.id}
                            className="w-8 h-8 rounded-lg bg-transparent hover:bg-[#ff4d4d]/15 flex items-center justify-center transition-all">
                            <Trash2 className="w-4 h-4 text-[#ff4d4d]" />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-[15px] font-semibold text-white mb-1">{p.name}</h3>
                      {p.description && (
                        <p className="text-[12px] text-[#606060] leading-relaxed line-clamp-2">{p.description}</p>
                      )}
                    </div>

                    {/* Bottom */}
                    <div className="relative flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ color, backgroundColor: `${color}18` }}>
                          {p.board}
                        </span>
                        {/* Theme badge */}
                        {projectTheme && projectTheme.id !== 'default' && (
                          <span className="text-[11px] px-2 py-0.5 rounded font-medium"
                            style={{ color: themeColor, backgroundColor: `${themeColor}18` }}>
                            {projectTheme.name}
                          </span>
                        )}
                        <span className="text-[11px] text-[#3a3a3a]">{formatDate(p.createdAt)}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#3a3a3a] group-hover:text-white transition-colors" />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* FAB for mobile */}
      <button onClick={() => setShowModal(true)}
        className="md:hidden fixed bottom-20 right-5 w-14 h-14 rounded-full bg-[var(--theme-primary)] text-black shadow-lg flex items-center justify-center z-40 hover:brightness-110 transition-all">
        <Plus className="w-7 h-7" />
      </button>

      <NewProjectModal open={showModal} onClose={() => setShowModal(false)} onCreate={handleCreateProject} />

      {themeEditProjectId && (
        <ThemeSwitcher
          isOpen={!!themeEditProjectId}
          onClose={() => setThemeEditProjectId(null)}
          projectId={themeEditProjectId}
        />
      )}

      <ConfirmModal
        open={deleteConfirmOpen}
        title="ลบโปรเจกต์?"
        message="คุณแน่ใจหรือไม่ว่าต้องการลบโปรเจกต์นี้? ข้อมูลทั้งหมด รวมถึง Dashboards และ Datastreams จะถูกลบอย่างถาวรและไม่สามารถกู้คืนได้"
        confirmText="ลบทิ้ง"
        cancelText="ยกเลิก"
        danger={true}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeletingId(null);
        }}
        onConfirm={async () => {
          if (deletingId) {
            try {
              await deleteProject(deletingId);
            } catch (e) {
              console.error(e);
            } finally {
              setDeletingId(null);
            }
          }
        }}
      />
    </div>
  );
}
