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
 * Generates custom text answers (RAG) based on context database chunks.
 */
export async function askGeminiCopilot(question: string, context: string): Promise<string> {
  if (!ai) {
    return `[Mock Copilot Response]
You asked: "${question}"
System Note: GEMINI_API_KEY is not configured. Here is the analyzed dashboard context:
${context.substring(0, 400)}...
    
Based on local analysis, you should focus on resolving critical hazards and reviewing high-risk departments (e.g. Water & Sewerage Board).`;
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
    return result.response.text() || 'Unable to generate response from CM Copilot.';
  } catch (err) {
    console.error('Gemini Copilot Error:', err);
    return `An error occurred while calling the Gemini API: ${err instanceof Error ? err.message : String(err)}`;
  }
}
