'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Briefcase, CheckCircle2, AlertTriangle, Clock, 
  MapPin, LogOut, Loader2, Sparkles, TrendingUp, UserCheck
} from 'lucide-react';

export default function OfficerPortal() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Authentication gate
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (session?.user && (session.user as any).role !== 'officer') {
      const r = (session.user as any).role;
      if (r === 'cm') router.push('/cm');
      if (r === 'citizen') router.push('/citizen');
    }
  }, [session, status, router]);

  // Officer specific data
  const [officerProfile, setOfficerProfile] = useState<any | null>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch officer statistics and assigned complaints
  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      // 1. Fetch Officer profile (to get trust score details)
      const offRes = await fetch('/api/officers');
      const offData = await offRes.json();
      if (Array.isArray(offData)) {
        // Find matching officer profile based on session User ID
        const matched = offData.find(o => o.userId?._id === (session?.user as any)?.id);
        if (matched) {
          setOfficerProfile(matched);
        }
      }

      // 2. Fetch assigned complaints
      const compRes = await fetch(`/api/complaints?role=officer&userId=${(session?.user as any)?.id}`);
      const compData = await compRes.json();
      if (Array.isArray(compData)) {
        setComplaints(compData);
        // Retain selected complaint reference if it still exists
        if (compData.length > 0) {
          setSelectedComplaint(compData[0]);
        } else {
          setSelectedComplaint(null);
        }
      }
    } catch (err) {
      console.error('Failed to load officer workspace data:', err);
      setErrorMsg('Failed to sync officer caseload.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchData();
    }
  }, [session]);

  const handleResolve = async (complaintId: string) => {
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/complaints/${complaintId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mockOfficerId: (session?.user as any)?.id })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('Grievance marked as officially resolved. Reality score recalculated.');
        await fetchData(); // refresh stats
      } else {
        setErrorMsg(data.error || 'Failed to submit resolution');
      }
    } catch (err) {
      setErrorMsg('Error connecting to resolver API.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper: SLA Countdown renderer
  const renderSLACountdown = (complaint: any) => {
    if (complaint.status === 'resolved') {
      return <span className="text-emerald-400 font-bold">Resolved</span>;
    }

    const createdDate = new Date(complaint.createdAt);
    const slaDays = complaint.departmentId?.slaDays || 7;
    const dueDate = new Date(createdDate.getTime() + slaDays * 24 * 60 * 60 * 1000);
    const diffMs = dueDate.getTime() - Date.now();
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

    if (diffHours < 0) {
      return (
        <span className="text-red-400 font-bold flex items-center space-x-1">
          <AlertTriangle className="h-3 w-3 animate-pulse" />
          <span>Breached ({Math.abs(Math.floor(diffHours / 24))}d ago)</span>
        </span>
      );
    }

    if (diffHours <= 24) {
      return <span className="text-yellow-400 font-bold animate-pulse">{diffHours}h remaining</span>;
    }

    const diffDays = Math.ceil(diffHours / 24);
    return <span className="text-zinc-300">{diffDays} days remaining</span>;
  };

  // Calculate Officer statistics dynamically
  const activeCount = complaints.filter(c => ['assigned', 'in_progress'].includes(c.status)).length;
  // Bandwidth score: starts at 100, drops by 15 for every active task
  const bandwidthScore = Math.max(0, 100 - activeCount * 15);
  let bandwidthLevel = 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
  if (bandwidthScore < 40) {
    bandwidthLevel = 'text-red-400 border-red-500/20 bg-red-500/5';
  } else if (bandwidthScore < 75) {
    bandwidthLevel = 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5';
  }

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#09090b]">
        <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col">
      {/* Navigation Header */}
      <header className="glass-panel border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">Officer Field Console</h1>
            <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
              {officerProfile?.departmentId?.name || 'Public Services Department'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-white">{session?.user?.name || 'Field Officer'}</p>
            <p className="text-[9px] text-zinc-500">Staff Account</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center hover:bg-zinc-800 transition-all"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Top metrics dashboard */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Trust Score Card */}
          <div className="glass-panel-glow rounded-3xl p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Officer Trust Score</span>
              <span className="text-3xl font-extrabold text-white">{officerProfile?.trustScore ?? 80}%</span>
              <p className="text-[10px] text-purple-400">Target Benchmark: 85%</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>

          {/* Active Workload Card */}
          <div className="glass-panel rounded-3xl p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Active Caseload</span>
              <span className="text-3xl font-extrabold text-white">{activeCount}</span>
              <p className="text-[10px] text-zinc-400">Assigned & In Progress</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Clock className="h-6 w-6" />
            </div>
          </div>

          {/* Bandwidth Score Card */}
          <div className="glass-panel rounded-3xl p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Bandwidth Score</span>
              <span className="text-3xl font-extrabold text-white">{bandwidthScore}%</span>
              <span className={`text-[8px] font-bold border px-1.5 py-0.5 rounded uppercase mt-1 inline-block ${bandwidthLevel}`}>
                {bandwidthScore > 75 ? 'Optimal' : bandwidthScore > 40 ? 'Moderate' : 'Overloaded'}
              </span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-400">
              <Clock className="h-6 w-6" />
            </div>
          </div>

          {/* Approval Rate Card */}
          <div className="glass-panel rounded-3xl p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Citizen Approval Rate</span>
              <span className="text-3xl font-extrabold text-white">{officerProfile?.citizenApprovalRate ?? 100}%</span>
              <p className="text-[10px] text-zinc-400">Based on past resolutions</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <UserCheck className="h-6 w-6" />
            </div>
          </div>
        </section>

        {/* Dynamic content grid */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Active Grievances caseload list (5 cols) */}
          <div className="lg:col-span-5 glass-panel rounded-3xl p-6 flex flex-col h-[540px] overflow-hidden">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
              <Briefcase className="h-4 w-4 text-blue-400" />
              <span>Assigned Caseload</span>
            </h3>

            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
              </div>
            ) : complaints.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <CheckCircle2 className="h-10 w-10 text-zinc-700 mb-2" />
                <p className="text-xs text-zinc-500">Awesome! No pending assigned tasks.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {complaints.map((c) => {
                  const isSelected = selectedComplaint?._id === c._id;
                  let priorityColor = 'border-zinc-800 text-zinc-400';
                  if (c.priority === 'critical') priorityColor = 'border-red-500/20 text-red-400 bg-red-500/5';
                  else if (c.priority === 'high') priorityColor = 'border-orange-500/20 text-orange-400 bg-orange-500/5';

                  return (
                    <div
                      key={c._id}
                      onClick={() => setSelectedComplaint(c)}
                      className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-blue-950/20 border-blue-500/30' 
                          : 'bg-zinc-900/30 border-zinc-800/80 hover:bg-zinc-900/60'
                      }`}
                    >
                      <div className="flex items-start justify-between space-x-2">
                        <h4 className="text-xs font-semibold text-white line-clamp-1">{c.title}</h4>
                        {c.priority === 'critical' && (
                          <span className="text-[7px] font-bold uppercase tracking-wider border border-red-500/30 bg-red-500/10 text-red-400 px-1 rounded-sm">
                            Critical
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">{c.location?.address.split(',')[0]}</p>
                      
                      <div className="flex items-center justify-between mt-3">
                        <div className="text-[9px] flex items-center space-x-1 text-zinc-500">
                          <Clock className="h-3 w-3" />
                          <span>SLA: {renderSLACountdown(c)}</span>
                        </div>
                        <span className="text-[8px] font-bold border border-zinc-800 bg-zinc-950 text-zinc-400 px-1.5 py-0.5 rounded">
                          {c.category}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Details & Resolution pane (7 cols) */}
          <div className="lg:col-span-7 glass-panel rounded-3xl p-6 flex flex-col h-[540px] overflow-y-auto">
            {selectedComplaint ? (
              <div className="space-y-6">
                
                {/* Header */}
                <div>
                  <div className="flex items-center space-x-1 text-zinc-500 text-[9px] uppercase font-bold tracking-wider mb-1.5">
                    <MapPin className="h-3.5 w-3.5 text-blue-400" />
                    <span>{selectedComplaint.location?.address}</span>
                  </div>
                  <h3 className="text-base font-bold text-white leading-tight">{selectedComplaint.title}</h3>
                </div>

                {/* Info block */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-zinc-950/40 border border-zinc-800/60">
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase font-semibold block">Grievance Category</span>
                    <span className="text-xs font-bold text-white">{selectedComplaint.category}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase font-semibold block">SLA Threshold</span>
                    <span className="text-xs font-bold text-white">{selectedComplaint.departmentId?.slaDays || 7} Days SLA</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase font-semibold block">Citizen Name</span>
                    <span className="text-xs font-bold text-white">{selectedComplaint.citizenId?.name || 'Harshita Singh'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase font-semibold block">Priority Rank</span>
                    <span className="text-xs font-bold text-white uppercase">{selectedComplaint.priority}</span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">Grievance Details</span>
                  <p className="text-xs text-zinc-300 leading-relaxed bg-black/20 p-3.5 rounded-xl border border-zinc-900/60">
                    {selectedComplaint.description}
                  </p>
                </div>

                {/* Submission Resolution Panel */}
                <div className="pt-4 border-t border-zinc-900 space-y-4">
                  {successMsg && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400">
                      {successMsg}
                    </div>
                  )}

                  {errorMsg && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                      {errorMsg}
                    </div>
                  )}

                  {selectedComplaint.status !== 'resolved' ? (
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-xs font-bold text-white mb-1">Submit Field Resolution</h4>
                        <p className="text-[10px] text-zinc-400">
                          Submit proof of resolution. Note: The CMO Reality Engine will immediately recalculate validation indicators based on citizen confirmation.
                        </p>
                      </div>
                      
                      <button
                        onClick={() => handleResolve(selectedComplaint._id)}
                        disabled={submitting}
                        className="w-full flex items-center justify-center space-x-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-3 text-xs font-bold uppercase text-white tracking-wider transition-all disabled:bg-blue-800"
                      >
                        {submitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Confirm Grievance Resolved</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
                      <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                      <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Resolution Submitted</p>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Resolution has been officially recorded. Awaiting citizen confirmation or Reality Engine audits.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <Briefcase className="h-10 w-10 text-zinc-700 mb-2" />
                <p className="text-xs text-zinc-500">Select an active complaint from the caseload to view details.</p>
              </div>
            )}
          </div>

        </section>

        {/* Historical Trust Logs Section */}
        <section className="glass-panel rounded-3xl p-6">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-purple-400" />
            <span>Audit History & Trust Score Logs</span>
          </h3>
          
          {officerProfile?.trustHistory && officerProfile.trustHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead>
                  <tr className="border-b border-zinc-800 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    <th className="py-2.5">Date</th>
                    <th className="py-2.5">Recalculated Trust Score</th>
                    <th className="py-2.5">Adjustment Action Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {officerProfile.trustHistory.map((h: any, idx: number) => (
                    <tr key={idx} className="hover:bg-zinc-900/10">
                      <td className="py-3 text-[10px]">
                        {new Date(h.updatedAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 font-semibold text-white">
                        <span className={`px-2 py-0.5 rounded border text-[10px] ${
                          h.score >= 85 
                            ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' 
                            : h.score >= 60 
                            ? 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5' 
                            : 'text-red-400 border-red-500/20 bg-red-500/5'
                        }`}>
                          {h.score}%
                        </span>
                      </td>
                      <td className="py-3 text-zinc-400">{h.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">No trust score history logged yet.</p>
          )}
        </section>

      </main>
    </div>
  );
}
