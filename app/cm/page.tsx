'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  ShieldAlert, Eye, MapPin, AlertCircle, MessageSquare, 
  FileText, LogOut, Loader2, Sparkles, TrendingUp, RefreshCw, BarChart2, CheckCircle2, ChevronRight, Printer, AlertTriangle, Users, Compass, Shield, UserCheck, EyeOff, BellRing, Clock,
  Mic, MicOff, Volume2, VolumeX, Activity, Zap
} from 'lucide-react';
import { motion, AnimatePresence, animate, useSpring, useTransform, useMotionValue } from 'framer-motion';

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

const TickingNumber = ({ value, prefix = '', suffix = '', duration = 1.0, decimalPlaces = 0 }: { value: number; prefix?: string; suffix?: string; duration?: number; decimalPlaces?: number }) => {
  const [displayVal, setDisplayVal] = useState(prefix + "0" + suffix);

  useEffect(() => {
    let active = true;
    const controls = animate(0, value, {
      duration: duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        if (active) {
          setDisplayVal(prefix + latest.toFixed(decimalPlaces).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + suffix);
        }
      }
    });
    return () => { active = false; controls.stop(); };
  }, [value, duration, prefix, suffix, decimalPlaces]);

  return <span style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontWeight: 700 }}>{displayVal}</span>;
};

/* ══════════════════════════════════════════════════
   SPOTLIGHT CARD — Mouse-tracking radial glow
   Inspired by Linear.app / Apple Vision Pro
   ══════════════════════════════════════════════════ */
