import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Shield, Key, Copy, RefreshCw, Cpu, Activity, Clock } from 'lucide-react';
import { useProjects } from '../hooks/useProjects';

function formatLastSeen(ts?: number) {
  if (!ts) return 'Never';
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const diff = (ts - Date.now()) / 1000;
  if (Math.abs(diff) < 60) return 'Just now';
  if (Math.abs(diff) < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (Math.abs(diff) < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  return new Date(ts).toLocaleDateString();
}

export default function DevicePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { projects, regenerateToken } = useProjects();
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const project = projects.find(p => p.id === projectId);

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(t);
    }
  }, [copied]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  if (!project) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(project.deviceToken || '');
      setCopied(true);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleRegenerate = async () => {
    if (confirm('Are you sure you want to regenerate the device token? You will need to update the ESP32 code with the new token.')) {
      setIsRegenerating(true);
      try {
        await regenerateToken(project.id);
      } catch (err) {
        console.error('Failed to regenerate token:', err);
      } finally {
        setIsRegenerating(false);
      }
    }
  };

  const isOnline = project.lastSeen ? (now - project.lastSeen < 35000) : false;

  return (
    <div className="h-full flex flex-col bg-[#121212] overflow-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center gap-3 shrink-0">
        <Shield className="w-5 h-5 text-[var(--theme-primary)]" />
        <div>
          <h2 className="text-[17px] font-semibold text-white">Device Security & Auth</h2>
          <p className="text-[12px] text-[#606060] mt-0.5">Manage authentication for {project.name}</p>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto w-full space-y-6">
        
        {/* Status Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isOnline ? 'bg-[var(--theme-primary)]/15' : 'bg-[#ff4d4d]/15'}`}>
              <Activity className={`w-5 h-5 ${isOnline ? 'text-[var(--theme-primary)]' : 'text-[#ff4d4d]'}`} />
            </div>
            <div>
              <p className="text-[11px] text-[#606060] uppercase tracking-widest font-semibold mb-1">Status</p>
              <p className={`text-[15px] font-bold ${isOnline ? 'text-[var(--theme-primary)]' : 'text-[#ff4d4d]'}`}>{isOnline ? 'Online' : 'Offline'}</p>
            </div>
          </div>
          <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[var(--theme-secondary)]/15 flex items-center justify-center">
              <Clock className="w-5 h-5 text-[var(--theme-secondary)]" />
            </div>
            <div>
              <p className="text-[11px] text-[#606060] uppercase tracking-widest font-semibold mb-1">Last Seen</p>
              <p className="text-[14px] font-medium text-white">{isOnline ? 'Active now' : formatLastSeen(project.lastSeen)}</p>
            </div>
          </div>
          <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#a78bfa]/15 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-[#a78bfa]" />
            </div>
            <div>
              <p className="text-[11px] text-[#606060] uppercase tracking-widest font-semibold mb-1">Board</p>
              <p className="text-[14px] font-medium text-white">{project.board}</p>
            </div>
          </div>
        </div>

        {/* Token Card */}
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-[var(--theme-primary)]/10 flex items-center justify-center">
              <Key className="w-5 h-5 text-[var(--theme-primary)]" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-white">Device Token</h3>
              <p className="text-[12px] text-[#606060] mt-1">Unique authentication key for your hardware</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Device ID */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#606060] mb-2">Device ID (Project ID)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={project.id}
                  className="w-full bg-[#121212] border border-[#2a2a2a] rounded-lg pl-4 pr-4 py-3 text-sm font-mono text-white focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-[#606060] mt-1">This tells Firebase which project folder to access.</p>
            </div>

            {/* Auth Email */}
            <div className="pt-2">
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#606060] mb-2">Auth Email (สำหรับใส่ใน Firebase)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`device-${project.id.replace(/^-/, '')}@device.local`}
                  className="w-full bg-[#121212] border border-[#2a2a2a] rounded-lg pl-4 pr-4 py-3 text-sm font-mono text-white focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-[#606060] mt-1">ใช้อีเมลนี้สร้างบัญชีในหน้า Firebase Authentication</p>
            </div>

            {/* Device Token (Password) */}
            <div className="pt-2">
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#606060] mb-2">Auth Token (รหัสผ่าน)</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    readOnly
                    value={project.deviceToken || 'Not generated yet'}
                    className="w-full bg-[#121212] border border-[#2a2a2a] rounded-lg pl-4 pr-12 py-3 text-sm font-mono text-[var(--theme-primary)] focus:outline-none"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span className={`text-[10px] font-bold uppercase transition-opacity ${copied ? 'opacity-100 text-[var(--theme-primary)]' : 'opacity-0'}`}>Copied!</span>
                  </div>
                </div>
                <button
                  onClick={handleCopy}
                  className="px-4 py-3 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg hover:bg-[#3a3a3a] hover:border-[#4a4a4a] transition-all flex items-center justify-center gap-2 group"
                >
                  <Copy className="w-4 h-4 text-[#a0a0a0] group-hover:text-white transition-colors" />
                  <span className="text-sm font-medium text-[#a0a0a0] group-hover:text-white transition-colors">Copy</span>
                </button>
              </div>
            </div>
            <p className="text-[11px] text-[#606060] leading-relaxed">
              Use this token in your ESP32 code to authenticate. Keep it secret.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-[#2a2a2a]">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-[13px] font-semibold text-white">Regenerate Token</h4>
                <p className="text-[11px] text-[#606060] mt-1">Invalidates the current token.</p>
              </div>
              <button
                onClick={handleRegenerate}
                className="px-4 py-2 bg-transparent border border-[#ff4d4d]/30 text-[#ff4d4d] text-sm font-medium rounded-lg hover:bg-[#ff4d4d]/10 hover:border-[#ff4d4d] transition-all flex items-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                Regenerate
              </button>
            </div>
          </div>
        </div>
        
        {/* Example Code snippet card */}
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-6">
            <h3 className="text-[13px] font-semibold text-white mb-3">Example Usage</h3>
            <pre className="bg-[#121212] border border-[#2a2a2a] rounded-lg p-4 overflow-x-auto">
              <code className="text-[12px] font-mono text-[#a0a0a0]">
<span className="text-[var(--theme-secondary)]">#define</span> WIFI_SSID <span className="text-[var(--theme-primary)]">"YourWiFi"</span><br/>
<span className="text-[var(--theme-secondary)]">#define</span> WIFI_PASS <span className="text-[var(--theme-primary)]">"YourPass"</span><br/>
<span className="text-[var(--theme-secondary)]">#define</span> FIREBASE_API_KEY <span className="text-[var(--theme-primary)]">"AIzaSyACUZS-I00EJkeFp4ZJoblAehJCeBKytZM"</span><br/>
<span className="text-[var(--theme-secondary)]">#define</span> FIREBASE_DATABASE_URL <span className="text-[var(--theme-primary)]">"https://smat-iot-by-pai-default-rtdb.asia-southeast1.firebasedatabase.app"</span><br/>
<span className="text-[var(--theme-secondary)]">#define</span> DEVICE_ID <span className="text-[var(--theme-primary)]">"{project.id}"</span><br/>
<span className="text-[var(--theme-secondary)]">#define</span> DEVICE_TOKEN <span className="text-[var(--theme-primary)]">"{project.deviceToken || 'YOUR_TOKEN'}"</span><br/><br/>
<span className="text-[#ff4d4d]">void</span> <span className="text-[#fbbd23]">setup</span>() {'{'}<br/>
{'  '}<span className="text-white">Cloud</span>.<span className="text-[#fbbd23]">begin</span>(WIFI_SSID, WIFI_PASS, FIREBASE_API_KEY, FIREBASE_DATABASE_URL, DEVICE_ID, DEVICE_TOKEN);<br/>
{'}'}
              </code>
            </pre>
        </div>

      </div>
    </div>
  );
}
