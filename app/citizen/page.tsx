'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  PlusCircle, FileText, CheckCircle2, AlertTriangle, Clock, 
  MapPin, Mic, Square, Trash2, Camera, UploadCloud, LogOut, Loader2, Sparkles
} from 'lucide-react';

export default function CitizenPortal() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Authentication gate
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (session?.user && (session.user as any).role !== 'citizen') {
      // Redirect other roles to their dashboards
      const r = (session.user as any).role;
      if (r === 'cm') router.push('/cm');
      if (r === 'officer') router.push('/officer');
    }
  }, [session, status, router]);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('Colaba Causeway, South Mumbai, 400005');
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  // Voice Recording simulation state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);

  // App state
  const [complaints, setComplaints] = useState<any[]>([]);
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Coordinates Mapping based on neighborhood for seeding
  const coordinatesMap: Record<string, {lat: number, lng: number}> = {
    'Colaba Causeway, South Mumbai, 400005': { lat: 18.9226, lng: 72.8344 },
    'Flora Fountain, Fort, Mumbai, 400001': { lat: 18.9322, lng: 72.8310 },
    'Girgaon Chowpatty, Marine Drive, Mumbai, 400007': { lat: 18.9405, lng: 72.8250 },
    'Malabar Hill Road, Mumbai, 400006': { lat: 18.9500, lng: 72.8120 },
    'Byculla East Market, Mumbai, 400027': { lat: 18.9610, lng: 72.8420 },
    'Tardeo Main Circle, Mumbai, 400034': { lat: 18.9702, lng: 72.8210 }
  };

  const fetchComplaints = async () => {
    try {
      setLoadingList(true);
      const res = await fetch(`/api/complaints?role=citizen&userId=${(session?.user as any)?.id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setComplaints(data);
        if (data.length > 0 && !selectedComplaint) {
          setSelectedComplaint(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch complaints:', err);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchComplaints();
    }
  }, [session]);

  // Voice recording simulation timer
  useEffect(() => {
    if (isRecording) {
      recordingTimer.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimer.current) clearInterval(recordingTimer.current);
      setRecordingSeconds(0);
    }
    return () => {
      if (recordingTimer.current) clearInterval(recordingTimer.current);
    };
  }, [isRecording]);

  const handleStartRecording = () => {
    setIsRecording(true);
    setAudioUrl(null);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    // Simulate audio generation
    setAudioUrl('/mock-voice-recording.mp3');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const coords = coordinatesMap[address] || { lat: 19.0760, lng: 72.8777 };

    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          location: {
            lat: coords.lat,
            lng: coords.lng,
            address: address
          },
          imageUrl: imageFile || undefined,
          voiceUrl: audioUrl || undefined,
          mockCitizenId: (session?.user as any)?.id
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit complaint');
      }

      setSuccessMsg('Grievance logged successfully! AI Engine has auto-classified your report.');
      setTitle('');
      setDescription('');
      setImageFile(null);
      setAudioUrl(null);
      
      // Refresh list
      await fetchComplaints();
      // Select the new complaint
      setSelectedComplaint(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReopen = async (complaintId: string) => {
    try {
      const res = await fetch(`/api/complaints/${complaintId}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mockCitizenId: (session?.user as any)?.id })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('Complaint reopened! Reality Engine score recalculated to reflect dispute.');
        fetchComplaints();
        setSelectedComplaint(data);
      } else {
        setErrorMsg(data.error || 'Failed to reopen');
      }
    } catch (err) {
      setErrorMsg('Network error while reopening complaint.');
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
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col">
      {/* Header Banner */}
      <header className="glass-panel border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-purple-600/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">Citizen Workspace</h1>
            <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Civic Grievance Dashboard</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-white">{session?.user?.name || 'Guest Citizen'}</p>
            <p className="text-[9px] text-zinc-500">Citizen Account</p>
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

      {/* Main Grid Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Complaint Submission Form */}
        <section className="lg:col-span-5 space-y-6">
          <div className="glass-panel-glow rounded-3xl p-6 space-y-6">
            <div className="flex items-center space-x-2">
              <PlusCircle className="h-5 w-5 text-purple-400" />
              <h2 className="text-base font-semibold text-white">Lodge New Grievance</h2>
            </div>

            {successMsg && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-400">
                {successMsg}
              </div>
            )}
            
            {errorMsg && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-400">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase mb-1.5">Grievance Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Describe the issue briefly (e.g. Broken sewage pipe on main road)"
                  className="w-full rounded-xl border border-zinc-800 bg-black/40 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-purple-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase mb-1.5">Detailed Description</label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide precise details to help the AI engine classify department, severity, and critical risk flags."
                  className="w-full rounded-xl border border-zinc-800 bg-black/40 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-purple-500/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase mb-1.5">Select Landmark/Location</label>
                <select
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-white outline-none focus:border-purple-500/50"
                >
                  {Object.keys(coordinatesMap).map((key) => (
                    <option key={key} value={key} className="bg-zinc-950 text-white">
                      {key}
                    </option>
                  ))}
                </select>
              </div>

              {/* Media Attachments */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* Photo Upload Mock */}
                <div className="rounded-xl border border-dashed border-zinc-800 bg-black/30 p-4 flex flex-col items-center justify-center text-center relative overflow-hidden">
                  {imageFile ? (
                    <div className="absolute inset-0">
                      <img src={imageFile} alt="Preview" className="h-full w-full object-cover" />
                      <button 
                        onClick={() => setImageFile(null)} 
                        className="absolute top-1 right-1 p-1 bg-black/80 hover:bg-black rounded-full text-zinc-400 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Camera className="h-5 w-5 text-zinc-500 mb-1.5" />
                      <span className="text-[10px] text-zinc-400 font-medium">Attach Photograph</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageChange}
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                      />
                    </>
                  )}
                </div>

                {/* Voice Input Mock */}
                <div className="rounded-xl border border-dashed border-zinc-800 bg-black/30 p-4 flex flex-col items-center justify-center text-center relative">
                  {audioUrl ? (
                    <div className="flex flex-col items-center">
                      <Mic className="h-5 w-5 text-emerald-400 mb-1 animate-pulse" />
                      <span className="text-[9px] text-emerald-400 font-bold">Audio Attached</span>
                      <button 
                        onClick={() => setAudioUrl(null)} 
                        className="mt-1 text-[8px] text-red-400 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : isRecording ? (
                    <button type="button" onClick={handleStopRecording} className="flex flex-col items-center animate-pulse">
                      <Square className="h-5 w-5 text-red-500 mb-1" />
                      <span className="text-[9px] text-red-400 font-bold">Stop: {recordingSeconds}s</span>
                    </button>
                  ) : (
                    <button type="button" onClick={handleStartRecording} className="flex flex-col items-center">
                      <Mic className="h-5 w-5 text-zinc-500 mb-1.5 hover:text-purple-400 transition-colors" />
                      <span className="text-[10px] text-zinc-400 font-medium">Voice Grievance</span>
                    </button>
                  )}
                </div>

              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center space-x-2 rounded-xl bg-purple-600 hover:bg-purple-500 py-3 text-sm font-semibold text-white transition-all disabled:bg-purple-800"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Lodge and AI Classify</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        {/* Right Column: Track Complaints */}
        <section className="lg:col-span-7 grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Complaints List (1/3 of the right column width) */}
          <div className="md:col-span-5 glass-panel rounded-3xl p-4 flex flex-col h-[580px] overflow-hidden">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center space-x-2">
              <FileText className="h-4 w-4 text-purple-400" />
              <span>Grievance Tracker</span>
            </h3>

            {loadingList ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
              </div>
            ) : complaints.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <Clock className="h-8 w-8 text-zinc-600 mb-2" />
                <p className="text-xs text-zinc-500">No complaints registered yet.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {complaints.map((c) => {
                  const isSelected = selectedComplaint?._id === c._id;
                  let badgeColor = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
                  if (c.status === 'resolved') badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                  if (c.status === 'reopened') badgeColor = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';

                  return (
                    <div
                      key={c._id}
                      onClick={() => setSelectedComplaint(c)}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-purple-950/20 border-purple-500/30' 
                          : 'bg-zinc-900/30 border-zinc-800/80 hover:bg-zinc-900/60'
                      }`}
                    >
                      <h4 className="text-xs font-semibold text-white line-clamp-1">{c.title}</h4>
                      <p className="text-[10px] text-zinc-400 mt-1">{c.location?.address.split(',')[0]}</p>
                      
                      <div className="flex items-center justify-between mt-2.5">
                        <span className={`text-[8px] font-bold border px-1.5 py-0.5 rounded-md uppercase ${badgeColor}`}>
                          {c.status}
                        </span>
                        <span className="text-[9px] text-zinc-500">
                          {new Date(c.createdAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Complaint Details Panel (2/3 of the right column width) */}
          <div className="md:col-span-7 glass-panel rounded-3xl p-6 flex flex-col h-[580px] overflow-y-auto">
            {selectedComplaint ? (
              <div className="space-y-6">
                
                {/* Header */}
                <div>
                  <div className="flex items-center space-x-1.5 text-zinc-400 text-[10px] uppercase font-bold tracking-wider mb-1.5">
                    <MapPin className="h-3.5 w-3.5 text-purple-400" />
                    <span>{selectedComplaint.location?.address}</span>
                  </div>
                  <h3 className="text-base font-bold text-white leading-tight">{selectedComplaint.title}</h3>
                </div>

                {/* AI Classification Info block */}
                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-zinc-950/40 border border-zinc-800/60">
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase font-semibold block">AI Category</span>
                    <span className="text-xs font-bold text-white">{selectedComplaint.category}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase font-semibold block">Dept Code</span>
                    <span className="text-xs font-bold text-white">{selectedComplaint.departmentId?.code || 'GEN'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase font-semibold block">Risk Level</span>
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wide">{selectedComplaint.priority}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase font-semibold block">Assigned Officer</span>
                    <span className="text-xs font-medium text-white">{selectedComplaint.officerId?.name || 'Searching...'}</span>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">Grievance Details</span>
                  <p className="text-xs text-zinc-300 leading-relaxed bg-black/20 p-3 rounded-xl border border-zinc-900/60">
                    {selectedComplaint.description}
                  </p>
                </div>

                {/* Reality Layer Score Gauge */}
                <div className="p-4 rounded-2xl bg-purple-950/10 border border-purple-500/10 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-purple-400 uppercase tracking-wider block">Reality Validation score</span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-2xl font-extrabold text-white">{selectedComplaint.realityScore}</span>
                      <span className="text-zinc-500 text-xs">/100</span>
                    </div>
                    <p className="text-[10px] text-zinc-400">
                      Calculated from officer metrics, Citizen confirmation, and overlapping spatial markers.
                    </p>
                  </div>

                  <div className="text-center">
                    <span className="text-[8px] font-bold text-zinc-500 uppercase block mb-1">Status</span>
                    {selectedComplaint.realityStatus === 'Verified' && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                        Verified
                      </span>
                    )}
                    {selectedComplaint.realityStatus === 'Needs Verification' && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-yellow-500/20 bg-yellow-500/10 text-yellow-400">
                        Needs Audit
                      </span>
                    )}
                    {selectedComplaint.realityStatus === 'High Risk' && (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-red-500/20 bg-red-500/10 text-red-400 animate-pulse">
                        High Risk
                      </span>
                    )}
                  </div>
                </div>

                {/* Complaint timeline tracker */}
                <div>
                  <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider block mb-3">Resolution Timeline</span>
                  <div className="flex items-center justify-between relative pl-4 pr-4">
                    {/* Horizontal Line background */}
                    <div className="absolute top-[18px] left-[40px] right-[40px] h-[1px] bg-zinc-800 -z-10" />
                    
                    {/* Step 1: Created */}
                    <div className="flex flex-col items-center">
                      <div className="h-9 w-9 rounded-full bg-emerald-500/10 border border-emerald-400 flex items-center justify-center text-emerald-400 text-xs font-semibold">
                        1
                      </div>
                      <span className="text-[9px] text-zinc-400 font-bold mt-1.5">Lodged</span>
                    </div>

                    {/* Step 2: Assigned */}
                    <div className="flex flex-col items-center">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold ${
                        ['assigned', 'in_progress', 'resolved'].includes(selectedComplaint.status)
                          ? 'bg-emerald-500/10 border border-emerald-400 text-emerald-400'
                          : 'bg-zinc-950 border border-zinc-800 text-zinc-500'
                      }`}>
                        2
                      </div>
                      <span className="text-[9px] text-zinc-400 font-bold mt-1.5">Assigned</span>
                    </div>

                    {/* Step 3: In Progress */}
                    <div className="flex flex-col items-center">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold ${
                        ['in_progress', 'resolved'].includes(selectedComplaint.status)
                          ? 'bg-emerald-500/10 border border-emerald-400 text-emerald-400'
                          : 'bg-zinc-950 border border-zinc-800 text-zinc-500'
                      }`}>
                        3
                      </div>
                      <span className="text-[9px] text-zinc-400 font-bold mt-1.5">Resolving</span>
                    </div>

                    {/* Step 4: Resolved */}
                    <div className="flex flex-col items-center">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold ${
                        selectedComplaint.status === 'resolved'
                          ? 'bg-emerald-500/10 border border-emerald-400 text-emerald-400'
                          : selectedComplaint.status === 'reopened'
                          ? 'bg-indigo-500/10 border border-indigo-400 text-indigo-400'
                          : 'bg-zinc-950 border border-zinc-800 text-zinc-500'
                      }`}>
                        {selectedComplaint.status === 'reopened' ? '!' : '4'}
                      </div>
                      <span className="text-[9px] text-zinc-400 font-bold mt-1.5">
                        {selectedComplaint.status === 'reopened' ? 'Disputed' : 'Resolved'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dispute / Reopen button if status is resolved */}
                {selectedComplaint.status === 'resolved' && (
                  <div className="pt-4 border-t border-zinc-900 flex flex-col space-y-2">
                    <p className="text-[11px] text-zinc-400 text-center">
                      If the reported resolution does not reflect ground reality, dispute it to alert the CMO.
                    </p>
                    <button
                      onClick={() => handleReopen(selectedComplaint._id)}
                      className="w-full rounded-xl bg-red-600/15 hover:bg-red-600/35 border border-red-500/30 py-3 text-xs font-bold text-red-400 transition-all uppercase tracking-wider"
                    >
                      Dispute & Reopen Grievance
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <FileText className="h-10 w-10 text-zinc-700 mb-2" />
                <p className="text-xs text-zinc-500">Select a complaint from the tracker to view its ground truth score.</p>
              </div>
            )}
          </div>

        </section>
      </main>
    </div>
  );
}
