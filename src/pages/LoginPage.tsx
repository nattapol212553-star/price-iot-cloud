import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import { Leaf, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err: any) {
      setError('Invalid email or password.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212] p-4 font-sans text-white">
      <div className="w-full max-w-md bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[var(--theme-primary)]/15 flex items-center justify-center ring-1 ring-[var(--theme-primary)]/20 mb-4">
            <Leaf className="w-6 h-6 text-[var(--theme-primary)]" />
          </div>
          <h1 className="text-2xl font-bold tracking-widest uppercase">IoT Dashboard</h1>
          <p className="text-sm text-[#606060] mt-1">Sign in to manage your devices</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-[#ff4d4d]/10 border border-[#ff4d4d]/20 text-[#ff4d4d] text-sm text-center">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#606060] mb-2">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#121212] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--theme-primary)]/50 transition-colors"
              placeholder="admin@example.com"
            />
          </div>
          
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-[#606060] mb-2">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#121212] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[var(--theme-primary)]/50 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-6 py-3 bg-[var(--theme-primary)] text-black font-bold text-sm rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 glow-btn disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Lock className="w-4 h-4" />
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
