import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Outlet, useParams, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, onValue } from 'firebase/database';
import { database } from '../../firebase/config';
import { Database, LayoutDashboard, Wifi, WifiOff, Leaf, FolderOpen, Shield, LogOut, HelpCircle, Home } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useDataCleanup } from '../../hooks/useDataCleanup';

const SetupGuideModal = lazy(() => import('../modals/SetupGuideModal'));

function useConnectionStatus() {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const r = ref(database, '.info/connected');
    const u = onValue(r, (snap) => setConnected(snap.val() === true));
    return () => u();
  }, []);
  return connected;
}

function useProjectName(projectId?: string) {
  const [name, setName] = useState('');
  useEffect(() => {
    if (!projectId) { setName(''); return; }
    // M4 fix: clear old name immediately before the new listener fires
    // so the sidebar header doesn't flash the previous project's name.
    setName('');
    const r = ref(database, `projects/${projectId}/name`);
    const u = onValue(r, (snap) => setName(snap.val() ?? ''));
    return () => u();
  }, [projectId]);
  return name;
}

export default function AppLayout() {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const connected = useConnectionStatus();
  const projectName = useProjectName(projectId);
  const { signOut } = useAuth();
  const { theme, setProjectTheme } = useTheme();
  const inProject = !!projectId;
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [hasOpenedGuide, setHasOpenedGuide] = useState(false);
  
  useEffect(() => {
    if (showGuideModal) setHasOpenedGuide(true);
  }, [showGuideModal]);

  // Automatically clean up old history data in the background
  useDataCleanup(projectId ?? null);

  // C4 fix: wrap setProjectTheme in useCallback so the effect dep is stable.
  // The effect only needs to re-run when projectId actually changes.
  const stableSetProjectTheme = useCallback(
    (id: string | null) => setProjectTheme(id),
    [setProjectTheme]
  );

  useEffect(() => {
    stableSetProjectTheme(projectId ?? null);
  }, [projectId, stableSetProjectTheme]);

  const navLinkCls = ({ isActive }: { isActive: boolean }) =>
    ['relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 w-full',
      isActive ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]' : 'text-[#a0a0a0] hover:text-white hover:bg-white/[0.05]'].join(' ');

  // L4 fix: extract dashboard path check to avoid nested template literals in JSX
  const isDashboardActive = useCallback((isActive: boolean) => isActive || location.pathname.startsWith(`/project/${projectId}/dashboard`), [location.pathname, projectId]);

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-[#121212] text-white font-sans">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col h-full bg-[#1e1e1e] border-r border-[#2a2a2a] relative overflow-hidden">
        {/* Sidebar theme background */}
        {inProject && theme.bgImage && (
          <div
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700 pointer-events-none"
            style={{ backgroundImage: `url(${theme.bgImage})`, opacity: 0.22 }}
          />
        )}
        {/* Dark overlay for readability */}
        {inProject && theme.bgImage && (
          <div className="absolute inset-0 z-0 bg-[#1a1a1a]/70 pointer-events-none" />
        )}
        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3 px-5 py-5 border-b border-[#2a2a2a]/80">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center ring-1" style={{ backgroundColor: `${theme.primaryColor}25`, borderColor: `${theme.primaryColor}30` }}>
            <Leaf className="w-5 h-5" style={{ color: theme.primaryColor }} />
          </div>
          <div className="relative z-10">
            <h1 className="text-[13px] font-bold tracking-[0.12em] uppercase text-white leading-tight">IoT Dashboard</h1>
            <p className="text-[10px] text-[#606060] tracking-[0.2em] uppercase mt-0.5">by SMAT</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="relative z-10 flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          <NavLink to="/" className={navLinkCls} end>
            <Home className="w-[17px] h-[17px] shrink-0" />
            <span>Home</span>
          </NavLink>

          {/* Quick Start Guide - ONLY VISIBLE WHEN NOT IN A PROJECT */}
          {!inProject && (
            <button 
              onClick={() => setShowGuideModal(true)} 
              className="relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 w-full text-[#a0a0a0] hover:text-white hover:bg-white/[0.05]"
            >
              <HelpCircle className="w-[17px] h-[17px] shrink-0" />
              <span>Setup Guide</span>
            </button>
          )}

          {/* Project-specific nav */}
          <AnimatePresence>
            {inProject && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="pt-3 pb-1 px-3">
                  <div className="flex items-center gap-2 mb-2">
                    <FolderOpen className="w-3 h-3 text-[#606060]" />
                    <span className="text-[10px] text-[#606060] uppercase tracking-widest font-semibold truncate">
                      {projectName || 'Project'}
                    </span>
                  </div>
                </div>
                <NavLink to={`/project/${projectId}/datastreams`} className={navLinkCls}>
                  <Database className="w-[17px] h-[17px] shrink-0" />
                  <span>Datastreams</span>
                </NavLink>
                <NavLink
                  to={`/project/${projectId}/dashboard`}
                  className={({ isActive }) => navLinkCls({ isActive: isDashboardActive(isActive) })}
                >
                  <LayoutDashboard className="w-[17px] h-[17px] shrink-0" />
                  <span>Dashboard</span>
                </NavLink>
                <NavLink to={`/project/${projectId}/device`} className={navLinkCls}>
                  <Shield className="w-[17px] h-[17px] shrink-0" />
                  <span>Device Info</span>
                </NavLink>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>

        {/* Footer */}
        <div className="relative z-10 px-5 py-4 border-t border-[#2a2a2a]/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {connected
              ? <Wifi className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
              : <WifiOff className="w-3.5 h-3.5 text-[#ff4d4d]" />}
            <span className={`text-[10px] font-medium ${connected ? 'text-[var(--theme-primary)]' : 'text-[#ff4d4d]'}`}>
              {connected ? 'Connected' : 'Connecting…'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] text-[#404040] font-medium tracking-wider">v2.0.2</span>
            <button
              onClick={signOut}
              className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors group"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5 text-[#606060] group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-hidden flex flex-col">
        <Outlet />
      </main>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="md:hidden shrink-0 bg-[#1e1e1e] border-t border-[#2a2a2a] flex items-center justify-around px-2 py-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <NavLink
          to="/"
          className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive && !inProject ? 'text-[var(--theme-primary)]' : 'text-[#606060]'}`}
          end
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium">Home</span>
        </NavLink>

        {inProject && (
          <NavLink
            to={`/project/${projectId}/dashboard`}
            className={({ isActive }) => {
              // L4 fix: no nested template literals
              const active = isDashboardActive(isActive);
              return `flex flex-col items-center gap-1 ${active ? 'text-[var(--theme-primary)]' : 'text-[#606060]'}`;
            }}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] font-medium">Dashboard</span>
          </NavLink>
        )}

        <button onClick={signOut} className="flex flex-col items-center gap-1 text-[#ff4d4d]">
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-medium">Logout</span>
        </button>
      </nav>
      {/* ── Setup Guide Modal ── */}
      {hasOpenedGuide && (
        <Suspense fallback={null}>
          <SetupGuideModal open={showGuideModal} onClose={() => setShowGuideModal(false)} />
        </Suspense>
      )}
    </div>
  );
}
