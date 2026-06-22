import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the SDK if the key is available
const apiKey = process.env.GEMINI_API_KEY || '';
let ai: GoogleGenerativeAI | null = null;

if (apiKey) {
  try {
    ai = new GoogleGenerativeAI(apiKey);
  } catch (error) {
    console.error('Failed to initialize GoogleGenerativeAI with API Key:', error);
  }
} else {
  console.warn('GEMINI_API_KEY is not defined. Using mock AI fallbacks.');
}

/**
 * Automatically classifies a complaint title & description using Gemini.
 */
export async function classifyComplaint(title: string, description: string) {
  const defaultClassification = {
    category: 'General Grievance',
    department: 'Municipal Corporation',
    priority: 'medium' as const,
    riskLevel: 'medium' as const,
  };

  if (!ai) {
    // Basic local rule-based classification fallback if Gemini is offline/keyless
    const text = `${title} ${description}`.toLowerCase();
    if (text.includes('fire') || text.includes('smoke') || text.includes('burn')) {
      return { category: 'Fire Incident', department: 'Fire and Emergency Services', priority: 'critical' as const, riskLevel: 'critical' as const };
    }
    if (text.includes('electricity') || text.includes('wire') || text.includes('shock') || text.includes('power cut') || text.includes('transformer')) {
      return { category: 'Electrical Hazard', department: 'Electricity Board', priority: 'high' as const, riskLevel: 'high' as const };
    }
    if (text.includes('manhole') || text.includes('sewer') || text.includes('drain') || text.includes('gutter')) {
      return { category: 'Open Manhole', department: 'Water & Sewerage Board', priority: 'high' as const, riskLevel: 'high' as const };
    }
    if (text.includes('water') || text.includes('contamination') || text.includes('dirty water') || text.includes('leakage')) {
      return { category: 'Water Contamination', department: 'Water & Sewerage Board', priority: 'high' as const, riskLevel: 'high' as const };
    }
    if (text.includes('collapse') || text.includes('building') || text.includes('crack') || text.includes('landslide')) {
      return { category: 'Building Infrastructure', department: 'Municipal Corporation', priority: 'critical' as const, riskLevel: 'critical' as const };
    }
    return defaultClassification;
  }

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `
You are an advanced GovTech AI classification engine.
Given the following public grievance complaint:
Title: "${title}"
Description: "${description}"

Classify it into structured JSON with these EXACT keys:
- category (string, e.g. "Water Safety", "Road Damage", "Electrical Hazard", "Open Manhole", "Fire Incident", "Garbage Pileup")
- department (string, select the most relevant department from: "Water & Sewerage Board", "Electricity Board", "Municipal Corporation", "Fire and Emergency Services")
- priority (must be one of: "low", "medium", "high", "critical")
- riskLevel (must be one of: "low", "medium", "high", "critical")

Return ONLY a valid, parseable JSON object. No explanations, no markdown formatting blocks, just the raw JSON.
`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    });

    const contentText = result.response.text();
    if (contentText) {
      return JSON.parse(contentText.trim());
    }
  } catch (err) {
    console.error('Gemini Classification Error, using rule fallback:', err);
  }

  return defaultClassification;
}

/**
 * Generates vector embeddings for a given complaint content.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  // Return dummy 768-dimension vector if no Gemini API Key is present
  if (!ai) {
    const dummy = new Array(768).fill(0);
    const seed = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    for (let i = 0; i < 10; i++) {
      dummy[i] = (seed % (i + 1)) / 10;
    }
    return dummy;
  }

  try {
    const model = ai.getGenerativeModel({ model: 'text-embedding-004' });
    const response = await model.embedContent(text);
    
    if (response.embedding?.values) {
      return response.embedding.values;
    }
  } catch (err) {
    console.error('Gemini Embedding generation error, returning mock:', err);
  }

  return new Array(768).fill(0.1);
}

/**
 * Generates dynamic local answers as fallback based on dashboard context and user question.
 */
