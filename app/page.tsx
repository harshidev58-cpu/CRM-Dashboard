'use client';

import React, { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, User, Briefcase, Eye, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [seedStatus, setSeedStatus] = useState('');

  // Handle redirect if user is already logged in
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const role = (session.user as any).role;
      if (role === 'cm') router.push('/cm');
      else if (role === 'officer') router.push('/officer');
      else router.push('/citizen');
    }
  }, [session, status, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error || 'Invalid credentials');
      } else {
        // Successful login, redirection handled by useEffect
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Quick login handler
  const handleQuickLogin = async (targetEmail: string, targetPass: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await signIn('credentials', {
        email: targetEmail,
        password: targetPass,
        redirect: false,
      });
      if (res?.error) {
        setError(res.error);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError('Failed to log in.');
    } finally {
      setLoading(false);
    }
  };

  // Database seed trigger
  const runSeed = async () => {
    setSeeding(true);
    setSeedStatus('Initializing...');
    try {
      const res = await fetch('/api/seed');
      const data = await res.json();
      if (data.success) {
        setSeedStatus('Database Seeded Successfully!');
      } else {
        setSeedStatus('Seeding failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      setSeedStatus('Failed to connect to seeder.');
    } finally {
      setTimeout(() => {
        setSeeding(false);
        setSeedStatus('');
      }, 3000);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#09090b]">
        <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      {/* Background Decorative Gradients */}
      <div className="absolute top-1/4 left-1/4 -z-10 h-72 w-72 rounded-full bg-purple-600/10 blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 h-72 w-72 rounded-full bg-indigo-600/10 blur-[120px]" />

      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-600/10 border border-purple-500/20 text-purple-400 mb-4 pulse-glow-violet">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-purple-400 bg-clip-text text-transparent">
            CIVIC SHIELD
          </h1>
          <p className="text-sm font-semibold tracking-widest text-purple-400 uppercase mt-1">
            Reality Layer v1.0
          </p>
          <p className="text-xs text-zinc-400 mt-2 max-w-xs mx-auto">
            CMO Governance Intelligence Engine separating officer-reported statistics from ground reality.
          </p>
        </div>

        {/* Credentials Form Card */}
        <div className="glass-panel-glow rounded-3xl p-8">
          <h2 className="text-lg font-semibold text-white mb-6">Access Control Panel</h2>
          
          {error && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase mb-1.5">Official Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@gov.in"
                required
                className="w-full rounded-xl border border-zinc-800 bg-black/40 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-purple-500/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 uppercase mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-zinc-800 bg-black/40 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-purple-500/50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white transition-all hover:bg-purple-500 disabled:bg-purple-800"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Authenticate Credentials'}
            </button>
          </form>

          {/* Quick Access Seeds */}
          <div className="mt-8 pt-6 border-t border-zinc-800/60">
            <p className="text-xs font-medium text-zinc-400 uppercase mb-4 tracking-wider">Quick Persona Selector</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleQuickLogin('cm@gov.in', 'cm123')}
                disabled={loading}
                className="flex flex-col items-center justify-center rounded-xl bg-zinc-900/60 border border-zinc-800 p-2.5 text-center transition-all hover:border-purple-500/40 hover:bg-zinc-900"
              >
                <Eye className="h-4 w-4 text-purple-400 mb-1" />
                <span className="text-[10px] font-bold text-white">Chief Minister</span>
                <span className="text-[8px] text-zinc-500 mt-0.5">CMO Audit</span>
              </button>

              <button
                onClick={() => handleQuickLogin('citizen@gov.in', 'citizen123')}
                disabled={loading}
                className="flex flex-col items-center justify-center rounded-xl bg-zinc-900/60 border border-zinc-800 p-2.5 text-center transition-all hover:border-emerald-500/40 hover:bg-zinc-900"
              >
                <User className="h-4 w-4 text-emerald-400 mb-1" />
                <span className="text-[10px] font-bold text-white">Citizen</span>
                <span className="text-[8px] text-zinc-500 mt-0.5">Harshita Singh</span>
              </button>

              <button
                onClick={() => handleQuickLogin('officer_water@gov.in', 'officer123')}
                disabled={loading}
                className="flex flex-col items-center justify-center rounded-xl bg-zinc-900/60 border border-zinc-800 p-2.5 text-center transition-all hover:border-blue-500/40 hover:bg-zinc-900"
              >
                <Briefcase className="h-4 w-4 text-blue-400 mb-1" />
                <span className="text-[10px] font-bold text-white">Officer</span>
                <span className="text-[8px] text-zinc-500 mt-0.5">Water Board</span>
              </button>
            </div>
          </div>
        </div>

        {/* Database Seeder controls */}
        <div className="mt-6 text-center">
          <button
            onClick={runSeed}
            disabled={seeding}
            className="text-xs text-zinc-500 hover:text-purple-400 underline transition-all"
          >
            {seeding ? seedStatus : 'Reset & Seed Demo Database'}
          </button>
        </div>
      </div>
    </div>
  );
}
