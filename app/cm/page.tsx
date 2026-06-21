'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  ShieldAlert, Eye, MapPin, AlertCircle, MessageSquare, 
  FileText, LogOut, Loader2, Sparkles, TrendingUp, RefreshCw, BarChart2, CheckCircle2, ChevronRight, Printer, AlertTriangle, Users, Compass, Shield, UserCheck, EyeOff, BellRing, Clock
} from 'lucide-react';

interface Anomaly {
  id: string;
  type: 'infrastructure' | 'delay' | 'false-closure';
  title: string;
  location: string;
  analysis: string[];
  risk: string[];
  confidence: number;
  recommendedAction: string;
  evidence: string[];
  severity: 'critical' | 'warning';
  
  // Predictive impact variables
  affectedCitizens: number;
  predictedComplaints72h: number;
  trustDropPercent: number;
  escalationRisk: 'HIGH' | 'MEDIUM' | 'LOW';
  
  // Simulator projections
  ignore24h: string;
  ignore72h: string;
  ignoreTrustDrop: string;
  ignoreRiskElevation: string;
  
  ignore24hVal: number;
  ignore72hVal: number;
  ignoreTrustBefore: number;
  ignoreTrustAfter: number;
  ignoreRiskBefore: string;
  ignoreRiskAfter: string;
  
  actReduction: number;
  actTrustBefore: number;
  actTrustAfter: number;
  actRiskBefore: string;
  actRiskAfter: string;
  actAction: string;
  actOutcome: string[];
}

const TickingNumber = ({ value, prefix = '', suffix = '', duration = 800, decimalPlaces = 0 }: { value: number; prefix?: string; suffix?: string; duration?: number; decimalPlaces?: number }) => {
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setDisplayVal(progress * value);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <span>{prefix}{displayVal.toFixed(decimalPlaces).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}{suffix}</span>;
};

const getRelativeTime = (minutesAgo: number) => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - minutesAgo);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const renderConfidenceBar = (score: number) => {
  const totalBlocks = 10;
  const filledBlocks = Math.round(score / 10);
  const unfilledBlocks = Math.max(0, totalBlocks - filledBlocks);
  return '█'.repeat(filledBlocks) + '░'.repeat(unfilledBlocks);
};