function getLocalCopilotResponse(question: string, context: string): string {
  const q = question.toLowerCase();

  // Helper to extract a section from context
  const extractSection = (header: string, nextHeaderRegex: RegExp): string => {
    const startIndex = context.indexOf(header);
    if (startIndex === -1) return '';
    const startOfContent = startIndex + header.length;
    const match = context.substring(startOfContent).match(nextHeaderRegex);
    if (match && match.index !== undefined) {
      return context.substring(startOfContent, startOfContent + match.index).trim();
    }
    return context.substring(startOfContent).trim();
  };

  const overallMetrics = extractSection('OVERALL METRICS:', /\n[A-Z]/);
  const activeAlerts = extractSection('ACTIVE CRITICAL ALERTS:', /\n[A-Z]/);
  const suspiciousClosures = extractSection('SUSPICIOUS CLOSURES[\s\S]*?:', /\n[A-Z]/);
  const departmentPerformance = extractSection('DEPARTMENT PERFORMANCE:', /\n[A-Z]/);
  const lowTrustOfficers = extractSection('LOW TRUST OFFICERS[\s\S]*?:', /\n---|\n$/);

  let response = '';

  if (q.includes('attention') || q.includes('priority') || q.includes('critical') || q.includes('what requires')) {
    response = `### 🚨 CM Action Required: Priority Items & Alerts

Here are the critical governance issues requiring your immediate intervention:

**1. Active Critical Safety Alerts:**
${activeAlerts && activeAlerts !== 'No active critical safety alerts.' 
  ? activeAlerts 
  : '*No active critical safety alerts currently reported. All major hazards are mitigated.*'}

**2. Direct Recommended Actions:**
${activeAlerts && activeAlerts !== 'No active critical safety alerts.'
  ? `- Deploy immediate field verification teams to the locations listed in the active alerts.
- Temporarily suspend officers responsible for repeated delays in safety resolutions.
- Order an administrative review of trust-breached closures.`
  : `- Review departments with high Reality Gaps (see below).
- Monitor performance of low-trust officers in the field.`}

**3. Suspicious Closures Status:**
${suspiciousClosures && suspiciousClosures !== 'No suspicious closures flagged.'
  ? `We have detected suspicious closures that were marked "Resolved" officially but are flagged as "High Risk" by the Reality Engine:
${suspiciousClosures}`
  : '*No suspicious closures detected.*'}`;
  } 
  else if (q.includes('department') || q.includes('reality gap') || q.includes('gap') || q.includes('performance')) {
    response = `### 📊 Department Performance & Reality Gap Analysis

The "Reality Gap" represents the difference between the **Official Resolution Rate** claimed by the department and the **Ground Reality Verified Rate** checked by citizens and AI sensors.

**Department Status:**
${departmentPerformance || '*No department data found.*'}

**Key Recommendations:**
1. **Target Large Gaps:** Address departments where the Reality Gap exceeds 10%. This indicates significant administrative misalignment or false reporting.
2. **Audit Municipal Services:** The Municipal Corporation frequently exhibits discrepancies. Establish random ground-truth verification rounds.
3. **Link Budgeting to Integrity:** Tie future department allocations to their Governance Integrity Score rather than official claims.`;
  }
  else if (q.includes('suspicious') || q.includes('closure') || q.includes('false')) {
    response = `### 🔍 Suspicious Closures Report (Reality Engine)

The following grievances were marked as "RESOLVED" by officers, but the Ground Reality Score is **High Risk** (<40%), suggesting potential false closures or inadequate work:

${suspiciousClosures && suspiciousClosures !== 'No suspicious closures flagged.'
  ? suspiciousClosures
  : '*Excellent: There are currently no suspicious closures flagged by the Reality Engine.*'}

**Executive Recommendation:**
- **Reopen & Reassign:** Automatically reopen these issues and assign them to independent audit teams.
- **Officer Accountability:** Flag officers who repeatedly close cases that are subsequently marked "High Risk".`;
  }
  else if (q.includes('officer') || q.includes('high-risk') || q.includes('trust')) {
    response = `### 👤 High-Risk Officers & Trust Scoring

Officers are scored based on citizen approval, average resolution time, and the frequency of reopened complaints or suspicious closures.

**Low Trust Officers (Score < 60%):**
${lowTrustOfficers && lowTrustOfficers !== 'No low trust officers flagged.'
  ? lowTrustOfficers
  : '*All active officers are currently performing above the 60% trust threshold.*'}

**Policy Actions:**
1. **Mandatory Audits:** Place any officer with a trust score below 60% under active administrative review.
2. **Freeze Resolution Claims:** Disallow automatic case-closure privileges for officers under warning status; require citizen feedback verification.`;
  }
  else if (q.includes('brief') || q.includes('summary') || q.includes('today')) {
    response = `### 📋 Chief Minister's Executive Brief

**1. Core System Metrics:**
${overallMetrics || '*Metrics unavailable*'}

**2. Critical Alerts & Hazards:**
${activeAlerts && activeAlerts !== 'No active critical safety alerts.'
  ? activeAlerts
  : '*No active critical safety alerts.*'}

**3. Top Administrative Concerns:**
- **Reality Discrepancies:** Multiple departments show gaps between claimed resolutions and ground truth.
- **Trust Integrity:** Attention should be given to Suspicious Closures and Low Trust Officers.

**4. 10-Second Executive Summary:**
- **Status:** The general Governance Integrity Score is stable, but field vigilance is required.
- **Immediate Action:** Direct the Sanitation/Municipal commissioner to report on unresolved critical alerts.`;
  }
  else {
    // General default response
    response = `### 🛡️ GovTech AI Governance Copilot Response

You asked: "${question}"

Here is the current Governance Intelligence Summary based on live database logs:

**System Metrics:**
${overallMetrics || '*Metrics unavailable*'}

**Active Critical Alerts:**
${activeAlerts && activeAlerts !== 'No active critical safety alerts.'
  ? activeAlerts
  : '*No active critical safety alerts.*'}

**Suspicious Closures Pending Audit:**
${suspiciousClosures && suspiciousClosures !== 'No suspicious closures flagged.'
  ? suspiciousClosures
  : '*No suspicious closures flagged.*'}

**Officer Trust Summary:**
${lowTrustOfficers && lowTrustOfficers !== 'No low trust officers flagged.'
  ? lowTrustOfficers
  : '*No low trust officers flagged.*'}

*Note: For detailed questions, please ask about specific departments, suspicious closures, high-risk officers, or current critical alerts.*`;
  }

  return `${response}\n\n*Analysis generated using local RAG fallback engine.*`;
}

/**
 * Generates custom text answers (RAG) based on context database chunks.
 */
export async function askGeminiCopilot(question: string, context: string): Promise<string> {
  if (!ai) {
    return getLocalCopilotResponse(question, context);
  }

  try {
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `
You are the "CM Copilot", a governance intelligence assistant for the Chief Minister's Office.
Your role is to analyze local complaints, departments, trust scores, and alerts to provide clear, actionable insights.

Here is the current system intelligence report:
---
${context}
---

User/CM Question:
"${question}"

Provide a concise, professional executive answer with bullets, highlighting exact problems, suspicious closures, and recommended steps.
`;

    const result = await model.generateContent(prompt);
    return result.response.text() || getLocalCopilotResponse(question, context);
  } catch (err) {
    console.error('Gemini Copilot Error, using local RAG fallback:', err);
    return getLocalCopilotResponse(question, context);
  }
}