const SpotlightCard = ({
  children,
  className = '',
  critical = false,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  critical?: boolean;
  style?: React.CSSProperties;
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty('--mx', `${x}%`);
    card.style.setProperty('--my', `${y}%`);
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={`spotlight-card ${critical ? 'spotlight-card-critical' : ''} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};

/* ══════════════════════════════════════════════════
   REALITY SCORE BAR — Animated liquid-fill bar
   Framer Motion spring-based fill animation
   ══════════════════════════════════════════════════ */
const RealityScoreBar = ({
  officialRate,
  groundRate,
  gap,
}: {
  officialRate: number;
  groundRate: number;
  gap: number;
}) => {
  const gapColor = gap <= 5 ? '#10b981' : gap <= 15 ? '#f59e0b' : gap <= 25 ? '#f97316' : '#ef4444';
  const gapLabel = gap <= 5 ? 'HEALTHY' : gap <= 15 ? 'MONITOR' : gap <= 25 ? 'CONCERN' : 'CRITICAL';

  return (
    <div className="space-y-2 w-full">
      {/* Official vs Ground comparison bars */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="metric-label" style={{ color: '#64748b' }}>Official</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>{officialRate}%</span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-slate-400"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: officialRate / 100 }}
            style={{ originX: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="metric-label" style={{ color: '#64748b' }}>Ground</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 700, color: '#10b981' }}>{groundRate}%</span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: groundRate / 100 }}
            style={{ originX: 0, background: '#10b981' }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
          />
        </div>
      </div>
      {/* Gap indicator */}
      <div className="flex items-center justify-between pt-1 border-t border-white/5">
        <span className="metric-label" style={{ color: '#475569' }}>Reality Gap</span>
        <div className="flex items-center gap-2">
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '13px',
              fontWeight: 800,
              color: gapColor,
              textShadow: `0 0 12px ${gapColor}60`,
            }}
          >
            {gap}%
          </motion.span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0 }}
            style={{
              fontSize: '8px',
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.08em',
              padding: '2px 6px',
              borderRadius: '4px',
              color: gapColor,
              background: `${gapColor}15`,
              border: `1px solid ${gapColor}30`,
            }}
          >
            {gapLabel}
          </motion.span>
        </div>
      </div>
    </div>
  );
};

const renderSparkline = (history: any[]) => {
  if (!history || history.length === 0) return null;
  const scores = history.map(h => h.score);
  if (scores.length === 1) {
    scores.unshift(85);
  }
  
  const minVal = 0;
  const maxVal = 100;
  const range = maxVal - minVal;
  
  const width = 60;
  const height = 14;
  const points = scores.map((val, idx) => {
    const x = (idx / (scores.length - 1)) * width;
    const y = height - ((val - minVal) / (range || 1)) * height;
    return `${x},${y}`;
  });
  
  const pathD = `M ${points.join(' L ')}`;
  const lastScore = scores[scores.length - 1];
  const firstScore = scores[0];
  const color = lastScore < firstScore ? '#ef4444' : lastScore > firstScore ? '#10b981' : '#71717a';
  
  return (
    <svg className="overflow-visible" width={width} height={height}>
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={width}
        cy={height - ((lastScore - minVal) / (range || 1)) * height}
        r="2"
        fill={color}
      />
    </svg>
  );
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

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: "spring" as const, 
      stiffness: 100, 
      damping: 15 
    } 
  }
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
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [copilotThinkingState, setCopilotThinkingState] = useState<string>('');

  // Dynamic Trends & AI Directives
  const [trends, setTrends] = useState<any[]>([]);
  const [trendDirection, setTrendDirection] = useState<string>('Stable');
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);

  // Executive Story Mode Stepper state
  const [storyStep, setStoryStep] = useState<number>(0);
  const [storyComplaint, setStoryComplaint] = useState<any>(null);
  const [storyOfficer, setStoryOfficer] = useState<any>(null);
  const [storyLoading, setStoryLoading] = useState<boolean>(false);
  const [storyMessage, setStoryMessage] = useState<string>('');

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

  // Voice & Speech Recognition States
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [currentlySpeakingIdx, setCurrentlySpeakingIdx] = useState<number | null>(null);

  // Speech Recognition initialization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-IN';
        
        rec.onstart = () => {
          setIsListening(true);
        };
        
        rec.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setCopilotQuestion(prev => (prev ? prev + ' ' + transcript : transcript));
        };
        
        rec.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };
        
        rec.onend = () => {
          setIsListening(false);
        };
        
        setRecognition(rec);
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.speechSynthesis?.cancel();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognition) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or Safari.');
      return;
    }
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const speakText = (text: string, index: number) => {
    if (typeof window === 'undefined') return;
    
    if (currentlySpeakingIdx === index) {
      window.speechSynthesis.cancel();
      setCurrentlySpeakingIdx(null);
      return;
    }
    
    window.speechSynthesis.cancel();
    
    // Clean text of markdown characters
    const cleanText = text
      .replace(/###/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/`/g, '')
      .replace(/- /g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-IN';
    
    utterance.onend = () => {
      setCurrentlySpeakingIdx(null);
    };
    utterance.onerror = () => {
      setCurrentlySpeakingIdx(null);
    };
    
    setCurrentlySpeakingIdx(index);
    window.speechSynthesis.speak(utterance);
  };

  // CM Visit Mode / Crisis Radar State
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
  const [visitAddress, setVisitAddress] = useState('');

  // Executive Story Mode API triggers
  const runStoryStep = async (stepAction: string) => {
    setStoryLoading(true);
    setStoryMessage('');
    try {
      const res = await fetch('/api/demo/story-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: stepAction })
      });
      const data = await res.json();
      if (data.success) {
        setStoryStep(data.step);
        if (data.complaint) setStoryComplaint(data.complaint);
        if (data.officer) setStoryOfficer(data.officer);
        setStoryMessage(data.message);
        // Refresh dashboard statistics
        await fetchDashboardData();
      } else {
        setStoryMessage('Demo step failed: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      setStoryMessage('Connection error during demo execution.');
    } finally {
      setStoryLoading(false);
    }
  };

  // Hotspots definitions (Metropolitan Grid Coordinates)
  const hotspotsList = [
    { name: 'Dwarka Sector 12', address: 'Sector 12, Dwarka, Delhi, 110075', lat: 28.5912, lng: 77.0422, sector: 'Sector 12' },
    { name: 'Connaught Place', address: 'Connaught Place, Central Delhi, 110001', lat: 28.6304, lng: 77.2177, sector: 'Sector 10' },
    { name: 'Chandni Chowk', address: 'Chandni Chowk Road, Old Delhi, 110006', lat: 28.6507, lng: 77.2303, sector: 'Sector 8' },
    { name: 'Chanakyapuri', address: 'Chanakyapuri Estate, New Delhi, 110021', lat: 28.5983, lng: 77.1830, sector: 'Sector 9' },
    { name: 'Karol Bagh', address: 'Ward 3, Karol Bagh, Delhi, 110005', lat: 28.6506, lng: 77.1896, sector: 'Sector 11' },
    { name: 'Nehru Place', address: 'Nehru Place Circle, South Delhi, 110019', lat: 28.5487, lng: 77.2513, sector: 'Sector 7' }
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

      // Fetch dynamic weekly trends & AI recommendations
      const trendsRes = await fetch('/api/analytics/trends');
      const trendsData = await trendsRes.json();
      if (trendsData.success) {
        setTrends(trendsData.trends);
        setTrendDirection(trendsData.direction);
        setAiRecommendations(trendsData.recommendations);
      }

      // Fetch current demo step status
      const storyRes = await fetch('/api/demo/story-step');
      const storyData = await storyRes.json();
      if (storyData.success) {
        setStoryStep(storyData.step || 0);
        if (storyData.complaint) {
          setStoryComplaint(storyData.complaint);
        }
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
    const timer = setTimeout(() => {
      setIsAnalyzing(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

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
      setCopilotThinkingState('Analyzing complaint history...');
      await new Promise(resolve => setTimeout(resolve, 600));
      setCopilotThinkingState('Checking officer performance...');
      await new Promise(resolve => setTimeout(resolve, 600));
      setCopilotThinkingState('Evaluating reality gaps...');
      await new Promise(resolve => setTimeout(resolve, 600));

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
      setCopilotThinkingState('');
    }
  };

  const handlePrintPDF = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Helper: Officer Trust Category Badge styles
  const getOfficerCategory = (trustScore: number) => {
    if (trustScore >= 80) return { name: 'Trusted', style: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' };
    if (trustScore >= 50) return { name: 'Under Review', style: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5' };
    return { name: 'High Risk', style: 'text-red-400 border-red-500/20 bg-red-500/5' };
  };

  // Helper: Reality Engine Explanation Generator (Audit Panel)
  const getRealityExplanation = (c: any) => {
    if (c.realityScoreBreakdown && c.realityScoreBreakdown.length > 0) {
      return c.realityScoreBreakdown.map((item: any) => ({
        text: item.factor,
        scoreDelta: item.delta >= 0 ? `+${item.delta}` : `${item.delta}`,
        value: item.delta
      }));
    }

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
  const questionableClosures = complaints.filter(c => c.isQuestionableResolution).length;
  const resurrectedCount = complaints.filter(c => c.isResurrected).length;
  const activeCriticalHazards = complaints.filter(c => c.priority === 'critical' && c.status !== 'resolved').length;

  const auditedCount = totalGrievances;
  const mismatchCount = complaints.filter(c => c.realityStatus === 'High Risk' || c.isQuestionableResolution).length;
  const highRiskCasesCount = complaints.filter(c => c.realityStatus === 'High Risk').length;
  const falseClosuresCount = questionableClosures;

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
      location: 'Sector 12, Dwarka, Delhi',
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
      location: 'Ward 3, Karol Bagh',
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

  // Pattern 3: False Resolution Detection (Connaught Place)
  const reopenedGrievances = complaints.filter(c => c.status === 'reopened' && c.location?.address.includes('Connaught Place'));
  if (reopenedGrievances.length > 0) {
    anomalies.push({
      id: 'false-closure-cp',
      type: 'false-closure',
      title: 'False Closure Suspected',
      location: 'Connaught Place (Ward 2)',
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
    <div className="min-h-screen text-slate-100 flex flex-col font-sans select-none print:bg-white print:text-black" style={{ background: '#050710' }}>
      
      {/* ══ NATIONAL COMMAND CENTER — TOP HEADER ══ */}
      <header className="sticky top-0 z-50 print:hidden" style={{ background: 'rgba(5, 7, 16, 0.92)', backdropFilter: 'blur(24px) saturate(160%)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="px-5 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center relative" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)' }}>
              <div className="scan-line" />
              <Shield className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-[13px] font-black tracking-[0.15em] text-white uppercase flex items-center gap-2">
                Civic Shield
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', color: '#a78bfa', letterSpacing: '0.06em' }}>
                  REALITY LAYER v2
                </span>
              </h1>
              <p className="text-[9px] font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5" style={{ color: '#475569' }}>
                <span className="status-dot-green inline-block" />
                Chief Minister · National Command Center
              </p>
            </div>
          </div>

          {/* Center — AI Status */}
          <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <Activity className="h-3.5 w-3.5 text-violet-400 animate-pulse" />
            <span className="text-[10px] font-semibold" style={{ color: '#64748b' }}>
              <span className="text-violet-400 font-bold">RealityEngine Active</span> · Auditing {complaints.length} grievance records live
            </span>
          </div>

          {/* Right — Reality Gap Widget */}
          <div className="flex items-center gap-4">
            <SpotlightCard
              className="glass-aurora rounded-xl px-5 py-2.5 relative overflow-hidden"
              style={{ minWidth: '320px' } as React.CSSProperties}
            >
              <RealityScoreBar
                officialRate={officialResRate}
                groundRate={verifiedResRate}
                gap={overallRealityGap}
              />
            </SpotlightCard>

            <div className="flex items-center space-x-2">
              <button 
                onClick={fetchDashboardData}
                disabled={refreshing}
                className="h-8 w-8 rounded-lg flex items-center justify-center transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#64748b' }}
                title="Sync Intelligence Feed"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="h-8 w-8 rounded-lg flex items-center justify-center transition-all"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: '#64748b' }}
                title="End Session"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
        {/* Aurora gradient separator */}
        <div className="gradient-sep" />
      </header>

      {/* ══ MAIN COMMAND ROOM LAYOUT ══ */}
      <div className="flex-1 flex flex-col md:flex-row print:block">
        
        {/* ── Sidebar Nav ── */}
        <aside className="w-full md:w-56 p-3 flex flex-col space-y-1 print:hidden" style={{ background: 'rgba(5,7,16,0.95)', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
          <p className="metric-label px-3 mb-3 mt-1" style={{ color: '#1e293b', letterSpacing: '0.12em' }}>Command Panels</p>
          
          {([
            { id: 'overview', icon: BarChart2, label: 'Gov. Overview' },
            { id: 'reality-engine', icon: Eye, label: 'Reality Engine' },
            { id: 'copilot', icon: MessageSquare, label: 'CM AI Copilot' },
            { id: 'officer-intelligence', icon: Users, label: 'Officer Intel' },
            { id: 'crisis-radar', icon: Compass, label: 'Crisis Radar' },
            { id: 'daily-brief', icon: FileText, label: 'Daily Brief' },
          ] as const).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id as any)}
              className={`w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-left transition-all ${
                activeSection === id ? 'nav-item-active' : 'nav-item-inactive'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="text-[11px] font-bold tracking-wide uppercase">{label}</span>
              {activeSection === id && (
                <motion.div
                  layoutId="nav-indicator"
                  className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400"
                  style={{ boxShadow: '0 0 6px rgba(139,92,246,0.8)' }}
                />
              )}
            </button>
          ))}

          {/* System status footer */}
          <div className="mt-auto pt-4 border-t space-y-2" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            <div className="px-3 py-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.1)' }}>
              <p className="metric-label" style={{ color: '#065f46' }}>System Status</p>
              <p className="text-[10px] font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
                <span className="status-dot-green inline-block" />
                All Sensors Online
              </p>
            </div>
          </div>
        </aside>
        {/* Dashboard Panel */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto print:p-0">
          
          {/* ══ SECTION 1: GOVERNANCE OVERVIEW ══ */}
          {activeSection === 'overview' && (
            <div className="space-y-5">
              
              {/* Page Header */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 gap-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <h2 className="text-xl font-black tracking-[0.15em] uppercase" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #cbd5e1 40%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Governance Command Center
                  </h2>
                  <p className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 mt-1" style={{ color: '#334155', fontFamily: "'JetBrains Mono', monospace" }}>
                    <span className="status-dot-green inline-block" />
                    Live Intelligence Feed · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
                
                <button
                  onClick={() => setShowBriefModal(true)}
                  className="rounded-xl text-white px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                  style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', boxShadow: '0 0 20px rgba(139,92,246,0.1)' }}
                >
                  <FileText className="h-3.5 w-3.5 text-violet-300" />
                  Generate CM Brief
                </button>
              </div>

              {/* Aurora AI Summary Strip */}
              <SpotlightCard className="glass-aurora rounded-xl px-4 py-3 flex items-center gap-3">
                <div className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  <Zap className="h-3.5 w-3.5 text-violet-400" />
                </div>
                <p className="text-[11px] font-semibold" style={{ color: '#94a3b8' }}>
                  <span className="text-white font-black uppercase mr-2" style={{ fontSize: '10px', letterSpacing: '0.08em' }}>AI INSIGHT</span>
                  Sanitation performance in East Delhi is deteriorating. <span className="text-red-400 font-bold">17 likely false closures</span> and <span className="text-violet-400 font-bold">4 resurfaced issues</span> require immediate review.
                </p>
              </SpotlightCard>

              {/* ── CM ACTION REQUIRED Hero Panel ── */}
              <SpotlightCard critical className="glass-aurora rounded-xl p-5 relative overflow-hidden animate-critical-pulse" style={{ borderLeft: '3px solid rgba(239,68,68,0.6)' }}>
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(239,68,68,0.08) 0%, transparent 70%)' }} />
                
                <div className="flex items-center justify-between pb-3 mb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" style={{ boxShadow: '0 0 8px rgba(239,68,68,0.8)' }} />
                    <span className="text-red-400 font-black uppercase tracking-widest" style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace" }}>CM Action Required</span>
                  </div>
                  <span className="badge-pulse-red text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontFamily: "'JetBrains Mono', monospace" }}>
                    ⚠ CRITICAL PRIORITY
                  </span>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    { label: 'Department', value: 'Sanitation Dept.', color: '#e2e8f0' },
                    { label: 'Location', value: 'East Delhi', color: '#e2e8f0' },
                    { label: 'Anomaly', value: '17 False Closures', color: '#f87171' },
                    { label: 'Confidence', value: '91%', color: '#f8fafc', mono: true, large: true },
                    { label: 'Telemetry', value: 'BREACHED', color: '#f87171', badge: true },
                  ].map(({ label, value, color, mono, large, badge }) => (
                    <div key={label} className="space-y-1">
                      <span className="metric-label block">{label}</span>
                      {badge ? (
                        <span className="inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
                      ) : (
                        <span className={`font-bold ${large ? 'text-xl' : 'text-[11px]'}`} style={{ color, fontFamily: mono ? "'JetBrains Mono', monospace" : 'inherit' }}>{value}</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <span className="metric-label block mb-1">Recommended Action Directive</span>
                    <p className="text-[11px] font-bold text-emerald-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>→ Initiate field verification team and audit officer reports.</p>
                  </div>
                  <button className="rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all hover:-translate-y-0.5 cursor-pointer px-4 py-2" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Approve Directive
                  </button>
                </div>
              </SpotlightCard>

              <AnimatePresence mode="wait">
                {isAnalyzing ? (
                  <motion.div
                    key="loader"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.4 }}
                    className="glass-aurora rounded-2xl p-12 text-center py-32 flex flex-col items-center justify-center space-y-4"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-2"
                    >
                      <RefreshCw className="h-6 w-6" />
                    </motion.div>
                    <h4 className="text-sm font-black text-white uppercase tracking-widest font-mono">
                      Analyzing Governance Data...
                    </h4>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest animate-pulse mt-0.5">
                      Auditing resolution signatures & checking ground telemetry
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="overview-content"
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    className="space-y-6"
                  >
                        {/* Reality Engine Findings Hero Section */}
                    <motion.div variants={itemVariants}>
                      <SpotlightCard critical className="glass-aurora rounded-xl p-4 relative overflow-hidden">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                          <div className="flex items-center space-x-3">
                            <div className="h-9 w-9 rounded-xl flex items-center justify-center text-red-400" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
                              <ShieldAlert className="h-4.5 w-4.5 animate-pulse" />
                            </div>
                            <div>
                              <h3 className="font-black text-white uppercase tracking-wider" style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>
                                Reality Engine · Detected Anomalies
                              </h3>
                              <p className="text-[11px] mt-0.5" style={{ color: '#64748b' }}>
                                <span className="text-red-400 font-bold">17 likely false closures</span>, <span className="text-violet-400 font-bold">4 resurrected issues</span>, and <span className="text-orange-400 font-bold">18 active hazards</span> detected.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" style={{ boxShadow: '0 0 6px rgba(239,68,68,0.8)' }} />
                            <span className="font-black text-red-400 uppercase" style={{ fontSize: '9px', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em' }}>THREAT: CRITICAL</span>
                          </div>
                        </div>
                      </SpotlightCard>
                    </motion.div>

                    {/* Grouped KPIs Section */}
                    <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Group 1: Administrative Trust Index */}
                      <SpotlightCard className="glass-aurora rounded-xl p-5 flex flex-col justify-between space-y-4">
                      <motion.div>
                        <div>
                          <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest block font-mono">[SYS_KPI: INTEGRITY]</span>
                          <h3 className="text-xs font-black text-white uppercase tracking-wider mt-0.5">ADMINISTRATIVE TRUST INDEX</h3>
                          <p className="text-[9px] text-zinc-450 mt-1">Measures reliability of officer-reported resolutions.</p>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 border-t border-zinc-850 pt-4">
                          <div>
                            <span className="text-[8px] text-zinc-400 uppercase font-mono font-bold block">ALERTS</span>
                            <span className="text-[8px] text-zinc-500 block leading-tight mt-0.5">Critical hazards</span>
                            <span className="text-2xl font-black text-red-500 block mt-1">
                              <TickingNumber value={criticalAlertsCount || 3} />
                            </span>
                          </div>
                          <div className="border-l border-zinc-850 pl-4">
                            <span className="text-[8px] text-zinc-400 uppercase font-mono font-bold block">RISKS</span>
                            <span className="text-[8px] text-zinc-500 block leading-tight mt-0.5">Active anomalies</span>
                            <span className="text-2xl font-black text-orange-400 block mt-1">
                              <TickingNumber value={activeRisksCount || 7} />
                            </span>
                          </div>
                          <div className="border-l border-zinc-850 pl-4">
                            <span className="text-[8px] text-zinc-400 uppercase font-mono font-bold block">TRUST</span>
                            <span className="text-[8px] text-zinc-500 block leading-tight mt-0.5">Overall index</span>
                            <span className="text-2xl font-black text-emerald-400 block mt-1">
                              <TickingNumber value={avgTrustScore || 82} suffix="%" />
                            </span>
                          </div>
                        </div>
                      </motion.div>

                      {/* Group 2: Operational Metrics */}
                      <motion.div 
                        whileHover={{ scale: 1.005, borderColor: "rgba(139, 92, 246, 0.25)" }}
                        className="glass-panel rounded-xl p-5 flex flex-col justify-between space-y-4 border border-zinc-800"
                      >
                        <div>
                          <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest block font-mono">[SYS_KPI: OPERATIONS]</span>
                          <h3 className="text-xs font-black text-white uppercase tracking-wider mt-0.5">Operational Metrics</h3>
                          <p className="text-[9px] text-zinc-450 mt-1">Active caseload telemetry across municipal bodies.</p>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 border-t border-zinc-850 pt-4">
                          <div>
                            <span className="text-[8px] text-zinc-400 uppercase font-mono font-bold block">DEPTS</span>
                            <span className="text-[8px] text-zinc-500 block leading-tight mt-0.5">Monitored</span>
                            <span className="text-2xl font-black text-zinc-300 block mt-1">
                              <TickingNumber value={5} />
                            </span>
                          </div>
                          <div className="border-l border-zinc-850 pl-4">
                            <span className="text-[8px] text-zinc-400 uppercase font-mono font-bold block">IMPACTED</span>
                            <span className="text-[8px] text-zinc-500 block leading-tight mt-0.5">Estimated citizens</span>
                            <span className="text-2xl font-black text-orange-400 block mt-1">
                              <TickingNumber value={4231} />
                            </span>
                          </div>
                          <div className="border-l border-zinc-850 pl-4">
                            <span className="text-[8px] text-zinc-400 uppercase font-mono font-bold block">AVG_TIME</span>
                            <span className="text-[8px] text-zinc-500 block leading-tight mt-0.5">SLA days</span>
                            <span className="text-2xl font-black text-yellow-500 block mt-1">
                              <TickingNumber value={avgResTimeDays || 3.2} decimalPlaces={1} suffix="d" />
                            </span>
                          </div>
                        </div>
                      </motion.div>

                      {/* Group 3: Complaint Resurrection & Questionable Closures */}
                      <motion.div 
                        whileHover={{ scale: 1.005, borderColor: "rgba(139, 92, 246, 0.25)" }}
                        className="glass-panel rounded-xl p-5 flex flex-col justify-between space-y-4 border border-zinc-800"
                      >
                        <div>
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest block font-mono">[SYS_KPI: ACCOUNTABILITY]</span>
                              <h3 className="text-xs font-black text-white uppercase tracking-wider mt-0.5">RESURRECTED ISSUES</h3>
                            </div>
                            <span className="bg-red-950/30 text-red-400 border border-red-500/20 text-[8px] px-2 py-0.5 rounded font-black font-mono">
                              30d Range
                            </span>
                          </div>
                          <p className="text-[9px] text-zinc-450 mt-1">Resolved grievances resurfacing under spatial search.</p>
                        </div>
                        
                        <div className="border-t border-zinc-850 pt-4 flex-1 flex flex-col justify-between">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[9px] text-zinc-400 uppercase font-mono font-bold">Resurrected:</span>
                            <span className="text-xl font-black text-red-500">
                              <TickingNumber value={4} />
                            </span>
                          </div>

                          <div className="space-y-1.5 max-h-[80px] overflow-y-auto pr-1">
                            <div className="text-[9px] bg-black/30 border border-zinc-850 p-1.5 rounded flex flex-col gap-0.5">
                              <span className="text-zinc-300 font-bold line-clamp-1">🔄 Water Leakage</span>
                              <span className="text-red-400 font-mono text-[8px]">Resurfaced after 11 days</span>
                            </div>
                            <div className="text-[9px] bg-black/30 border border-zinc-850 p-1.5 rounded flex flex-col gap-0.5">
                              <span className="text-zinc-300 font-bold line-clamp-1">🔄 Road Damage</span>
                              <span className="text-red-400 font-mono text-[8px]">Resurfaced after 7 days</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                      </SpotlightCard>

                    </motion.div>

              {/* Main Dashboard Grid: 3-column layout */}
              <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                
                {/* Column 1: AI Intelligence Alert Feed (4 cols) */}
                <div className="md:col-span-4 space-y-4 flex flex-col">
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
                          ? 'border-purple-500/30 bg-purple-950/10 ring-1 ring-purple-500/20' 
                          : 'border-zinc-900/30 bg-zinc-950/20 hover:border-zinc-800/40';

                        // Apply the pulse animation class to critical alerts
                        if (anomaly.severity === 'critical') {
                          borderClass += ' animate-critical-pulse';
                        }

                        if (anomaly.type === 'delay') {
                          icon = '⚠';
                          headingColor = 'text-yellow-400';
                        }

                        let relativeMinutes = 10;
                        if (anomaly.id === 'admin-delay-w3') relativeMinutes = 8;
                        if (anomaly.id === 'false-closure-cp') relativeMinutes = 6;

                        return (
                          <motion.div 
                            key={anomaly.id} 
                            variants={itemVariants}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedAnomalyId(anomaly.id)}
                          >
                          <SpotlightCard critical={anomaly.severity === 'critical'} className={`glass-aurora rounded-xl p-4 cursor-pointer flex flex-col space-y-3 ${borderClass}`}>
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
                              <span className="text-[9px] text-zinc-550 uppercase font-bold">Confidence Score:</span>
                              <div className="flex items-center space-x-1.5">
                                <span className="font-mono text-zinc-600 font-bold text-[9px] tracking-widest hidden sm:inline">
                                  {renderConfidenceBar(anomaly.confidence)}
                                </span>
                                <span className="text-white font-extrabold font-mono text-xs">{anomaly.confidence}%</span>
                              </div>
                            </div>
                          </SpotlightCard>
                          </motion.div>
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
                        <span className="text-zinc-650 text-[8px] uppercase block">Last Analysis Run</span>
                        <span className="text-white font-bold">{getRelativeTime(2)}</span>
                      </div>
                      <div>
                        <span className="text-zinc-650 text-[8px] uppercase block">Records Processed</span>
                        <span className="text-white font-bold">{complaints.length} Complaints</span>
                      </div>
                      <div className="col-span-2 mt-0.5 border-t border-zinc-900/20 pt-1.5 flex justify-between items-center">
                        <span className="text-zinc-650 text-[8px] uppercase block font-bold">Model Confidence</span>
                        <span className="text-purple-400 font-extrabold block">92% (RealityEngine-v1.8)</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Column 2: Centerpiece Governance Impact Simulator (5 cols) */}
                <div className="md:col-span-5 space-y-4 flex flex-col">
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center space-x-2 border-b border-zinc-900/60 pb-2">
                    <Compass className="h-4.5 w-4.5 text-purple-400" />
                    <span>Impact Simulator (Predictive Engine)</span>
                  </h3>

                  {selectedAnomaly ? (
                    <SpotlightCard className="glass-aurora rounded-xl p-5 flex-1 flex flex-col justify-between space-y-5">
                      
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
                            <h5 className="text-[9px] font-black uppercase tracking-wider text-red-450 border-b border-red-500/10 pb-1.5">
                              Scenario A: Ignore Alert
                            </h5>
                            
                            <div className="space-y-3 mt-3 text-[10px] text-zinc-400">
                              <div>
                                <span className="text-[8px] text-zinc-500 uppercase block font-bold">After 24 hrs:</span>
                                <span className="text-white font-bold text-xs">
                                  <TickingNumber value={selectedAnomaly.ignore24hVal} prefix="+" /> complaints expected
                                </span>
                              </div>
                              <div>
                                <span className="text-[8px] text-zinc-500 uppercase block font-bold">After 72 hrs:</span>
                                <span className="text-white font-bold text-xs">
                                  <TickingNumber value={selectedAnomaly.ignore72hVal} prefix="+" /> complaints expected
                                </span>
                              </div>
                              <div>
                                <span className="text-[8px] text-zinc-500 uppercase block font-bold">Estimated Citizen Impact:</span>
                                <span className="text-red-400 font-bold text-xs">
                                  ~250 residents
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
                            <h5 className="text-[9px] font-black uppercase tracking-wider text-emerald-450 border-b border-emerald-500/10 pb-1.5">
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
                                  Issue likely contained
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

                    </SpotlightCard>
                  ) : (
                    <div className="glass-aurora rounded-xl p-6 text-center py-20 flex-1 flex flex-col justify-center">
                      <Clock className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                      <p className="text-xs" style={{ color: '#334155' }}>Select an active anomaly to launch impact calculations.</p>
                    </div>
                  )}
                </div>

                {/* Column 3: Geographic Risk Zones & Explainable AI (3 cols) */}
                <div className="md:col-span-3 space-y-4 flex flex-col justify-between">
                  
                  {/* Geographic Intelligence Map panel */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-white uppercase tracking-widest flex justify-between items-center border-b border-zinc-900/60 pb-2">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4.5 w-4.5 text-purple-400" />
                        <span>Governance Risk Zones</span>
                      </div>
                      <div className="flex gap-2 text-[8px] font-mono">
                        <span className="flex items-center gap-1 text-red-400"><span className="h-2 w-2 rounded-full bg-red-500" /> Critical (1)</span>
                        <span className="flex items-center gap-1 text-orange-400"><span className="h-2 w-2 rounded-full bg-orange-500" /> High (2)</span>
                        <span className="flex items-center gap-1 text-yellow-400"><span className="h-2 w-2 rounded-full bg-yellow-500" /> Monitor (4)</span>
                      </div>
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

                          {/* Connaught Place - Hotspot (Bottom Right) */}
                          <circle cx="80" cy="75" r="3" fill="#eab308" className="cursor-pointer" onClick={() => setSelectedAnomalyId('false-closure-cp')} />
                          <circle cx="80" cy="75" r="6" stroke="#eab308" strokeWidth="0.4" fill="none" className="animate-ping" style={{ transformOrigin: '80px 75px' }} />

                          {/* Labels */}
                          <text x="14" y="18" fill="#ef4444" fontSize="3" className="font-mono font-bold">Sec 12</text>
                          <text x="69" y="42" fill="#f59e0b" fontSize="3" className="font-mono font-bold">Ward 3</text>
                          <text x="50" y="77" fill="#eab308" fontSize="3" className="font-mono font-bold">Connaught Pl</text>
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
                          onClick={() => setSelectedAnomalyId('false-closure-cp')}
                          className={`py-1.5 rounded transition-all text-center ${selectedAnomalyId === 'false-closure-cp' ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400' : 'bg-black/40 border border-zinc-900/60 text-zinc-500 hover:text-white hover:border-zinc-800'}`}
                        >
                          🟡 CP
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
              </motion.div>
              {/* Row: AI Directives, Trends, and Executive Story Mode Stepper */}
              <motion.div 
                variants={containerVariants}
                className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4"
              >
                
                {/* 1. AI Action Directives Panel */}
                <motion.div 
                  variants={itemVariants}
                  className="md:col-span-4 glass-panel rounded-3xl p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="border-b border-zinc-900/60 pb-2">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-purple-400" />
                      <span>AI Recommendation Directives</span>
                    </h3>
                  </div>

                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
                    {aiRecommendations && aiRecommendations.length > 0 ? (
                      aiRecommendations.map((rec, i) => (
                        <motion.div 
                          key={i} 
                          whileHover={{ scale: 1.015 }}
                          className="bg-[#11141d] border border-zinc-900 rounded-xl p-3 space-y-1.5"
                        >
                          <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-wider">
                            <span className="text-purple-400">Directive #{i + 1}</span>
                            <span className="bg-red-950/20 border border-red-500/10 text-red-400 px-1.5 rounded font-mono">
                              {rec.type}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-300 font-bold leading-normal">{rec.issue}</p>
                          <p className="text-[10px] text-zinc-400 italic bg-black/40 p-1.5 rounded border border-zinc-950">
                            💡 {rec.recommendation}
                          </p>
                        </motion.div>
                      ))
                    ) : (
                      <p className="text-[10px] text-zinc-500 py-6 text-center">No directives logged for this cycle.</p>
                    )}
                  </div>
                </motion.div>

                {/* 2. Reality Gap Trends */}
                <motion.div 
                  variants={itemVariants}
                  className="md:col-span-4 glass-panel rounded-3xl p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="border-b border-zinc-900/60 pb-2 flex justify-between items-center">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-purple-400" />
                      <span>Reality Gap Trends</span>
                    </h3>
                    <span className={`px-2 py-0.5 border text-[9px] font-mono font-bold rounded uppercase ${
                      trendDirection === 'Improving' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' :
                      trendDirection === 'Worsening' ? 'text-red-400 border-red-500/20 bg-red-500/5' :
                      'text-yellow-400 border-yellow-500/20 bg-yellow-500/5'
                    }`}>
                      {trendDirection}
                    </span>
                  </div>

                  {/* SVG Line Graph */}
                  <div className="h-48 flex items-center justify-center relative bg-black/20 rounded-2xl border border-zinc-950 p-2">
                    {trends && trends.length > 0 ? (
                      <div className="w-full h-full flex flex-col justify-between">
                        <svg className="w-full h-40 overflow-visible" viewBox="0 0 100 40">
                          {/* Grid Lines */}
                          <line x1="0" y1="10" x2="100" y2="10" stroke="#181c26" strokeWidth="0.5" strokeDasharray="2,2" />
                          <line x1="0" y1="20" x2="100" y2="20" stroke="#181c26" strokeWidth="0.5" strokeDasharray="2,2" />
                          <line x1="0" y1="30" x2="100" y2="30" stroke="#181c26" strokeWidth="0.5" strokeDasharray="2,2" />
                          
                          {/* Official Resolution Rate Line */}
                          <motion.path
                            d={`M 12.5 ${40 - (trends[0]?.officialRate || 0)/3} L 37.5 ${40 - (trends[1]?.officialRate || 0)/3} L 62.5 ${40 - (trends[2]?.officialRate || 0)/3} L 87.5 ${40 - (trends[3]?.officialRate || 0)/3}`}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="1.2"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                          />
                          {/* Reality Resolution Rate Line */}
                          <motion.path
                            d={`M 12.5 ${40 - (trends[0]?.verifiedRate || 0)/3} L 37.5 ${40 - (trends[1]?.verifiedRate || 0)/3} L 62.5 ${40 - (trends[2]?.verifiedRate || 0)/3} L 87.5 ${40 - (trends[3]?.verifiedRate || 0)/3}`}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="1.2"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                          />
                          {/* Reality Gap Line */}
                          <motion.path
                            d={`M 12.5 ${40 - (trends[0]?.realityGap || 0)/3} L 37.5 ${40 - (trends[1]?.realityGap || 0)/3} L 62.5 ${40 - (trends[2]?.realityGap || 0)/3} L 87.5 ${40 - (trends[3]?.realityGap || 0)/3}`}
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="1.2"
                            strokeDasharray="2,1"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
                          />

                          {/* Data points */}
                          {trends.map((t, idx) => {
                            const x = 12.5 + idx * 25;
                            return (
                              <g key={idx}>
                                <motion.circle 
                                  cx={x} 
                                  cy={40 - t.officialRate/3} 
                                  r="1.5" 
                                  fill="#3b82f6" 
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: 0.8 + idx * 0.1 }}
                                />
                                <motion.circle 
                                  cx={x} 
                                  cy={40 - t.verifiedRate/3} 
                                  r="1.5" 
                                  fill="#10b981" 
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: 0.9 + idx * 0.1 }}
                                />
                                <motion.circle 
                                  cx={x} 
                                  cy={40 - t.realityGap/3} 
                                  r="1.5" 
                                  fill="#ef4444" 
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: 1.0 + idx * 0.1 }}
                                />
                              </g>
                            );
                          })}
                        </svg>
                        
                        <div className="flex justify-between text-[8px] font-mono text-zinc-500 border-t border-zinc-900/60 pt-1.5 px-2">
                          {trends.map((t, idx) => (
                            <span key={idx}>{t.label}</span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-zinc-500">Not enough history for trend lines.</p>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-[8px] font-mono text-zinc-500 border-t border-zinc-900/40 pt-2 px-1">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Official</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Ground</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Gap</span>
                  </div>
                </motion.div>

                {/* 3. Executive Story Mode Stepper Widget */}
                <motion.div 
                  variants={itemVariants}
                  className="md:col-span-4 glass-panel rounded-3xl p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="border-b border-zinc-900/60 pb-2 flex justify-between items-center">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                      <Shield className="h-4 w-4 text-purple-400" />
                      <span>Executive Story Mode</span>
                    </h3>
                    <span className="text-[9px] bg-purple-950/20 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-black font-mono animate-pulse">
                      Live Sim
                    </span>
                  </div>

                  <div className="flex-1 flex flex-col justify-between space-y-3 min-h-[120px]">
                    <div className="text-[10px] text-zinc-400 space-y-2">
                      <div className="flex justify-between items-center border-b border-zinc-900/40 pb-1.5">
                        <span className="text-zinc-550 uppercase font-extrabold text-[8px]">Simulation Progress:</span>
                        <span className="text-white font-extrabold">Phase {storyStep}/4</span>
                      </div>
                      
                      {/* Vertical timeline stepper */}
                      <div className="space-y-4 py-2 relative">
                        {/* Vertical line connecting nodes */}
                        <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-zinc-900" />
                        {/* Glowing active line segment */}
                        <div 
                          className="absolute left-3.5 top-2 w-0.5 bg-purple-500 transition-all duration-500" 
                          style={{ height: `${storyStep === 0 ? 0 : Math.min(100, ((storyStep - 1) / 3) * 100)}%` }} 
                        />

                        {[
                          { stepNum: 1, label: 'Grievance Lodged', desc: 'Citizen files dirty water complaint at Dwarka Sec 12' },
                          { stepNum: 2, label: 'Official Resolution', desc: 'Officer marks status as Resolved in municipal database' },
                          { stepNum: 3, label: 'Citizen Dispute', desc: 'Citizen disputes resolution on portal, reopening the case' },
                          { stepNum: 4, label: 'Reality Engine Audit', desc: 'System applies penalty, lowering officer trust to 30%' }
                        ].map((st) => {
                          const isPast = storyStep >= st.stepNum;
                          const isActive = storyStep === st.stepNum;
                          
                          return (
                            <div key={st.stepNum} className="flex items-start space-x-3.5 relative z-10">
                              {/* Node circle */}
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center border font-mono text-[9px] font-black transition-all duration-300 ${
                                isActive 
                                  ? 'bg-purple-950 border-purple-500 text-purple-300 shadow-[0_0_12px_rgba(139,92,246,0.6)] scale-110' 
                                  : isPast 
                                  ? 'bg-purple-900/20 border-purple-500/40 text-purple-400' 
                                  : 'bg-[#0a0c14] border-zinc-850 text-zinc-650'
                              }`}>
                                {isActive && storyLoading ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
                                ) : isActive ? (
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                                  </span>
                                ) : st.stepNum}
                              </div>
                              
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <span className={`text-[10px] font-black uppercase tracking-wider ${
                                    isActive ? 'text-purple-300' : isPast ? 'text-zinc-300' : 'text-zinc-650'
                                  }`}>
                                    {st.label}
                                  </span>
                                  {st.stepNum === 4 && storyStep === 4 && (
                                    <span className="text-[8px] font-mono text-red-500 bg-red-950/20 border border-red-500/20 px-1.5 py-0.5 rounded animate-pulse">
                                      Trust: 85% → 30%
                                    </span>
                                  )}
                                </div>
                                <p className={`text-[9px] leading-relaxed mt-0.5 ${
                                  isActive ? 'text-zinc-300' : 'text-zinc-550'
                                }`}>
                                  {st.desc}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Display live complaint reality score dynamically */}
                      {storyComplaint && (
                        <div className="bg-black/40 p-2.5 rounded-xl border border-zinc-900/60 font-mono text-[9px] text-zinc-400 space-y-1 mt-2">
                          <div className="flex justify-between">
                            <span>Title:</span> <span className="text-white font-bold max-w-[180px] truncate">{storyComplaint.title}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Status:</span> <span className={`font-bold uppercase ${storyComplaint.status === 'reopened' ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>{storyComplaint.status}</span>
                          </div>
                          <div className="flex justify-between items-center border-t border-zinc-900/40 pt-1 mt-1">
                            <span>Reality Score:</span>
                            <span className={`font-bold text-xs ${storyComplaint.realityScore < 40 ? 'text-red-400' : 'text-emerald-400'}`}>{storyComplaint.realityScore}%</span>
                          </div>
                        </div>
                      )}

                      {/* Telemetry/Audit Logs inside stepper */}
                      <div className="mt-2 text-[9px] font-mono border-t border-zinc-900/60 pt-2 space-y-1.5">
                        <div className="text-[8px] text-zinc-555 uppercase font-black tracking-wider">Audit Telemetry Logs</div>
                        <div className="max-h-[85px] overflow-y-auto space-y-1 pr-1">
                          {storyStep >= 1 && (
                            <div className="text-zinc-400 text-[8px] leading-relaxed">
                              <span className="text-purple-400">[0.0s]</span> REG: Complaint initialized at Dwarka Sector 12. Category matches Water Supply. Priority High.
                            </div>
                          )}
                          {storyStep >= 2 && (
                            <div className="text-zinc-400 text-[8px] leading-relaxed">
                              <span className="text-purple-400">[0.4s]</span> RES: Officer Rajesh Kumar marked complaint resolved in DB. RealityEngine confidence 94%.
                            </div>
                          )}
                          {storyStep >= 3 && (
                            <div className="text-zinc-400 text-[8px] leading-relaxed">
                              <span className="text-amber-450 text-[8px] leading-relaxed">
                                <span className="text-yellow-400">[1.1s]</span> DISP: Citizen refuted resolution, reopening complaint. Reopened count increased.
                              </span>
                            </div>
                          )}
                          {storyStep >= 4 && (
                            <div className="text-red-400 font-bold animate-pulse text-[8px] leading-relaxed">
                              <span className="text-red-500">[1.8s]</span> PENALTY: TrustEngine flagged breach. Trust reduced 85% → 30%. Reality Score drops to {storyComplaint?.realityScore || 18}%.
                            </div>
                          )}
                          {storyLoading && (
                            <div className="text-zinc-550 italic animate-pulse text-[8px] flex items-center gap-1.5 py-1">
                              <Loader2 className="h-3 w-3 animate-spin text-zinc-655" />
                              <span>Executing database write/re-audit...</span>
                            </div>
                          )}
                          {storyStep === 0 && !storyLoading && (
                            <div className="text-zinc-600 text-[8px] italic py-2 text-center">
                              No active simulation trace. Select Step 1 to begin.
                            </div>
                          )}
                        </div>
                      </div>

                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-900/60">
                      <button
                        onClick={() => runStoryStep('reset')}
                        disabled={storyLoading}
                        className="py-2 text-[9px] font-extrabold uppercase tracking-wider rounded-xl border border-zinc-900 bg-zinc-950 hover:bg-zinc-900 hover:text-white text-zinc-400 transition-all disabled:opacity-50"
                      >
                        Reset Demo
                      </button>

                      {storyStep === 0 && (
                        <button
                          onClick={() => runStoryStep('step1')}
                          disabled={storyLoading}
                          className="py-2 text-[9px] font-extrabold uppercase tracking-wider rounded-xl bg-purple-650 hover:bg-purple-600 border border-purple-550/20 text-white transition-all disabled:opacity-50"
                        >
                          Step 1: Lodge
                        </button>
                      )}

                      {storyStep === 1 && (
                        <button
                          onClick={() => runStoryStep('step2')}
                          disabled={storyLoading}
                          className="py-2 text-[9px] font-extrabold uppercase tracking-wider rounded-xl bg-purple-650 hover:bg-purple-600 border border-purple-550/20 text-white transition-all disabled:opacity-50"
                        >
                          Step 2: Resolve
                        </button>
                      )}

                      {storyStep === 2 && (
                        <button
                          onClick={() => runStoryStep('step3')}
                          disabled={storyLoading}
                          className="py-2 text-[9px] font-extrabold uppercase tracking-wider rounded-xl bg-purple-650 hover:bg-purple-600 border border-purple-550/20 text-white transition-all disabled:opacity-50"
                        >
                          Step 3: Dispute
                        </button>
                      )}

                      {storyStep >= 3 && (
                        <button
                          onClick={() => runStoryStep('step4')}
                          disabled={storyLoading || storyStep === 4}
                          className="py-2 text-[9px] font-extrabold uppercase tracking-wider rounded-xl bg-purple-650 hover:bg-purple-600 border border-purple-550/20 text-white transition-all disabled:opacity-50 disabled:bg-purple-950/20 disabled:text-zinc-650"
                        >
                          {storyStep === 4 ? 'Flow Completed' : 'Step 4: Audit'}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
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
                          {getRealityExplanation(c).map((ev: any, idx: number) => {
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
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fadeIn">
              
              {/* Sidebar Quick Prompts */}
              <div className="md:col-span-4 glass-panel rounded-3xl p-6 flex flex-col justify-between h-[520px]">
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
              <div className="md:col-span-8 glass-panel-glow rounded-3xl p-6 flex flex-col h-[520px] justify-between">
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
                        {isAI && (
                          <div className="flex justify-between items-start mt-3 pt-2 border-t border-zinc-900/60">
                            <button
                              type="button"
                              onClick={() => speakText(chat.text, idx)}
                              className={`flex items-center gap-1.5 text-[10px] transition-colors ${
                                currentlySpeakingIdx === idx 
                                  ? 'text-purple-400 font-bold' 
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              {currentlySpeakingIdx === idx ? (
                                <>
                                  <VolumeX className="h-3.5 w-3.5 text-purple-400" />
                                  <span>Stop reading</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 className="h-3.5 w-3.5" />
                                  <span>Read aloud</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {copilotLoading && (
                    <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3.5 text-xs text-zinc-400 flex items-center space-x-2 align-self-start">
                      <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                      <span>{copilotThinkingState || 'RAG Copilot scanning database logs...'}</span>
                    </div>
                  )}
                </div>

                <form onSubmit={handleCopilotSubmit} className="flex space-x-2 border-t border-zinc-900 pt-4">
                  <div className="relative flex-1 flex items-center">
                    <input
                      type="text"
                      required
                      value={copilotQuestion}
                      onChange={(e) => setCopilotQuestion(e.target.value)}
                      placeholder="Enter strategic command queries..."
                      className="w-full rounded-xl border border-zinc-900 bg-black/40 pl-4 pr-12 py-3.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-purple-500/50"
                    />
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`absolute right-3 p-1.5 rounded-lg transition-colors ${
                        isListening 
                          ? 'text-red-500 bg-red-500/10 animate-pulse' 
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                      title={isListening ? "Stop listening" : "Start voice command"}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                  </div>
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
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-6"
            >
              <motion.div variants={itemVariants}>
                <h2 className="text-base font-extrabold text-white uppercase tracking-wider">Staff Audit & Manipulation Protection</h2>
                <p className="text-xs text-zinc-550 mt-0.5">
                  Dynamic profiles and metrics designed to flag resolution falsifications and overloaded departments.
                </p>
              </motion.div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                
                {/* General Staff Table (8 cols) */}
                <motion.div variants={itemVariants} className="md:col-span-8 glass-panel rounded-3xl border border-zinc-900 overflow-hidden flex flex-col justify-between">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-zinc-300">
                      <thead>
                        <tr className="border-b border-zinc-900 text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-950/30">
                          <th className="px-6 py-4">Officer Name</th>
                          <th className="px-6 py-4">Trust Trend</th>
                          <th className="px-6 py-4">Category</th>
                          <th className="px-6 py-4">Caseload</th>
                          <th className="px-6 py-4">Reopened</th>
                          <th className="px-6 py-4">Bandwidth</th>
                          <th className="px-6 py-4">Risk Rating</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/60">
                        {officers.map((off, idx) => {
                          const name = off.userId?.name || 'Unassigned';
                          const activeLoad = off.activeWorkload ?? 0;
                          const reopenCount = off.reopenedComplaints ?? 0;
                          const bandwidth = Math.max(0, 100 - activeLoad * 15);
                          const trustCategory = getOfficerCategory(off.trustScore);
                          
                          // Generate mock history for sparkline
                          const mockHistory = [
                            { score: off.trustScore + (Math.random() * 10 - 5) },
                            { score: off.trustScore + (Math.random() * 8 - 4) },
                            { score: off.trustScore + (Math.random() * 6 - 3) },
                            { score: off.trustScore }
                          ];

                          let riskLevel = 'LOW RISK';
                          let riskBadgeColor = 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
                          if (off.trustScore < 60) {
                            riskLevel = 'LOW TRUST';
                            riskBadgeColor = 'text-red-400 border-red-500/20 bg-red-500/5 shadow-[0_0_10px_rgba(239,68,68,0.2)]';
                          } else if (bandwidth < 40) {
                            riskLevel = 'OVERLOADED';
                            riskBadgeColor = 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5 shadow-[0_0_10px_rgba(234,179,8,0.2)]';
                          }

                          return (
                            <tr key={idx} className="hover:bg-zinc-900/40 transition-colors cursor-default group">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400 group-hover:border-purple-500/50 group-hover:text-purple-400 transition-colors">
                                    {name.charAt(0)}
                                  </div>
                                  <div>
                                    <span className="font-bold text-white block">{name}</span>
                                    <span className="text-[8px] text-zinc-550 uppercase font-semibold block mt-0.5">{off.departmentId?.name}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  <span className="font-mono text-white font-bold">{off.trustScore}%</span>
                                  {renderSparkline(mockHistory)}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 border text-[9px] font-bold rounded uppercase tracking-wide ${trustCategory.style}`}>
                                  {trustCategory.name}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-zinc-400 font-mono">{activeLoad}</td>
                              <td className="px-6 py-4 text-zinc-400 font-mono">{reopenCount}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${bandwidth < 40 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${bandwidth}%` }} />
                                  </div>
                                  <span className="text-zinc-400 font-mono text-[9px] w-6">{bandwidth}%</span>
                                </div>
                              </td>
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
                </motion.div>

                {/* High-Risk Officer Watchlist (4 cols) */}
                <motion.div variants={itemVariants} className="md:col-span-4 glass-panel rounded-3xl p-5 flex flex-col justify-between space-y-4">
                  <div className="border-b border-zinc-900/60 pb-2">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4 text-red-400" />
                      <span>Accountability Watchlist</span>
                    </h3>
                  </div>

                  <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[360px] pr-1">
                    {officers.filter(off => off.trustScore < 80).length > 0 ? (
                      officers.filter(off => off.trustScore < 80).map((off, idx) => {
                        const name = off.userId?.name || 'Unassigned';
                        const trustCategory = getOfficerCategory(off.trustScore);
                        
                        return (
                          <motion.div 
                            key={idx} 
                            whileHover={{ scale: 1.02 }}
                            className="bg-[#11141d] border border-red-900/30 shadow-[0_0_15px_rgba(239,68,68,0.05)] rounded-xl p-4 space-y-3 relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-bl-full pointer-events-none" />
                            <div className="flex justify-between items-start relative z-10">
                              <div>
                                <h4 className="text-xs font-black text-white flex items-center gap-2">
                                  <UserCheck className="h-3 w-3 text-red-400" />
                                  {name}
                                </h4>
                                <p className="text-[9px] text-zinc-550 font-bold uppercase mt-0.5 ml-5">{off.departmentId?.name}</p>
                              </div>
                              <span className={`px-2 py-0.5 border text-[9px] font-bold rounded uppercase tracking-wide ${trustCategory.style}`}>
                                {trustCategory.name}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[9px] font-mono border-t border-zinc-900/40 pt-2 text-zinc-400 relative z-10">
                              <div>
                                <span className="text-zinc-550 block text-[8px]">TRUST LEVEL:</span>
                                <span className="text-red-400 font-extrabold text-lg">{off.trustScore}%</span>
                              </div>
                              <div>
                                <span className="text-zinc-550 block text-[8px]">ACTIVE WORKLOAD:</span>
                                <span className="text-white font-extrabold text-lg">{off.activeWorkload ?? 0}</span>
                              </div>
                            </div>
                            
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 text-[9px] text-red-300 leading-relaxed font-sans flex gap-2 items-start relative z-10">
                              <EyeOff className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                              <span>Self-closure authority revoked due to {off.trustScore < 50 ? 'critical risk' : 'under review'} classification. Require 3rd party validation.</span>
                            </div>
                          </motion.div>
                        );
                      })
                    ) : (
                      <p className="text-[10px] text-zinc-500 py-12 text-center">{"All active department officers meet the Trusted baseline (≥ 80%)."}</p>
                    )}
                  </div>
                </motion.div>

              </div>
            </motion.div>
          )}

          {/* TAB 5: CRISIS RADAR */}
          {activeSection === 'crisis-radar' && (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-12 gap-6"
            >
              
              {/* Map grid panel */}
              <motion.div variants={itemVariants} className="md:col-span-7 glass-panel rounded-3xl p-6 flex flex-col h-[520px] justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <Compass className="h-5 w-5 text-purple-400" />
                    <span>Crisis Radar Area Sensor</span>
                  </h3>
                  <p className="text-[10px] text-zinc-500 mt-1 max-w-sm leading-relaxed">
                    Select a localized sector below to check for safety hazard density. Live telemetry maps real-time civic risk concentrations.
                  </p>
                </div>

                {/* Simulated geographic coordinates grid map */}
                <div className="flex-1 bg-zinc-950/60 rounded-3xl border border-zinc-900/60 p-6 grid grid-cols-3 gap-4 items-center justify-items-center relative mt-4 shadow-inner z-10">
                  {/* Grid Lines for tech aesthetic */}
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none mix-blend-overlay"></div>
                  
                  {hotspotsList.map((hotspot, idx) => {
                    const isSelected = selectedHotspot === hotspot.name;

                    // Filter area alerts
                    const localComplaints = complaints.filter(c => c.location?.address.includes(hotspot.name.split(' ')[0]));
                    const activeHazardsCount = localComplaints.filter(c => c.priority === 'critical' && c.status !== 'resolved').length;
                    
                    return (
                      <motion.button
                        key={hotspot.name}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setSelectedHotspot(hotspot.name);
                          setVisitAddress(hotspot.address);
                        }}
                        className={`w-full max-w-[140px] rounded-2xl border p-4 text-left transition-all ${
                          isSelected 
                            ? 'bg-purple-950/30 border-purple-500/50 shadow-[0_0_25px_rgba(139,92,246,0.15)] ring-1 ring-purple-500/30' 
                            : 'bg-zinc-900/40 border-zinc-800 hover:border-purple-500/30 hover:bg-zinc-900/80'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[11px] font-extrabold text-white block truncate">{hotspot.name.split(' ')[0]}</span>
                            <span className="text-[8px] text-zinc-500 font-mono mt-0.5 block">{hotspot.sector}</span>
                          </div>
                          <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-800 text-zinc-500'}`}>
                            <MapPin className={`h-3.5 w-3.5 ${isSelected ? 'animate-bounce' : ''}`} />
                          </div>
                        </div>
                        
                        <div className="mt-4 flex justify-between items-end border-t border-zinc-800/50 pt-2">
                          <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">Hazards</span>
                          <span className={`text-sm font-black font-mono ${activeHazardsCount > 0 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                            {activeHazardsCount > 0 ? activeHazardsCount : '0'}
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {selectedHotspot && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => {
                      setSelectedHotspot(null);
                      setVisitAddress('');
                    }}
                    className="text-[10px] text-zinc-500 hover:text-purple-400 uppercase font-bold tracking-widest text-left mt-4 relative z-10 transition-colors"
                  >
                    Clear Radar Selection ✕
                  </motion.button>
                )}
              </motion.div>

              {/* Vicinity Risks */}
              <motion.div variants={itemVariants} className="md:col-span-5 glass-panel rounded-3xl p-6 flex flex-col h-[520px] overflow-hidden">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5 mb-5 border-b border-zinc-900/60 pb-3">
                  <BellRing className="h-4 w-4 text-purple-400" />
                  <span>Vicinity Hazard Status</span>
                </h3>

                {!selectedHotspot ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                    <div className="h-16 w-16 rounded-full bg-zinc-900/50 border border-zinc-800 flex items-center justify-center mb-4">
                      <Compass className="h-8 w-8 text-zinc-600 animate-spin-slow" />
                    </div>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Awaiting Sector Selection</p>
                    <p className="text-[10px] text-zinc-600 mt-2 max-w-[200px] leading-relaxed">
                      Select a map region from the radar to extract localized sensor readings and active complaints.
                    </p>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex-1 flex flex-col h-full overflow-hidden"
                  >
                    <div className="mb-4 bg-zinc-950/60 p-4 rounded-2xl border border-zinc-900/60 flex items-center justify-between">
                      <div>
                        <p className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                          Target Acquired
                        </p>
                        <p className="text-sm text-white font-bold mt-1 tracking-wide">{selectedHotspot}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] text-zinc-500 uppercase font-bold tracking-wider">Active Logs</p>
                        <p className="text-sm font-black font-mono text-purple-400">{radarFilteredComplaints.length}</p>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                      <AnimatePresence>
                        {radarFilteredComplaints.length === 0 ? (
                          <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest text-center py-12"
                          >
                            No active hazards in selected quadrant.
                          </motion.p>
                        ) : (
                          radarFilteredComplaints.map((c, i) => (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.1 }}
                              key={i} 
                              className="p-4 rounded-2xl bg-zinc-950/50 border border-zinc-800 hover:border-zinc-700 transition-colors text-left space-y-3"
                            >
                              <div className="flex items-start justify-between">
                                <h4 className="text-xs font-bold text-white leading-snug pr-2">{c.title}</h4>
                                <span className={`text-[8px] font-black border px-2 py-0.5 rounded uppercase tracking-widest shrink-0 ${
                                  c.status === 'resolved' ? 'border-emerald-500/20 text-emerald-400 bg-emerald-500/10' : 'border-yellow-500/20 text-yellow-400 bg-yellow-500/10'
                                }`}>
                                  {c.status}
                                </span>
                              </div>
                              <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">{c.description}</p>
                              
                              <div className="flex items-center justify-between pt-2 mt-2 border-t border-zinc-800/60">
                                <span className="text-[9px] text-zinc-500 uppercase font-bold">
                                  Score: <span className={`font-black font-mono ${c.realityScore < 40 ? 'text-red-400' : 'text-emerald-400'}`}>{c.realityScore}%</span>
                                </span>
                                <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${
                                  c.realityStatus === 'Verified' ? 'text-emerald-400' : 'text-red-400'
                                }`}>
                                  {c.realityStatus === 'Verified' ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                                  {c.realityStatus}
                                </span>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </motion.div>

            </motion.div>
          )}

          {/* TAB 6: DAILY CM BRIEF */}
          {activeSection === 'daily-brief' && briefReport && (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="glass-panel rounded-3xl p-8 space-y-6 max-w-4xl mx-auto h-[600px] overflow-y-auto flex flex-col justify-between"
            >
              
              <div id="brief-print-container" className="space-y-6">
                
                {/* Header */}
                <motion.div variants={itemVariants} className="border-b border-zinc-900/60 pb-5 flex justify-between items-start">
                  <div className="flex gap-4 items-center">
                    <div className="h-12 w-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white uppercase tracking-widest">Strategic Intelligence Report</h2>
                      <p className="text-[9px] text-purple-400 font-bold uppercase tracking-wider mt-0.5">Chief Minister's Office Dashboard</p>
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-zinc-550 font-bold uppercase bg-black/30 p-2 rounded-xl border border-zinc-900/60">
                    <span className="block text-[8px] text-zinc-600 mb-0.5">Report Generated Date:</span>
                    <span className="text-white font-mono">{briefReport.date}</span>
                  </div>
                </motion.div>

                {/* Score panel */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-zinc-900/60 bg-zinc-950/40 p-5 rounded-2xl text-center shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl" />
                  <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
                  
                  <div className="relative z-10 border-b md:border-b-0 md:border-r border-zinc-900/60 pb-4 md:pb-0 md:pr-4">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block">Reported Resolution Rate</span>
                    <p className="text-2xl font-black text-white mt-1.5 font-mono"><TickingNumber value={briefReport.overallMetrics?.officialResolutionRate} suffix="%" /></p>
                  </div>
                  <div className="relative z-10 border-b md:border-b-0 md:border-r border-zinc-900/60 py-4 md:py-0 md:px-4">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest block flex items-center justify-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Ground Verified Rate
                    </span>
                    <p className="text-2xl font-black text-emerald-400 mt-1.5 font-mono"><TickingNumber value={briefReport.overallMetrics?.realityVerifiedRate} suffix="%" /></p>
                  </div>
                  <div className="relative z-10 pt-4 md:pt-0 md:pl-4">
                    <span className="text-[9px] text-red-400 font-bold uppercase tracking-widest block flex items-center justify-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-red-500" /> Reality Gap
                    </span>
                    <p className="text-2xl font-black text-red-500 mt-1.5 font-mono"><TickingNumber value={briefReport.overallMetrics?.realityGap} suffix="%" /></p>
                  </div>
                </motion.div>

                {/* Grid */}
                <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Department Gaps */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider border-b border-zinc-900/60 pb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-400" /> Department Risk Index
                    </h4>
                    <div className="space-y-3">
                      {briefReport.highRiskDepartments?.map((d: any, i: number) => (
                        <div key={i} className="flex justify-between items-center text-xs bg-black/30 p-3 rounded-xl border border-zinc-900/40">
                          <div className="flex items-center gap-3">
                            <span className="h-6 w-6 rounded bg-zinc-900 flex items-center justify-center text-[10px] font-bold text-zinc-500 font-mono">
                              #{i+1}
                            </span>
                            <span className="text-zinc-300 font-bold tracking-wide">{d.name} <span className="text-zinc-600 text-[10px]">({d.code})</span></span>
                          </div>
                          <span className="text-red-400 font-extrabold font-mono text-[11px] bg-red-950/20 px-2 py-1 rounded border border-red-500/10">+{d.realityGap}% Gap</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Suspicious closures */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-white uppercase tracking-wider border-b border-zinc-900/60 pb-2 flex items-center gap-2">
                      <Eye className="h-4 w-4 text-purple-400" /> Flagged Falsifications
                    </h4>
                    <div className="space-y-3">
                      {briefReport.suspiciousClosures?.length === 0 ? (
                        <p className="text-xs text-zinc-650 bg-black/20 p-4 rounded-xl text-center border border-zinc-900/40">No suspicious closures flagged today.</p>
                      ) : (
                        briefReport.suspiciousClosures?.map((s: any, i: number) => (
                          <div key={i} className="text-[11px] leading-snug bg-black/30 p-3 rounded-xl border border-zinc-900/40">
                            <p className="font-bold text-white truncate text-xs mb-1">"{s.title}"</p>
                            <div className="flex justify-between items-center text-[9px] text-zinc-500 mt-1.5 pt-1.5 border-t border-zinc-900/50">
                              <span>
                                Officer: <span className="text-zinc-300 font-bold">{s.officerName}</span> (Trust: {s.officerTrustScore}%)
                              </span>
                              <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-mono font-bold">Score: {s.realityScore}%</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </motion.div>

                {/* Directives */}
                <motion.div variants={itemVariants} className="space-y-4 pt-2">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider border-b border-zinc-900/60 pb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-400" /> Recommended Action Directives
                  </h4>
                  <div className="space-y-3 bg-purple-950/10 border border-purple-500/20 p-5 rounded-2xl shadow-[0_0_20px_rgba(139,92,246,0.05)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
                    {briefReport.recommendedActions?.map((act: string, i: number) => (
                      <div key={i} className="flex items-start space-x-3 text-xs text-zinc-300 relative z-10 bg-black/20 p-3 rounded-xl border border-purple-500/10">
                        <span className="h-5 w-5 bg-purple-500/20 rounded flex items-center justify-center text-purple-400 font-bold font-mono shrink-0 text-[10px]">{i + 1}</span>
                        <p className="leading-relaxed font-medium">{act}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>

              </div>

              {/* Action */}
              <motion.div variants={itemVariants} className="flex items-center justify-end border-t border-zinc-900/60 pt-5 mt-auto">
                <button
                  onClick={handlePrintPDF}
                  className="rounded-xl border border-purple-500/30 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 text-xs font-black uppercase tracking-widest flex items-center space-x-2 transition-all shadow-[0_0_15px_rgba(139,92,246,0.2)] hover:shadow-[0_0_25px_rgba(139,92,246,0.4)]"
                >
                  <Printer className="h-4 w-4" />
                  <span>Export Strategic PDF Brief</span>
                </button>
              </motion.div>

            </motion.div>
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
            <p className="text-xs">Location: Sector 12, Dwarka, Delhi</p>
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
                  <p>Subject: Streetlight Cluster | Location: Connaught Place | Status: Verification Required</p>
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
                  <p className="text-[10px] text-zinc-400">Location: Sector 12, Dwarka, Delhi</p>
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
                          <p>Location: <span className="text-zinc-300 font-bold">Connaught Place</span></p>
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