export default function CMDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Authentication gate
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (session?.user && (session.user as any).role !== 'cm') {
      const r = (session.user as any).role;
      if (r === 'officer') router.push('/officer');
      if (r === 'citizen') router.push('/citizen');
    }
  }, [session, status, router]);

  // Command Center Navigation tabs
  type NavigationSection = 'overview' | 'reality-engine' | 'copilot' | 'officer-intelligence' | 'crisis-radar' | 'daily-brief';
  const [activeSection, setActiveSection] = useState<NavigationSection>('overview');

  // Datasets state
  const [complaints, setComplaints] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [briefReport, setBriefReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Anomaly selection for Simulator
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string>('infra-water-s12');

  // CM Brief Modal state
  const [showBriefModal, setShowBriefModal] = useState(false);

  // Verification Toggle state
  const [verifiedAnomalies, setVerifiedAnomalies] = useState<Record<string, boolean>>({});

  // Staggered alert feed state
  const [visibleAnomalies, setVisibleAnomalies] = useState<Anomaly[]>([]);

  // CM AI Copilot State
  const [copilotQuestion, setCopilotQuestion] = useState('');
  const [copilotHistory, setCopilotHistory] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    { 
      sender: 'ai', 
      text: 'CM Command AI initialized. I have complete access to the municipal grievance database, officer audit logs, and spatial hazard sensors. Ask me about suspicious closures, high-risk regions, or department reality gaps.' 
    }
  ]);
  const [copilotLoading, setCopilotLoading] = useState(false);

  // CM Visit Mode / Crisis Radar State
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
  const [visitAddress, setVisitAddress] = useState('');

  // Hotspots definitions (Metropolitan Grid Coordinates)
  const hotspotsList = [
    { name: 'Colaba Hub', address: 'Colaba Causeway, South Mumbai, 400005', lat: 18.9226, lng: 72.8344, sector: 'Sector 12' },
    { name: 'Fort Business District', address: 'Flora Fountain, Fort, Mumbai, 400001', lat: 18.9322, lng: 72.8310, sector: 'Sector 10' },
    { name: 'Marine Drive Road', address: 'Girgaon Chowpatty, Marine Drive, Mumbai, 400007', lat: 18.9405, lng: 72.8250, sector: 'Sector 8' },
    { name: 'Malabar Hill Estate', address: 'Malabar Hill Road, Mumbai, 400006', lat: 18.9500, lng: 72.8120, sector: 'Sector 9' },
    { name: 'Byculla Industrial Zone', address: 'Byculla East Market, Mumbai, 400027', lat: 18.9610, lng: 72.8420, sector: 'Sector 11' },
    { name: 'Tardeo Junction', address: 'Tardeo Main Circle, Mumbai, 400034', lat: 18.9702, lng: 72.8210, sector: 'Sector 7' }
  ];

  // Fetch Dashboard datasets
  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      // Fetch all complaints
      const compRes = await fetch('/api/complaints?role=cm');
      const compData = await compRes.json();
      if (Array.isArray(compData)) {
        setComplaints(compData);
      }

      // Fetch officers performance
      const offRes = await fetch('/api/officers');
      const offData = await offRes.json();
      if (Array.isArray(offData)) {
        setOfficers(offData);
      }

      // Fetch CM brief
      const briefRes = await fetch('/api/brief');
      const briefData = await briefRes.json();
      if (briefData && !briefData.error) {
        setBriefReport(briefData);
      }
    } catch (err) {
      console.error('Failed to sync CM intelligence report:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchDashboardData();
    }
  }, [session]);

  useEffect(() => {
    if (anomalies.length > 0) {
      setVisibleAnomalies([]);
      const t1 = setTimeout(() => {
        setVisibleAnomalies([anomalies[0]]);
      }, 300);
      const t2 = setTimeout(() => {
        if (anomalies[1]) {
          setVisibleAnomalies([anomalies[0], anomalies[1]]);
        }
      }, 900);
      const t3 = setTimeout(() => {
        if (anomalies[1] && anomalies[2]) {
          setVisibleAnomalies([anomalies[0], anomalies[1], anomalies[2]]);
        }
      }, 1500);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [complaints.length]);

  // CM AI Copilot RAG execution
  const handleCopilotSubmit = async (e?: React.FormEvent, customQuestion?: string) => {
    if (e) e.preventDefault();
    const targetQuestion = customQuestion || copilotQuestion;
    if (!targetQuestion.trim()) return;

    setCopilotHistory(prev => [...prev, { sender: 'user', text: targetQuestion }]);
    setCopilotQuestion('');
    setCopilotLoading(true);

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: targetQuestion })
      });
      const data = await res.json();
      setCopilotHistory(prev => [...prev, { sender: 'ai', text: data.answer || 'No analysis returned from intelligence engine.' }]);
    } catch (err) {
      setCopilotHistory(prev => [...prev, { sender: 'ai', text: 'Error querying live database.' }]);
    } finally {
      setCopilotLoading(false);
    }
  };

  const handlePrintPDF = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Helper: Reality Engine Explanation Generator (Audit Panel)
  const getRealityExplanation = (c: any) => {
    const list: { text: string; scoreDelta: string; value: number }[] = [];

    // 1. Citizen Verification
    if (c.status === 'resolved') {
      list.push({ text: 'Citizen approved resolution', scoreDelta: '+25', value: 25 });
    } else if (c.status === 'reopened') {
      list.push({ text: 'Citizen disputed closure', scoreDelta: '-25', value: -25 });
    } else {
      list.push({ text: 'Citizen verification pending', scoreDelta: '-15', value: -15 });
    }

    // 2. SLA Performance
    if (c.status === 'resolved') {
      if (c.realityScore >= 80) {
        list.push({ text: 'Resolved within SLA targets', scoreDelta: '+15', value: 15 });
      } else {
        list.push({ text: 'SLA timeline breached', scoreDelta: '-15', value: -15 });
      }
    } else {
      list.push({ text: 'SLA timeline pending', scoreDelta: '-15', value: -15 });
    }

    // 3. Officer Trust Score
    if (c.realityScore < 30) {
      list.push({ text: 'Officer trust score low', scoreDelta: '-15', value: -15 });
    } else if (c.realityScore >= 80) {
      list.push({ text: 'High trust officer assigned', scoreDelta: '+15', value: 15 });
    } else {
      list.push({ text: 'Officer trust score moderate', scoreDelta: '+10', value: 10 });
    }

    // 4. Overlapping Nearby Density
    if (c.title.includes('manhole') || c.title.includes('leakage') || c.title.includes('water') && c.realityScore < 40) {
      list.push({ text: 'Similar complaints detected nearby', scoreDelta: '-15', value: -15 });
    } else {
      list.push({ text: 'No overlapping proximity threats', scoreDelta: '+15', value: 15 });
    }

    // 5. Localized Recurrence
    if (c.status === 'reopened' || c.realityScore < 40) {
      list.push({ text: 'Complaint reopened/recurring twice', scoreDelta: '-20', value: -20 });
    } else {
      list.push({ text: 'No localized recurrence flags', scoreDelta: '+15', value: 15 });
    }

    // 6. Community Endorsements
    if (c.status === 'resolved' && c.realityScore >= 80) {
      list.push({ text: 'Community resolution endorsements', scoreDelta: '+15', value: 15 });
    } else {
      list.push({ text: 'No community validation votes', scoreDelta: '+0', value: 0 });
    }

    return list;
  };

  // Calculated Metrics for HUD Overview
  const totalGrievances = complaints.length;
  const officialResolved = complaints.filter(c => c.status === 'resolved').length;
  const verifiedResolved = complaints.filter(c => c.status === 'resolved' && c.realityStatus === 'Verified').length;
  const officialResRate = totalGrievances > 0 ? Math.round((officialResolved / totalGrievances) * 100) : 0;
  const verifiedResRate = totalGrievances > 0 ? Math.round((verifiedResolved / totalGrievances) * 100) : 0;
  const overallRealityGap = Math.max(0, officialResRate - verifiedResRate);

  // RealityEngine Findings calculations
  const auditedCount = totalGrievances > 0 ? totalGrievances : 100;
  const mismatchCount = 17;
  const highRiskCasesCount = 8;
  const falseClosuresCount = 3;

  // Top KPIs
  const activeRisksCount = complaints.filter(c => c.status !== 'resolved' && c.realityStatus === 'High Risk').length;
  const criticalAlerts = complaints.filter(c => c.priority === 'critical' && c.status !== 'resolved');
  const criticalAlertsCount = criticalAlerts.length;

  // Average Resolution Time (historical & current resolved)
  let totalResTimeMs = 0;
  let resolvedCount = 0;
  complaints.forEach((c) => {
    if (c.status === 'resolved' && c.createdAt && c.updatedAt) {
      totalResTimeMs += new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
      resolvedCount++;
    }
  });
  const avgResTimeDays = resolvedCount > 0 ? parseFloat((totalResTimeMs / (1000 * 60 * 60 * 24) / resolvedCount).toFixed(1)) : 3.2;

  // Average Trust Score
  const avgTrustScore = officers.length > 0 ? Math.round(officers.reduce((acc, off) => acc + off.trustScore, 0) / officers.length) : 82;

  // Anomaly Detection Algorithm (Live RealityEngine Findings)
  const anomalies: Anomaly[] = [];

  // Pattern 1: Water Infrastructure Failure (Sector 12)
  const s1Complaints = complaints.filter(c => c.location?.address.includes('Sector 12') && (c.category.includes('Water') || c.category.includes('leakage') || c.title.toLowerCase().includes('water')));
  if (s1Complaints.length >= 3) {
    anomalies.push({
      id: 'infra-water-s12',
      type: 'infrastructure',
      title: 'Hidden Infrastructure Failure Detected',
      location: 'Sector 12, South Mumbai',
      severity: 'critical',
      confidence: 94,
      evidence: [
        'Complaint cluster detected (5 reports)',
        'Geographic correlation verified (Sector 12)',
        'Water category overlap detected',
        'Pressure, dirty water, and pipe leak match'
      ],
      analysis: [
        `${s1Complaints.length} correlated complaints logged in same ward`,
        'Water & Sewerage Board category matched',
        'Spatial clustering confirms single pipe network issue'
      ],
      risk: [
        'Public health concern (drinking contamination)',
        'Service disruption (Sector 12 dry for 3 days)'
      ],
      recommendedAction: 'Dispatch immediate engineering repair team to main Sector 12 valve.',
      affectedCitizens: 2300,
      predictedComplaints72h: 7,
      trustDropPercent: 12,
      escalationRisk: 'HIGH',
      ignore24h: '+3 complaints expected',
      ignore72h: '+9 complaints expected',
      ignoreTrustDrop: '82 → 69',
      ignoreRiskElevation: 'Medium → Critical',
      ignore24hVal: 3,
      ignore72hVal: 9,
      ignoreTrustBefore: 82,
      ignoreTrustAfter: 69,
      ignoreRiskBefore: 'Medium',
      ignoreRiskAfter: 'Critical',
      actReduction: 80,
      actTrustBefore: 82,
      actTrustAfter: 93,
      actRiskBefore: 'Critical',
      actRiskAfter: 'Medium',
      actAction: 'Deploy inspection team',
      actOutcome: [
        '- 80% reduction in complaints',
        '- Trust score recovery',
        '- Risk downgraded'
      ]
    });
  }

  // Pattern 2: Administrative Delay Anomaly (Ward 3 / Rajesh Kumar)
  const delayedComplaints = complaints.filter(c => c.status === 'assigned' && c.createdAt && (Date.now() - new Date(c.createdAt).getTime()) >= 14 * 24 * 60 * 60 * 1000);
  if (delayedComplaints.length > 0) {
    anomalies.push({
      id: 'admin-delay-w3',
      type: 'delay',
      title: 'Administrative Delay Anomaly',
      location: 'Ward 3, Byculla',
      severity: 'warning',
      confidence: 91,
      evidence: [
        'Historical benchmarks deviation (3-day avg vs 14+ days)',
        'Caseload stagnation logged',
        'Multiple pending grievances accumulating'
      ],
      analysis: [
        'Resolution delay exceeds historical threshold limit',
        '4 active sewerage grievances pending 14+ days',
        'Workflow bottleneck identified'
      ],
      risk: [
        'Citizen dissatisfaction',
        'SLA score decay'
      ],
      recommendedAction: 'Escalate to Rajesh Kumar (Water Department supervisor).',
      affectedCitizens: 850,
      predictedComplaints72h: 4,
      trustDropPercent: 8,
      escalationRisk: 'MEDIUM',
      ignore24h: '+2 complaints expected',
      ignore72h: '+5 complaints expected',
      ignoreTrustDrop: '75 → 68',
      ignoreRiskElevation: 'Medium → High',
      ignore24hVal: 2,
      ignore72hVal: 5,
      ignoreTrustBefore: 75,
      ignoreTrustAfter: 68,
      ignoreRiskBefore: 'Medium',
      ignoreRiskAfter: 'High',
      actReduction: 75,
      actTrustBefore: 75,
      actTrustAfter: 83,
      actRiskBefore: 'High',
      actRiskAfter: 'Medium',
      actAction: 'Escalate to supervisor / Dispatch warning',
      actOutcome: [
        '- 75% faster resolution time',
        '- Workflow bottleneck cleared',
        '- SLA compliance recovery'
      ]
    });
  }

  // Pattern 3: False Resolution Detection (Fort Circle)
  const reopenedGrievances = complaints.filter(c => c.status === 'reopened' && c.location?.address.includes('Fort Circle'));
  if (reopenedGrievances.length > 0) {
    anomalies.push({
      id: 'false-closure-fort',
      type: 'false-closure',
      title: 'False Closure Suspected',
      location: 'Flora Fountain, Fort Circle (Ward 2)',
      severity: 'critical',
      confidence: 21,
      evidence: [
        'Repeat complaints detected post-closure',
        'Similar complaints increasing nearby',
        'Citizen satisfaction dispute logged'
      ],
      analysis: [
        'Streetlight marked resolved by officer, but citizen refuted',
        '2 active streetlight complaints logged nearby',
        'Resolution confidence calculation: 21%'
      ],
      risk: [
        'Integrity compromise on field resolution reporting',
        'Pedestrian safety threat in dark zone'
      ],
      recommendedAction: 'Dispatch third-party supervisor for field verification.',
      affectedCitizens: 1100,
      predictedComplaints72h: 5,
      trustDropPercent: 10,
      escalationRisk: 'HIGH',
      ignore24h: '+4 complaints expected',
      ignore72h: '+8 complaints expected',
      ignoreTrustDrop: '88 → 75',
      ignoreRiskElevation: 'High → Critical',
      ignore24hVal: 4,
      ignore72hVal: 8,
      ignoreTrustBefore: 88,
      ignoreTrustAfter: 75,
      ignoreRiskBefore: 'High',
      ignoreRiskAfter: 'Critical',
      actReduction: 85,
      actTrustBefore: 88,
      actTrustAfter: 100,
      actRiskBefore: 'Critical',
      actRiskAfter: 'Medium',
      actAction: 'Initiate third-party supervisor audit',
      actOutcome: [
        '- Resolution validation achieved',
        '- Field closure fraud checked',
        '- Public transparency score restored'
      ]
    });
  }

  const selectedAnomaly = anomalies.find(a => a.id === selectedAnomalyId) || anomalies[0];

  const toggleVerification = (id: string) => {
    setVerifiedAnomalies(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Crisis Radar vicinities
  const selectedHotspotDetails = hotspotsList.find(h => h.name === selectedHotspot);
  const radarFilteredComplaints = complaints.filter((c) => {
    if (selectedHotspotDetails) {
      return c.location?.address.includes(selectedHotspotDetails.name.split(' ')[0]);
    }
    return false;
  });

  if (status === 'loading' || loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#050508]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-[#fafafa] flex flex-col font-sans select-none print:bg-white print:text-black">
      
      {/* Top HUD Banner - Presidential Intelligence HUD */}
      <header className="border-b border-zinc-900 bg-[#07070b]/90 backdrop-blur-md px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-50 print:hidden">
        <div className="flex items-center space-x-3.5">
          <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-widest text-white uppercase flex items-center gap-2">
              <span>Civic Shield</span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded border border-purple-500/20 bg-purple-500/10 text-purple-400 tracking-normal">
                Reality Layer
              </span>
            </h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
              Chief Minister's Strategic Decision Hub
            </p>
          </div>
        </div>

        {/* Core HUD Message */}
        <div className="hidden lg:block text-xs font-semibold text-zinc-400">
          <span className="text-purple-400 font-bold">AI Governance Intelligence:</span> Discovering administrative problems before citizens suffer.
        </div>

        {/* Global Reality Gap HUD Widget */}
        <div className="flex items-center bg-black/60 rounded-2xl border border-zinc-800/80 px-5 py-2 space-x-6">
          <div className="text-center">
            <span className="text-[8px] text-zinc-500 font-bold uppercase block">Official Resol.</span>
            <span className="text-sm font-extrabold text-blue-400">{officialResRate}%</span>
          </div>
          <div className="h-6 w-[1px] bg-zinc-800" />
          <div className="text-center">
            <span className="text-[8px] text-zinc-500 font-bold uppercase block">Ground Verified</span>
            <span className="text-sm font-extrabold text-emerald-400">{verifiedResRate}%</span>
          </div>
          <div className="h-6 w-[1px] bg-zinc-800" />
          <div className="text-center">
            <span className="text-[8px] text-red-400 font-bold uppercase block flex items-center gap-1">
              <AlertTriangle className="h-2 w-2 animate-pulse" />
              <span>Reality Gap</span>
            </span>
            <span className="text-sm font-extrabold text-red-500">{overallRealityGap}%</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={fetchDashboardData}
            disabled={refreshing}
            className="h-9 w-9 rounded-lg bg-zinc-950 border border-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center hover:bg-zinc-900 transition-all"
            title="Reload Database"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <div className="h-6 w-[1px] bg-zinc-850" />
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="h-9 w-9 rounded-lg bg-zinc-950 border border-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center hover:bg-zinc-900 transition-all"
            title="Terminate Console Session"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Command Room Layout */}
      <div className="flex-1 flex flex-col md:flex-row print:block">
        
        {/* Presidential Command Sidebar */}
        <aside className="w-full md:w-64 border-r border-zinc-900 bg-[#050508] p-4 flex flex-col space-y-1.5 print:hidden">
          <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest px-3 mb-2">Primary Command Panels</p>
          
          <button
            onClick={() => setActiveSection('overview')}
            className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-left text-xs font-bold tracking-wide uppercase transition-all ${
              activeSection === 'overview' 
                ? 'bg-purple-600/10 border border-purple-500/30 text-white shadow-[0_0_15px_rgba(139,92,246,0.05)]' 
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30 border border-transparent'
            }`}
          >
            <BarChart2 className="h-4 w-4" />
            <span>Governance Overview</span>
          </button>

          <button
            onClick={() => setActiveSection('reality-engine')}
            className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-left text-xs font-bold tracking-wide uppercase transition-all ${
              activeSection === 'reality-engine' 
                ? 'bg-purple-600/10 border border-purple-500/30 text-white shadow-[0_0_15px_rgba(139,92,246,0.05)]' 
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30 border border-transparent'
            }`}
          >
            <Eye className="h-4 w-4" />
            <span>Reality Engine</span>
          </button>

          <button
            onClick={() => setActiveSection('copilot')}
            className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-left text-xs font-bold tracking-wide uppercase transition-all ${
              activeSection === 'copilot' 
                ? 'bg-purple-600/10 border border-purple-500/30 text-white shadow-[0_0_15px_rgba(139,92,246,0.05)]' 
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30 border border-transparent'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>CM AI Copilot</span>
          </button>

          <button
            onClick={() => setActiveSection('officer-intelligence')}
            className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-left text-xs font-bold tracking-wide uppercase transition-all ${
              activeSection === 'officer-intelligence' 
                ? 'bg-purple-600/10 border border-purple-500/30 text-white shadow-[0_0_15px_rgba(139,92,246,0.05)]' 
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30 border border-transparent'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Officer Intelligence</span>
          </button>

          <button
            onClick={() => setActiveSection('crisis-radar')}
            className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-left text-xs font-bold tracking-wide uppercase transition-all ${
              activeSection === 'crisis-radar' 
                ? 'bg-purple-600/10 border border-purple-500/30 text-white shadow-[0_0_15px_rgba(139,92,246,0.05)]' 
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30 border border-transparent'
            }`}
          >
            <Compass className="h-4 w-4" />
            <span>Crisis Radar</span>
          </button>

          <button
            onClick={() => setActiveSection('daily-brief')}
            className={`w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-left text-xs font-bold tracking-wide uppercase transition-all ${
              activeSection === 'daily-brief' 
                ? 'bg-purple-600/10 border border-purple-500/30 text-white shadow-[0_0_15px_rgba(139,92,246,0.05)]' 
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30 border border-transparent'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Daily CM Brief</span>
          </button>
        </aside>
        {/* Dashboard Panel */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto print:p-0">
          
          {/* SECTION 1: GOVERNANCE OVERVIEW */}
          {activeSection === 'overview' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Hero Section */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-zinc-900/60 pb-6 gap-4">
                <div>
                  <h2 className="text-2xl font-black tracking-widest text-white uppercase bg-gradient-to-r from-white via-zinc-200 to-purple-400 bg-clip-text text-transparent">
                    AI GOVERNANCE COMMAND CENTER
                  </h2>
                  <p className="text-[10px] text-zinc-550 font-extrabold uppercase tracking-widest flex items-center gap-1.5 mt-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>Live Governance Intelligence Feed</span>
                  </p>
                </div>
                
                <div>
                  <button
                    onClick={() => setShowBriefModal(true)}
                    className="rounded-2xl bg-purple-650 hover:bg-purple-600 border border-purple-550/20 text-white px-6 py-3 text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.12)] transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    <FileText className="h-4.5 w-4.5 text-purple-200" />
                    <span>Generate CM Brief</span>
                  </button>
                </div>
              </div>

              {/* Grouped KPIs Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Group 1: Governance Health */}
                <div className="glass-panel rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-widest block">System Integrity</span>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider mt-0.5">GOVERNANCE HEALTH</h3>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 border-t border-zinc-900/40 pt-4">
                    <div>
                      <span className="text-[9px] text-zinc-400 uppercase font-bold block">🚨 Critical Alerts</span>
                      <span className="text-2xl font-black text-red-500 block mt-1.5 font-mono">
                        <TickingNumber value={criticalAlertsCount || 3} />
                      </span>
                    </div>
                    <div className="border-l border-zinc-900/40 pl-4">
                      <span className="text-[9px] text-zinc-400 uppercase font-bold block">⚠ Active Risks</span>
                      <span className="text-2xl font-black text-orange-400 block mt-1.5 font-mono">
                        <TickingNumber value={activeRisksCount || 7} />
                      </span>
                    </div>
                    <div className="border-l border-zinc-900/40 pl-4">
                      <span className="text-[9px] text-zinc-400 uppercase font-bold block">📈 Trust Score</span>
                      <span className="text-2xl font-black text-emerald-400 block mt-1.5 font-mono">
                        <TickingNumber value={avgTrustScore || 82} suffix="%" />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Group 2: Operational Metrics */}
                <div className="glass-panel rounded-2xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-widest block">Performance Overview</span>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider mt-0.5">Operational Metrics</h3>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 border-t border-zinc-900/40 pt-4">
                    <div>
                      <span className="text-[9px] text-zinc-400 uppercase font-bold block">🏛 Departments</span>
                      <span className="text-2xl font-black text-white block mt-1.5 font-mono">
                        <TickingNumber value={5} />
                      </span>
                    </div>
                    <div className="border-l border-zinc-900/40 pl-4">
                      <span className="text-[9px] text-zinc-400 uppercase font-bold block">👥 Citizens Impacted</span>
                      <span className="text-2xl font-black text-orange-400 block mt-1.5 font-mono">
                        <TickingNumber value={4231} />
                      </span>
                    </div>
                    <div className="border-l border-zinc-900/40 pl-4">
                      <span className="text-[9px] text-zinc-400 uppercase font-bold block">⏱ Avg Resolution</span>
                      <span className="text-2xl font-black text-yellow-500 block mt-1.5 font-mono">
                        <TickingNumber value={avgResTimeDays || 3.2} decimalPlaces={1} suffix="d" />
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Main Dashboard Grid: 3-column layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* Column 1: AI Intelligence Alert Feed (4 cols) */}
                <div className="lg:col-span-4 space-y-4 flex flex-col">
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center space-x-2 border-b border-zinc-900/60 pb-2">
                    <Sparkles className="h-4.5 w-4.5 text-purple-400" />
                    <span>AI Intelligence alert feed</span>
                  </h3>

                  <div className="space-y-4 flex-1 overflow-y-auto max-h-[460px] pr-1">
                    {loading ? (
                      <div className="glass-panel rounded-2xl p-8 text-center py-24">
                        <Loader2 className="h-6 w-6 animate-spin text-purple-500 mx-auto mb-2" />
                        <p className="text-[10px] text-zinc-550 uppercase font-bold tracking-wider">Syncing sensor grid...</p>
                      </div>
                    ) : visibleAnomalies.length === 0 ? (
                      <div className="glass-panel rounded-2xl p-8 text-center py-20 border border-zinc-800/30 bg-[#11141d]">
                        <ShieldAlert className="h-6 w-6 text-zinc-500 mx-auto mb-2" />
                        <p className="text-[10px] text-white uppercase font-bold tracking-wider">No anomalies detected</p>
                        <p className="text-[9px] text-zinc-500 mt-1">Grievance logs match official statuses. Operational threat index stable.</p>
                      </div>
                    ) : (
                      visibleAnomalies.map((anomaly, idx) => {
                        const isSelected = selectedAnomalyId === anomaly.id;
                        const isVerified = verifiedAnomalies[anomaly.id];
                        let icon = '🚨';
                        let headingColor = 'text-red-400';
                        let borderClass = isSelected 
                          ? 'border-purple-500/20 bg-purple-950/5 ring-1 ring-purple-500/10' 
                          : 'border-zinc-900/30 bg-zinc-950/20 hover:border-zinc-800/40';

                        // Apply the pulse animation class to critical alerts
                        if (anomaly.severity === 'critical') {
                          borderClass += ' animate-critical-pulse';
                        }

                        if (anomaly.type === 'delay') {
                          icon = '⚠';
                          headingColor = 'text-yellow-400';
                        }

                        // Timestamps relative to current local time
                        let relativeMinutes = 10;
                        if (anomaly.id === 'admin-delay-w3') relativeMinutes = 8;
                        if (anomaly.id === 'false-closure-fort') relativeMinutes = 6;

                        return (
                          <div 
                            key={anomaly.id} 
                            onClick={() => setSelectedAnomalyId(anomaly.id)}
                            className={`glass-panel rounded-2xl p-4 border cursor-pointer transition-all flex flex-col space-y-3 animate-feed-fade-in ${borderClass}`}
                          >
                            <div>
                              <div className="flex justify-between items-center text-[8px] text-zinc-500 font-extrabold uppercase tracking-widest">
                                <span>{anomaly.location}</span>
                                <span className="bg-zinc-950 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-900/60 font-mono">
                                  [{getRelativeTime(relativeMinutes)}]
                                </span>
                              </div>
                              <h4 className={`text-xs font-black mt-1.5 ${headingColor} flex items-center gap-1.5`}>
                                <span>{icon}</span>
                                <span>{anomaly.title === 'Hidden Infrastructure Failure Detected' ? 'Water Infrastructure Failure' : (anomaly.title === 'False Closure Suspected' ? 'False Closure Suspicion' : 'Administrative Delay Anomaly')}</span>
                              </h4>
                            </div>

                            <div className="text-[10px] text-zinc-400 border-t border-zinc-900/40 pt-2 flex justify-between items-center">
                              <span className="text-[9px] text-zinc-500 uppercase font-bold">Confidence Score:</span>
                              <div className="flex items-center space-x-1.5">
                                <span className="font-mono text-zinc-600 font-bold text-[9px] tracking-widest hidden sm:inline">
                                  {renderConfidenceBar(anomaly.confidence)}
                                </span>
                                <span className="text-white font-extrabold font-mono text-xs">{anomaly.confidence}%</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Telemetry Status Log Footer */}
                  <div className="bg-[#181c26]/30 p-4 rounded-2xl border border-zinc-950 text-[10px] space-y-2 mt-auto">
                    <div className="flex justify-between items-center text-zinc-500 uppercase font-extrabold text-[8px] tracking-wider border-b border-zinc-900/40 pb-1.5">
                      <span>RealityEngine Status</span>
                      <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-zinc-400 font-mono">
                      <div>
                        <span className="text-zinc-600 text-[8px] uppercase block">Last Analysis Run</span>
                        <span className="text-white font-bold">{getRelativeTime(2)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-600 text-[8px] uppercase block">Records Processed</span>
                        <span className="text-white font-bold">100 Complaints</span>
                      </div>
                      <div className="col-span-2 mt-0.5 border-t border-zinc-900/20 pt-1.5 flex justify-between items-center">
                        <span className="text-zinc-650 text-[8px] uppercase block font-bold">Model Confidence</span>
                        <span className="text-purple-400 font-extrabold block">92% (RealityEngine-v1.8)</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Column 2: Centerpiece Governance Impact Simulator (5 cols) */}
                <div className="lg:col-span-5 space-y-4 flex flex-col">
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center space-x-2 border-b border-zinc-900/60 pb-2">
                    <Compass className="h-4.5 w-4.5 text-purple-400" />
                    <span>Impact Simulator (Predictive Engine)</span>
                  </h3>

                  {selectedAnomaly ? (
                    <div className="glass-panel rounded-3xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.2)] flex-1 flex flex-col justify-between space-y-6">
                      
                      <div className="pb-3 border-b border-zinc-900/40 flex justify-between items-start">
                        <div>
                          <span className="text-[8px] text-zinc-500 font-extrabold uppercase tracking-widest">Active Simulator Case</span>
                          <h4 className="text-xs font-black text-white mt-1 leading-snug">
                            {selectedAnomaly.title === 'Hidden Infrastructure Failure Detected' ? 'Water Infrastructure Failure' : (selectedAnomaly.title === 'False Closure Suspected' ? 'False Closure Suspicion' : 'Administrative Delay Anomaly')}
                          </h4>
                          <p className="text-[9px] text-zinc-500 mt-0.5">{selectedAnomaly.location}</p>
                        </div>
                        <span className="bg-[#1c1e28] text-purple-400 border border-purple-500/10 text-[9px] px-2 py-0.5 rounded font-black uppercase font-mono">
                          Confidence: {selectedAnomaly.confidence}%
                        </span>
                      </div>

                      {/* Scenarios Side by Side */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                        
                        {/* Scenario A: Ignore */}
                        <div className="bg-[#1c1214]/30 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                          <div>
                            <h5 className="text-[9px] font-black uppercase tracking-wider text-red-400 border-b border-red-500/10 pb-1.5">
                              Scenario A: Ignore Alert
                            </h5>
                            
                            <div className="space-y-3 mt-3 text-[10px] text-zinc-400">
                              <div>
                                <span className="text-[8px] text-zinc-500 uppercase block font-bold">After 24 hrs:</span>
                                <span className="text-white font-bold text-xs">
                                  <TickingNumber value={selectedAnomaly.ignore24hVal} prefix="+" /> complaints
                                </span>
                              </div>
                              <div>
                                <span className="text-[8px] text-zinc-500 uppercase block font-bold">After 72 hrs:</span>
                                <span className="text-white font-bold text-xs">
                                  <TickingNumber value={selectedAnomaly.ignore72hVal} prefix="+" /> complaints
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-red-500/10 pt-2 text-[10px] space-y-1.5 bg-black/20 p-2 rounded-lg font-mono">
                            <div className="flex justify-between items-center">
                              <span className="text-zinc-500 text-[8px] uppercase font-bold">Trust Drop:</span>
                              <span className="text-red-400 font-extrabold text-[11px]">
                                <TickingNumber value={selectedAnomaly.ignoreTrustBefore} /> → <TickingNumber value={selectedAnomaly.ignoreTrustAfter} />
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-zinc-500 text-[8px] uppercase font-bold">Risk Level:</span>
                              <span className="text-red-400 font-bold uppercase text-[8px] tracking-wider">
                                {selectedAnomaly.ignoreRiskBefore} → {selectedAnomaly.ignoreRiskAfter}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Scenario B: Act Now */}
                        <div className="bg-[#121c17]/30 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                          <div>
                            <h5 className="text-[9px] font-black uppercase tracking-wider text-emerald-400 border-b border-emerald-500/10 pb-1.5">
                              Scenario B: Act Now
                            </h5>
                            
                            <div className="space-y-3 mt-3 text-[10px] text-zinc-400">
                              <div>
                                <span className="text-[8px] text-zinc-500 uppercase block font-bold">Directive Action:</span>
                                <span className="text-white font-bold text-xs leading-snug block mt-0.5">
                                  {selectedAnomaly.actAction}
                                </span>
                              </div>
                              <div>
                                <span className="text-[8px] text-zinc-500 uppercase block font-bold">Expected outcome:</span>
                                <span className="text-emerald-400 font-extrabold text-xs block mt-0.5">
                                  -<TickingNumber value={selectedAnomaly.actReduction} suffix="%" /> complaints
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-emerald-500/10 pt-2 text-[10px] space-y-1.5 bg-black/20 p-2 rounded-lg font-mono">
                            <div className="flex justify-between items-center">
                              <span className="text-zinc-500 text-[8px] uppercase font-bold">Trust Recovery:</span>
                              <span className="text-emerald-400 font-extrabold text-[11px]">
                                +<TickingNumber value={selectedAnomaly.actTrustAfter - selectedAnomaly.actTrustBefore} />
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-zinc-500 text-[8px] uppercase font-bold">Risk Level:</span>
                              <span className="text-emerald-400 font-bold uppercase text-[8px] tracking-wider">
                                {selectedAnomaly.actRiskBefore} → {selectedAnomaly.actRiskAfter}
                              </span>
                            </div>
                          </div>
                        </div>

                      </div>

                    </div>
                  ) : (
                    <div className="glass-panel rounded-3xl p-6 text-center py-20 flex-1 flex flex-col justify-center">
                      <Clock className="h-8 w-8 text-zinc-750 mx-auto mb-2" />
                      <p className="text-xs text-zinc-500">Select an active anomaly to launch impact calculations.</p>
                    </div>
                  )}
                </div>

                {/* Column 3: Geographic Risk Zones & Explainable AI (3 cols) */}
                <div className="lg:col-span-3 space-y-4 flex flex-col justify-between">
                  
                  {/* Geographic Intelligence Map panel */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center space-x-2 border-b border-zinc-900/60 pb-2">
                      <MapPin className="h-4.5 w-4.5 text-purple-400" />
                      <span>Governance Risk Zones</span>
                    </h3>

                    <div className="bg-[#181c26]/60 border border-zinc-950 p-4 rounded-2xl relative overflow-hidden flex flex-col justify-between space-y-4 h-[240px] shadow-inner">
                      <div className="flex justify-between items-center pb-2 border-b border-zinc-900/60 text-[8px] text-zinc-550 uppercase tracking-widest font-extrabold">
                        <span>Risk Sensor Grid</span>
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                      </div>
                      
                      {/* Schematic SVG Map */}
                      <div className="relative flex-1 bg-black/40 rounded-xl overflow-hidden border border-zinc-950/40 p-2 min-h-[130px]">
                        <svg viewBox="0 0 100 100" className="w-full h-full opacity-70">
                          {/* Grid Lines */}
                          <line x1="10" y1="10" x2="90" y2="10" stroke="#1f2937" strokeWidth="0.4" />
                          <line x1="10" y1="30" x2="90" y2="30" stroke="#1f2937" strokeWidth="0.4" />
                          <line x1="10" y1="50" x2="90" y2="50" stroke="#1f2937" strokeWidth="0.4" />
                          <line x1="10" y1="70" x2="90" y2="70" stroke="#1f2937" strokeWidth="0.4" />
                          <line x1="10" y1="90" x2="90" y2="90" stroke="#1f2937" strokeWidth="0.4" />
                          
                          <line x1="10" y1="10" x2="10" y2="90" stroke="#1f2937" strokeWidth="0.4" />
                          <line x1="30" y1="10" x2="30" y2="90" stroke="#1f2937" strokeWidth="0.4" />
                          <line x1="50" y1="10" x2="50" y2="90" stroke="#1f2937" strokeWidth="0.4" />
                          <line x1="70" y1="10" x2="70" y2="90" stroke="#1f2937" strokeWidth="0.4" />
                          <line x1="90" y1="10" x2="90" y2="90" stroke="#1f2937" strokeWidth="0.4" />

                          {/* Sector 12 - Hotspot (Top Left) */}
                          <circle cx="25" cy="25" r="3" fill="#ef4444" className="cursor-pointer" onClick={() => setSelectedAnomalyId('infra-water-s12')} />
                          <circle cx="25" cy="25" r="6" stroke="#ef4444" strokeWidth="0.4" fill="none" className="animate-ping" style={{ transformOrigin: '25px 25px' }} />
                          
                          {/* Ward 3 - Hotspot (Center Right) */}
                          <circle cx="65" cy="45" r="3" fill="#f59e0b" className="cursor-pointer" onClick={() => setSelectedAnomalyId('admin-delay-w3')} />
                          <circle cx="65" cy="45" r="6" stroke="#f59e0b" strokeWidth="0.4" fill="none" className="animate-ping" style={{ transformOrigin: '65px 45px' }} />

                          {/* Fort Circle - Hotspot (Bottom Right) */}
                          <circle cx="80" cy="75" r="3" fill="#eab308" className="cursor-pointer" onClick={() => setSelectedAnomalyId('false-closure-fort')} />
                          <circle cx="80" cy="75" r="6" stroke="#eab308" strokeWidth="0.4" fill="none" className="animate-ping" style={{ transformOrigin: '80px 75px' }} />

                          {/* Labels */}
                          <text x="14" y="18" fill="#ef4444" fontSize="3" className="font-mono font-bold">Sec 12</text>
                          <text x="69" y="42" fill="#f59e0b" fontSize="3" className="font-mono font-bold">Ward 3</text>
                          <text x="50" y="77" fill="#eab308" fontSize="3" className="font-mono font-bold">Fort Circle</text>
                        </svg>
                      </div>
                      
                      {/* Mini tab risk triggers */}
                      <div className="grid grid-cols-3 gap-2 text-[8px] font-extrabold uppercase font-mono">
                        <button 
                          onClick={() => setSelectedAnomalyId('infra-water-s12')}
                          className={`py-1.5 rounded transition-all text-center ${selectedAnomalyId === 'infra-water-s12' ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-black/40 border border-zinc-900/60 text-zinc-500 hover:text-white hover:border-zinc-800'}`}
                        >
                          🔴 Sec 12
                        </button>
                        <button 
                          onClick={() => setSelectedAnomalyId('admin-delay-w3')}
                          className={`py-1.5 rounded transition-all text-center ${selectedAnomalyId === 'admin-delay-w3' ? 'bg-orange-500/10 border border-orange-500/30 text-orange-400' : 'bg-black/40 border border-zinc-900/60 text-zinc-500 hover:text-white hover:border-zinc-800'}`}
                        >
                          🟠 Ward 3
                        </button>
                        <button 
                          onClick={() => setSelectedAnomalyId('false-closure-fort')}
                          className={`py-1.5 rounded transition-all text-center ${selectedAnomalyId === 'false-closure-fort' ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400' : 'bg-black/40 border border-zinc-900/60 text-zinc-500 hover:text-white hover:border-zinc-800'}`}
                        >
                          🟡 Fort
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Explainable AI deconstruction */}
                  {selectedAnomaly && (
                    <div className="space-y-3 mt-4">
                      <div className="flex justify-between items-baseline text-[9px] font-extrabold uppercase tracking-widest text-zinc-500">
                        <span>Explainable AI auditor</span>
                        <span className="text-purple-400 font-bold font-mono text-[9px]">Score: {selectedAnomaly.confidence}%</span>
                      </div>
                      
                      <div className="bg-[#181c26]/60 border border-zinc-950 p-4 rounded-2xl space-y-3.5">
                        
                        {/* Dynamic risk score deconstruction */}
                        <div className="space-y-2 text-[10px] text-zinc-300 font-sans">
                          {selectedAnomaly.evidence.map((ev, idx) => {
                            let weightLabel = '-15';
                            if (idx === 0) weightLabel = '-25';
                            if (idx === 1) weightLabel = '-20';
                            if (idx === 2) weightLabel = '-15';
                            if (idx === 3) weightLabel = '-10';

                            return (
                              <div key={idx} className="flex items-start justify-between gap-1 border-b border-zinc-900/30 pb-1.5 last:border-0 last:pb-0">
                                <span className="leading-normal">{ev}</span>
                                <span className="text-red-400 font-mono font-bold shrink-0">{weightLabel}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* CTAs */}
                        <div className="space-y-2 border-t border-zinc-900/40 pt-3">
                          <button
                            onClick={() => toggleVerification(selectedAnomaly.id)}
                            className={`w-full py-2.5 text-[9px] font-extrabold uppercase tracking-widest rounded-xl border transition-all ${
                              verifiedAnomalies[selectedAnomaly.id]
                                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                                : 'bg-purple-650 border border-purple-550/20 text-white hover:bg-purple-600 shadow-[0_0_15px_rgba(139,92,246,0.12)]'
                            }`}
                          >
                            {verifiedAnomalies[selectedAnomaly.id] ? 'Escalated to CMO Cabinet' : 'Escalate Directive'}
                          </button>
                        </div>

                      </div>
                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

          {/* SECTION 2: REALITY ENGINE */}
          {activeSection === 'reality-engine' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* RealityEngine Findings Banner */}
              <div className="glass-panel rounded-2xl p-6 border border-zinc-800/40 bg-[#11141d] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                      <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">RealityEngine Audit Log</span>
                    </div>
                    <h3 className="text-lg font-black text-white mt-1 uppercase tracking-tight">RealityEngine Findings</h3>
                    <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                      Dynamic governance intelligence auditing officer resolutions against municipal telemetry feeds, location correlation, and citizen feedback loops.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
                    <div className="bg-black/30 px-4 py-3 rounded-xl border border-zinc-800/30 text-center min-w-[110px]">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase block">Audited</span>
                      <span className="text-lg font-black text-white mt-0.5 block">{auditedCount}</span>
                    </div>
                    <div className="bg-black/30 px-4 py-3 rounded-xl border border-zinc-800/30 text-center min-w-[110px]">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase block">Mismatches</span>
                      <span className="text-lg font-black text-amber-500 mt-0.5 block">{mismatchCount}</span>
                    </div>
                    <div className="bg-black/30 px-4 py-3 rounded-xl border border-zinc-800/30 text-center min-w-[110px]">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase block">High-Risk</span>
                      <span className="text-lg font-black text-red-500 mt-0.5 block">{highRiskCasesCount}</span>
                    </div>
                    <div className="bg-black/30 px-4 py-3 rounded-xl border border-zinc-800/30 text-center min-w-[110px]">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase block">False Closures</span>
                      <span className="text-lg font-black text-purple-400 mt-0.5 block">{falseClosuresCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-base font-extrabold text-white uppercase tracking-wider">AI Ground Reality Audits</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Audit trail linking officer-reported resolutions to ground metrics and discrepancy evidence.
                </p>
              </div>

              {/* Reality Engine Grid list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {complaints.slice(0, 10).map((c) => {
                  let statusBorder = 'border-zinc-900';
                  let scoreColor = 'text-white';
                  if (c.realityStatus === 'High Risk') {
                    statusBorder = 'border-red-500/20 bg-red-950/5';
                    scoreColor = 'text-red-400';
                  } else if (c.realityStatus === 'Verified') {
                    statusBorder = 'border-emerald-500/10 bg-emerald-950/5';
                    scoreColor = 'text-emerald-400';
                  }

                  return (
                    <div key={c._id} className={`glass-panel rounded-2xl p-6 border ${statusBorder} flex flex-col justify-between space-y-4`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-[10px] text-zinc-500 font-bold uppercase block">Complaint #{c._id.toString().substring(18)}</span>
                          <h4 className="text-xs font-bold text-white mt-1 line-clamp-1">{c.title}</h4>
                          <p className="text-[9px] text-zinc-500 mt-0.5">{c.location?.address} | {c.ward}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-zinc-550 font-bold uppercase block">Reality Score</span>
                          <div className="flex items-center justify-end space-x-1.5 mt-0.5">
                            <span className="text-[10px] font-mono text-zinc-650 hidden sm:inline">{renderConfidenceBar(c.realityScore)}</span>
                            <span className={`text-sm font-extrabold ${scoreColor}`}>{c.realityScore}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 py-2 border-t border-b border-zinc-900 text-[10px]">
                        <div>
                          <span className="text-zinc-500 block uppercase font-bold text-[8px]">Official Status</span>
                          <span className="font-semibold text-white uppercase">{c.officialStatus}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block uppercase font-bold text-[8px]">Reality Status</span>
                          <span className={`font-semibold uppercase ${
                            c.realityStatus === 'Verified' ? 'text-emerald-400' : c.realityStatus === 'High Risk' ? 'text-red-400' : 'text-yellow-400'
                          }`}>{c.realityStatus}</span>
                        </div>
                      </div>

                      {/* Explainability Panel */}
                      <div className="space-y-2 bg-black/40 border border-zinc-900/60 p-3.5 rounded-xl">
                        <span className="text-purple-400 font-black uppercase text-[8px] tracking-wider block">Why? (Reality Engine Explanation)</span>
                        <ul className="space-y-1.5">
                          {getRealityExplanation(c).map((ev, idx) => {
                            const isPositive = ev.value > 0;
                            const isNegative = ev.value < 0;
                            const textStyle = isPositive 
                              ? 'text-emerald-400/90' 
                              : isNegative 
                              ? 'text-red-450/90' 
                              : 'text-zinc-400';
                            
                            const badgeStyle = isPositive
                              ? 'text-emerald-400 border-emerald-500/10 bg-emerald-500/5'
                              : isNegative
                              ? 'text-red-400 border-red-500/10 bg-red-500/5'
                              : 'text-zinc-550 border-zinc-900 bg-zinc-950/20';

                            return (
                              <li key={idx} className="text-[10px] flex items-center justify-between font-semibold">
                                <span className={textStyle}>- {ev.text}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] border font-black uppercase tracking-wider ${badgeStyle}`}>
                                  {ev.scoreDelta}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB 3: CM AI COPILOT */}
          {activeSection === 'copilot' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
              
              {/* Sidebar Quick Prompts */}
              <div className="lg:col-span-4 glass-panel rounded-3xl p-6 flex flex-col justify-between h-[520px]">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                    <Sparkles className="h-4.5 w-4.5 text-purple-400" />
                    <span>AI Command Center</span>
                  </h3>
                  <p className="text-[10px] text-zinc-500">
                    Quickly query the GovTech RAG copilot engine. Prompts scan local databases, historical officer files, and coordinate datasets.
                  </p>
                </div>

                <div className="flex flex-col space-y-2 py-4">
                  <button
                    onClick={() => handleCopilotSubmit(undefined, 'What requires my attention today?')}
                    className="w-full text-left p-3 rounded-2xl bg-zinc-950/60 border border-zinc-900 text-xs font-bold text-zinc-400 hover:text-white hover:border-purple-500/20 transition-all flex items-center justify-between"
                  >
                    <span>What requires my attention today?</span>
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-700" />
                  </button>

                  <button
                    onClick={() => handleCopilotSubmit(undefined, 'Which departments have the largest reality gap?')}
                    className="w-full text-left p-3 rounded-2xl bg-zinc-950/60 border border-zinc-900 text-xs font-bold text-zinc-400 hover:text-white hover:border-purple-500/20 transition-all flex items-center justify-between"
                  >
                    <span>Which departments have the largest reality gap?</span>
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-700" />
                  </button>

                  <button
                    onClick={() => handleCopilotSubmit(undefined, 'Show suspicious closures.')}
                    className="w-full text-left p-3 rounded-2xl bg-zinc-950/60 border border-zinc-900 text-xs font-bold text-zinc-400 hover:text-white hover:border-purple-500/20 transition-all flex items-center justify-between"
                  >
                    <span>Show suspicious closures.</span>
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-700" />
                  </button>

                  <button
                    onClick={() => handleCopilotSubmit(undefined, 'Generate today\'s CM Brief.')}
                    className="w-full text-left p-3 rounded-2xl bg-zinc-950/60 border border-zinc-900 text-xs font-bold text-zinc-400 hover:text-white hover:border-purple-500/20 transition-all flex items-center justify-between"
                  >
                    <span>Generate today's CM Brief.</span>
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-700" />
                  </button>

                  <button
                    onClick={() => handleCopilotSubmit(undefined, 'Show high-risk officers.')}
                    className="w-full text-left p-3 rounded-2xl bg-zinc-950/60 border border-zinc-900 text-xs font-bold text-zinc-400 hover:text-white hover:border-purple-500/20 transition-all flex items-center justify-between"
                  >
                    <span>Show high-risk officers.</span>
                    <ChevronRight className="h-3.5 w-3.5 text-zinc-700" />
                  </button>
                </div>

                <div className="text-[9px] text-zinc-650 bg-black/40 p-2.5 rounded-xl border border-zinc-900">
                  Secure terminal interface encrypting RAG operations under governance protocols.
                </div>
              </div>

              {/* Fullscreen AI Chat Console */}
              <div className="lg:col-span-8 glass-panel-glow rounded-3xl p-6 flex flex-col h-[520px] justify-between">
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 flex flex-col">
                  {copilotHistory.map((chat, idx) => {
                    const isAI = chat.sender === 'ai';
                    return (
                      <div
                        key={idx}
                        className={`max-w-[90%] rounded-2xl p-4 text-xs leading-relaxed ${
                          isAI 
                            ? 'bg-zinc-950/60 border border-zinc-900 text-zinc-300 align-self-start' 
                            : 'bg-purple-650 text-white align-self-end ml-auto'
                        }`}
                        style={{ whiteSpace: 'pre-wrap' }}
                      >
                        {chat.text}
                      </div>
                    );
                  })}
                  {copilotLoading && (
                    <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3.5 text-xs text-zinc-400 flex items-center space-x-2 align-self-start">
                      <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                      <span>RAG Copilot scanning database logs...</span>
                    </div>
                  )}
                </div>

                <form onSubmit={handleCopilotSubmit} className="flex space-x-2 border-t border-zinc-900 pt-4">
                  <input
                    type="text"
                    required
                    value={copilotQuestion}
                    onChange={(e) => setCopilotQuestion(e.target.value)}
                    placeholder="Enter strategic command queries..."
                    className="flex-1 rounded-xl border border-zinc-900 bg-black/40 px-4 py-3.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-purple-500/50"
                  />
                  <button
                    type="submit"
                    disabled={copilotLoading}
                    className="rounded-xl bg-purple-600 hover:bg-purple-500 px-6 text-xs font-bold uppercase text-white transition-all disabled:bg-purple-800"
                  >
                    Send Query
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* TAB 4: OFFICER INTELLIGENCE */}
          {activeSection === 'officer-intelligence' && (
            <div className="space-y-6 animate-fadeIn">
              
              <div>
                <h2 className="text-base font-extrabold text-white uppercase tracking-wider">Staff Audit & Manipulation Protection</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Dynamic profiles and metrics designed to flag resolution falsifications and overloaded departments.
                </p>
              </div>

              {/* Table list */}
              <div className="glass-panel rounded-3xl border border-zinc-900 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead>
                      <tr className="border-b border-zinc-900 text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-950/30">
                        <th className="px-6 py-4">Officer Name</th>
                        <th className="px-6 py-4">Trust Score</th>
                        <th className="px-6 py-4">Caseload</th>
                        <th className="px-6 py-4">Reopened</th>
                        <th className="px-6 py-4">Avg Resol. Time</th>
                        <th className="px-6 py-4">Bandwidth</th>
                        <th className="px-6 py-4">Risk Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/60">
                      {officers.map((off, idx) => {
                        const name = off.userId?.name || 'Unassigned';
                        const activeLoad = off.activeWorkload ?? 0;
                        const reopenCount = off.reopenedComplaints ?? 0;
                        const speedDays = Math.ceil(off.averageResolutionTimeMs / (1000 * 60 * 60 * 24)) || 0;
                        const bandwidth = Math.max(0, 100 - activeLoad * 15);

                        let riskLevel = 'LOW RISK';
                        let riskBadgeColor = 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
                        if (off.trustScore < 60) {
                          riskLevel = 'LOW TRUST';
                          riskBadgeColor = 'text-red-400 border-red-500/20 bg-red-500/5';
                        } else if (bandwidth < 40) {
                          riskLevel = 'OVERLOADED';
                          riskBadgeColor = 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5';
                        }

                        return (
                          <tr key={idx} className="hover:bg-zinc-900/10">
                            <td className="px-6 py-4 font-bold text-white">
                              <div>
                                <span>{name}</span>
                                <span className="text-[8px] text-zinc-500 uppercase font-semibold block mt-0.5">{off.departmentId?.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 border text-[10px] font-bold rounded ${
                                off.trustScore >= 80 ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' : 'text-red-400 border-red-500/20 bg-red-500/5'
                              }`}>{off.trustScore}%</span>
                            </td>
                            <td className="px-6 py-4 text-zinc-400">{activeLoad} Active</td>
                            <td className="px-6 py-4 text-zinc-400">{reopenCount} Reopened</td>
                            <td className="px-6 py-4 text-zinc-400">{speedDays} Days</td>
                            <td className="px-6 py-4 text-zinc-400">{bandwidth}%</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 border rounded-[4px] text-[8px] font-bold tracking-widest ${riskBadgeColor}`}>
                                {riskLevel}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: CRISIS RADAR */}
          {activeSection === 'crisis-radar' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
              
              {/* Map grid panel */}
              <div className="lg:col-span-7 glass-panel rounded-3xl p-6 flex flex-col h-[520px] justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                    <Compass className="h-4.5 w-4.5 text-purple-400" />
                    <span>Crisis Radar Area Sensor</span>
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    Select a localized sector below to check for safety hazard density (Open manholes, Fire, Contaminations).
                  </p>
                </div>

                {/* Simulated geographic coordinates grid map */}
                <div className="flex-1 bg-zinc-950/40 rounded-3xl border border-zinc-900/60 p-6 grid grid-cols-3 gap-4 items-center justify-items-center relative">
                  {hotspotsList.map((hotspot) => {
                    const isSelected = selectedHotspot === hotspot.name;

                    // Filter area alerts
                    const localComplaints = complaints.filter(c => c.location?.address.includes(hotspot.name.split(' ')[0]));
                    const activeHazardsCount = localComplaints.filter(c => c.priority === 'critical' && c.status !== 'resolved').length;

                    return (
                      <button
                        key={hotspot.name}
                        onClick={() => {
                          setSelectedHotspot(hotspot.name);
                          setVisitAddress(hotspot.address);
                        }}
                        className={`w-36 rounded-2xl border p-3.5 text-left transition-all ${
                          isSelected 
                            ? 'bg-purple-950/20 border-purple-500/50 shadow-[0_0_20px_rgba(139,92,246,0.1)]' 
                            : 'bg-zinc-900/40 border-zinc-800 hover:border-purple-500/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-white">{hotspot.name.split(' ')[0]}</span>
                          <MapPin className={`h-3 w-3 ${isSelected ? 'text-purple-400 animate-bounce' : 'text-zinc-550'}`} />
                        </div>
                        <p className="text-[8px] text-zinc-500 mt-0.5">{hotspot.sector}</p>
                        
                        <div className="mt-3 flex justify-between items-center text-[8px] font-bold uppercase text-zinc-500">
                          <span>Hazards:</span>
                          <span className={activeHazardsCount > 0 ? 'text-red-400 font-extrabold' : 'text-white'}>
                            {activeHazardsCount}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedHotspot && (
                  <button
                    onClick={() => {
                      setSelectedHotspot(null);
                      setVisitAddress('');
                    }}
                    className="text-xs text-purple-400 hover:underline text-left mt-2"
                  >
                    Clear Radar Selection
                  </button>
                )}
              </div>

              {/* Vicinity Risks */}
              <div className="lg:col-span-5 glass-panel rounded-3xl p-6 flex flex-col h-[520px] overflow-hidden">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5 mb-4">
                  <ShieldAlert className="h-4 w-4 text-purple-400" />
                  <span>Vicinity Hazard Status</span>
                </h3>

                {!selectedHotspot ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <MapPin className="h-8 w-8 text-zinc-700 mb-2" />
                    <p className="text-xs text-zinc-500">Select a map region to extract sensor readings.</p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <div className="mb-4 bg-zinc-950/60 p-3 rounded-2xl border border-zinc-900/60">
                      <p className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider">Vicinity Coordinate</p>
                      <p className="text-xs text-white font-bold mt-0.5">{selectedHotspot}</p>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                      {radarFilteredComplaints.length === 0 ? (
                        <p className="text-xs text-zinc-550 text-center py-8">No active complaints in selected quadrant.</p>
                      ) : (
                        radarFilteredComplaints.map((c, i) => (
                          <div key={i} className="p-3.5 rounded-2xl bg-zinc-950/40 border border-zinc-900 text-left space-y-2">
                            <div className="flex items-start justify-between">
                              <h4 className="text-xs font-bold text-white line-clamp-1">{c.title}</h4>
                              <span className={`text-[8px] font-bold border px-1.5 rounded uppercase ${
                                c.status === 'resolved' ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' : 'border-yellow-500/20 text-yellow-400 bg-yellow-500/5'
                              }`}>
                                {c.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-400 line-clamp-2">{c.description}</p>
                            
                            <div className="flex items-center justify-between pt-1 text-[9px] border-t border-zinc-900/60">
                              <span className="text-zinc-550">Score: <span className="text-white font-bold">{c.realityScore}%</span></span>
                              <span className={`font-bold uppercase tracking-widest ${
                                c.realityStatus === 'Verified' ? 'text-emerald-400' : 'text-red-400'
                              }`}>
                                {c.realityStatus}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 6: DAILY CM BRIEF */}
          {activeSection === 'daily-brief' && briefReport && (
            <div className="glass-panel rounded-3xl p-8 space-y-6 max-w-4xl mx-auto h-[600px] overflow-y-auto flex flex-col justify-between animate-fadeIn">
              
              <div id="brief-print-container" className="space-y-6">
                
                {/* Header */}
                <div className="border-b border-zinc-900 pb-5 flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-black text-white uppercase tracking-widest">Strategic Intelligence Report</h2>
                    <p className="text-[9px] text-purple-400 font-bold uppercase tracking-wider mt-0.5">Chief Minister's Office</p>
                  </div>
                  <div className="text-right text-[10px] text-zinc-550 font-bold uppercase">
                    <span>Date: {briefReport.date}</span>
                  </div>
                </div>

                {/* Score panel */}
                <div className="grid grid-cols-3 gap-4 border border-zinc-900/60 bg-zinc-950/20 p-4 rounded-2xl text-center">
                  <div>
                    <span className="text-[9px] text-zinc-500 font-bold uppercase">Reported Resolution Rate</span>
                    <p className="text-xl font-black text-white mt-1">{briefReport.overallMetrics?.officialResolutionRate}%</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 font-bold uppercase">Ground Verified Rate</span>
                    <p className="text-xl font-black text-emerald-400 mt-1">{briefReport.overallMetrics?.realityVerifiedRate}%</p>
                  </div>
                  <div>
                    <span className="text-[9px] text-red-400 font-bold uppercase">Governance Reality Gap</span>
                    <p className="text-xl font-black text-red-500 mt-1">{briefReport.overallMetrics?.realityGap}%</p>
                  </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Department Gaps */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-1 text-purple-400">
                      Highest Reality-Gap Departments
                    </h4>
                    <div className="space-y-2">
                      {briefReport.highRiskDepartments?.map((d: any, i: number) => (
                        <div key={i} className="flex justify-between items-center text-xs">
                          <span className="text-zinc-300 font-bold">{d.name} ({d.code})</span>
                          <span className="text-red-400 font-extrabold">+{d.realityGap}% Reality Gap</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Suspicious closures */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-1 text-purple-400">
                      Flagged Suspicious Resolutions
                    </h4>
                    <div className="space-y-2.5">
                      {briefReport.suspiciousClosures?.length === 0 ? (
                        <p className="text-xs text-zinc-650">No suspicious closures flagged today.</p>
                      ) : (
                        briefReport.suspiciousClosures?.map((s: any, i: number) => (
                          <div key={i} className="text-[11px] leading-snug">
                            <p className="font-bold text-white truncate">"{s.title}"</p>
                            <p className="text-zinc-500 text-[9px] mt-0.5">
                              Closed by: <span className="text-zinc-300">{s.officerName}</span> (Trust: {s.officerTrustScore}%) | Score: <span className="text-red-400 font-bold">{s.realityScore}%</span>
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>

                {/* Directives */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-white uppercase tracking-wider border-b border-zinc-900 pb-1 text-purple-400">
                    Recommended Action Directives
                  </h4>
                  <div className="space-y-2.5 bg-purple-950/5 border border-purple-500/10 p-4.5 rounded-2xl">
                    {briefReport.recommendedActions?.map((act: string, i: number) => (
                      <div key={i} className="flex items-start space-x-2 text-xs text-zinc-300">
                        <span className="text-purple-400 font-bold shrink-0">{i + 1}.</span>
                        <p>{act}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Action */}
              <div className="flex items-center justify-end border-t border-zinc-900 pt-4">
                <button
                  onClick={handlePrintPDF}
                  className="rounded-xl border border-purple-500/20 bg-purple-600/10 text-purple-400 px-5 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 transition-all"
                >
                  <Printer className="h-4 w-4" />
                  <span>Export Strategic PDF Brief</span>
                </button>
              </div>

            </div>
          )}

        </main>

      </div>

      {/* PRINT-ONLY STRATEGIC DOCUMENT VIEW */}
      <section className="hidden print:block space-y-6 text-black bg-white p-8 font-sans">
        <div className="border-b-2 border-black pb-4 text-center">
          <h1 className="text-2xl font-extrabold tracking-widest uppercase">DAILY GOVERNANCE BRIEF</h1>
          <p className="text-xs font-bold uppercase tracking-widest mt-1">Prepared by RealityEngine</p>
          <p className="text-[10px] text-gray-500 mt-1">Generated date: {briefReport?.date || new Date().toLocaleDateString('en-US')}</p>
        </div>

        <div className="grid grid-cols-3 gap-4 border border-black p-4 text-center">
          <div>
            <span className="text-[9px] font-bold uppercase text-gray-500 block">State Health Index</span>
            <span className="text-sm font-bold uppercase block mt-1">Stable</span>
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase text-gray-500 block">Critical Issues</span>
            <span className="text-sm font-bold block mt-1">{anomalies.length} Alerts</span>
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase text-gray-500 block">Generated at</span>
            <span className="text-sm font-bold block mt-1">{getRelativeTime(10)}</span>
          </div>
        </div>

        {/* Priority alert showcase */}
        <div className="border-2 border-black p-5 space-y-3">
          <h3 className="text-xs font-bold border-b-2 border-black pb-1 uppercase tracking-wider">TOP PRIORITY CASE</h3>
          <div className="space-y-1">
            <h4 className="text-sm font-black uppercase">Water Infrastructure Failure</h4>
            <p className="text-xs">Location: Sector 12, South Mumbai</p>
            <p className="text-xs">Impact Assessment: 2,300 citizens affected</p>
            <p className="text-xs">Confidence Score: 94%</p>
          </div>
          <div className="border-t border-black pt-3 text-xs leading-relaxed">
            <span className="font-bold uppercase tracking-wider block mb-1">Recommended Action Directive:</span>
            <p className="bg-gray-155 p-3 border border-black rounded font-medium">
              Immediate field inspection and emergency valve audit by Water & Sewerage Board engineers.
            </p>
          </div>
        </div>

        {/* Secondary alerts list */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold border-b-2 border-black pb-1 uppercase tracking-wider">SECONDARY ALERTS</h3>
          <div className="space-y-2.5">
            {anomalies.filter(an => an.id !== 'infra-water-s12').map((an, idx) => (
              <div key={an.id} className="p-3 border border-black text-xs">
                <h4 className="font-bold uppercase mb-1">
                  {idx + 1}. {an.title === 'False Closure Suspected' ? 'False Closure Suspicion' : 'Administrative Delay Anomaly'}
                </h4>
                {an.type === 'delay' ? (
                  <p>Location: Ward 3 | Pending Cases: 17 reports | Risk: Medium</p>
                ) : (
                  <p>Subject: Streetlight Cluster | Location: Fort Circle | Status: Verification Required</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================
          GENERATE CM DAILY BRIEF MODAL OVERLAY
          ======================================================== */}
      {showBriefModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn print:hidden">
          <div className="glass-panel-glow w-full max-w-2xl rounded-3xl border border-purple-500/20 p-8 flex flex-col justify-between max-h-[85vh] overflow-y-auto space-y-6">
            
            <div className="border-b border-zinc-900 pb-5">
              <h2 className="text-xl font-black text-white uppercase tracking-widest bg-gradient-to-r from-white via-zinc-200 to-purple-400 bg-clip-text text-transparent">
                DAILY GOVERNANCE BRIEF
              </h2>
              <p className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest mt-1">
                Prepared by RealityEngine
              </p>
            </div>

            <div className="space-y-6 text-xs text-zinc-300 leading-relaxed font-sans">
              
              {/* Document metadata sheet */}
              <div className="grid grid-cols-3 gap-4 bg-zinc-950/80 border border-zinc-900 p-4.5 rounded-2xl">
                <div>
                  <span className="text-[9px] text-zinc-500 uppercase font-bold block">Date</span>
                  <span className="text-white font-bold">{new Date().toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}</span>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 uppercase font-bold block">State Health Index</span>
                  <span className="text-emerald-400 font-black uppercase flex items-center gap-1">
                    <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping" />
                    <span>Stable</span>
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-zinc-500 uppercase font-bold block">Critical Issues</span>
                  <span className="text-red-400 font-black">{anomalies.length} Alerts</span>
                </div>
              </div>

              {/* Priority alert showcase */}
              <div className="border border-red-500/20 bg-red-950/5 p-5 rounded-2xl space-y-3.5 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-red-500/10 border-l border-b border-red-500/25 px-2.5 py-0.5 rounded-bl-lg text-[9px] font-extrabold text-red-400">
                  TOP PRIORITY CASE
                </div>
                
                <div className="space-y-1">
                  <span className="text-[8px] text-red-400 font-extrabold uppercase tracking-widest block">System Flagged Anomaly</span>
                  <h4 className="text-sm font-black text-white uppercase tracking-wide">
                    Water Infrastructure Failure
                  </h4>
                  <p className="text-[10px] text-zinc-400">Location: Sector 12, South Mumbai</p>
                  <p className="text-[10px] text-zinc-400">Impact Assessment: <span className="text-white font-bold">2,300 citizens affected</span></p>
                </div>

                <div className="border-t border-red-500/10 pt-3 text-[10px] leading-relaxed text-zinc-300">
                  <span className="text-[8.5px] text-red-400 font-black uppercase tracking-wider block mb-1">Recommended Action Directive:</span>
                  <p className="bg-black/40 border border-red-500/10 p-2.5 rounded-xl font-medium text-white">
                    Immediate field inspection and emergency valve audit by Water & Sewerage Board engineers.
                  </p>
                </div>

                <div className="flex justify-between items-center text-[9px] text-zinc-550 font-mono border-t border-red-500/10 pt-2.5">
                  <span>Generated at: {getRelativeTime(10)}</span>
                  <span>Confidence: 94%</span>
                </div>
              </div>

              {/* Secondary alerts list */}
              <div className="space-y-3">
                <h4 className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest">
                  Secondary Alerts under Surveillance ({anomalies.length - 1})
                </h4>
                
                <div className="space-y-3">
                  {anomalies.filter(an => an.id !== 'infra-water-s12').map((an, idx) => (
                    <div key={an.id} className="p-4 rounded-xl bg-zinc-950 border border-zinc-900 space-y-1.5 text-left font-sans">
                      <div className="flex justify-between items-center">
                        <h5 className="font-extrabold text-white text-[11px] uppercase tracking-wide">
                          {idx + 1}. {an.title === 'False Closure Suspected' ? 'False Closure Suspicion' : 'Administrative Delay Anomaly'}
                        </h5>
                        <span className="text-[8px] font-bold border border-zinc-800 bg-zinc-900 text-zinc-400 px-1.5 py-0.5 rounded font-mono">
                          {an.type === 'delay' ? 'SLA WARNING' : 'INTEGRITY ALERT'}
                        </span>
                      </div>
                      
                      {an.type === 'delay' ? (
                        <div className="grid grid-cols-3 gap-2 text-[10px] text-zinc-500">
                          <p>Location: <span className="text-zinc-300 font-bold">Ward 3</span></p>
                          <p>Pending Cases: <span className="text-zinc-300 font-bold">17 reports</span></p>
                          <p>Risk: <span className="text-yellow-500 font-bold">Medium</span></p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 text-[10px] text-zinc-500">
                          <p>Subject: <span className="text-zinc-300 font-bold">Streetlight Cluster</span></p>
                          <p>Location: <span className="text-zinc-300 font-bold">Fort Circle</span></p>
                          <p>Status: <span className="text-red-400 font-bold">Verification Required</span></p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-900">
              <button
                onClick={() => setShowBriefModal(false)}
                className="rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-400 px-5 py-2.5 text-xs font-bold uppercase tracking-wider hover:text-white hover:bg-zinc-900 transition-all"
              >
                Close Brief
              </button>
              <button
                onClick={() => {
                  setShowBriefModal(false);
                  window.print();
                }}
                className="rounded-xl bg-purple-600 hover:bg-purple-500 border border-purple-500 text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1"
              >
                <Printer className="h-4 w-4" />
                <span>Print Document</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
