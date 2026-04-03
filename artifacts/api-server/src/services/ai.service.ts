/**
 * AI Service — Placeholder + Live implementation
 *
 * When OPENROUTER_API_KEY is set, this calls OpenRouter (GPT-4o-mini).
 * When not set or on error, it returns a deterministic fallback response.
 * Swap this service for any LLM provider by replacing the `callLLM` function.
 */

import OpenAI from "openai";

export interface LeadInsightInput {
  businessName: string;
  contactName: string;
  vertical?: string | null;
  leadSource?: string | null;
  status: string;
  estimatedMonthlyVolume?: number | null;
  leadScore: number;
  existingPos?: string | null;
  processor?: string | null;
  lastContactDate?: string | null;
  nextFollowUpDate?: string | null;
  repName?: string | null;
  notes?: string[];
}

export interface LeadInsightOutput {
  summary: string;
  scoreExplanation: string;
  nextBestAction: string;
  recommendations: string[];
}

function buildFallback(input: LeadInsightInput): LeadInsightOutput {
  const vol = input.estimatedMonthlyVolume
    ? `$${input.estimatedMonthlyVolume.toLocaleString()}`
    : "unknown";
  return {
    summary: `${input.businessName} is a ${input.vertical ?? "merchant"} lead currently at the "${input.status}" stage with an estimated monthly volume of ${vol}.`,
    scoreExplanation: `This lead scored ${input.leadScore}/100 based on monthly volume, vertical type, lead source quality, and recency of contact.`,
    nextBestAction: "Schedule a discovery call to understand their payment processing needs and current pain points.",
    recommendations: [
      "Follow up within 48 hours to maintain momentum",
      "Send a tailored rate comparison vs their current processor",
      "Identify any hidden fees they may be paying",
    ],
  };
}

async function callLLM(prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === "dummy") {
    throw new Error("No API key — using fallback");
  }

  const client = new OpenAI({
    baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: {
      "HTTP-Referer": "https://clearpay.replit.app",
      "X-Title": "ClearPay Sales System",
    },
  });

  const response = await client.chat.completions.create({
    model: "openai/gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content ?? "{}";
}

export async function generateLeadInsight(
  input: LeadInsightInput
): Promise<LeadInsightOutput> {
  const notesText =
    input.notes && input.notes.length > 0
      ? input.notes.map((n) => `- ${n}`).join("\n")
      : "No notes yet.";

  const vol = input.estimatedMonthlyVolume
    ? `$${input.estimatedMonthlyVolume.toLocaleString()}`
    : "Unknown";

  const prompt = `You are a merchant services sales advisor. Analyze this lead and provide concise insights.

Lead: ${input.businessName} (${input.contactName})
Vertical: ${input.vertical ?? "Unknown"}
Lead Source: ${input.leadSource ?? "Unknown"}
Status: ${input.status}
Monthly Volume: ${vol}
Lead Score: ${input.leadScore}/100
Existing POS: ${input.existingPos ?? "Unknown"}
Current Processor: ${input.processor ?? "Unknown"}
Assigned Rep: ${input.repName ?? "Unassigned"}
Last Contact: ${input.lastContactDate ?? "Never"}
Next Follow-up: ${input.nextFollowUpDate ?? "Not scheduled"}

Notes:
${notesText}

Respond with valid JSON only (no markdown):
{
  "summary": "2-3 sentence overview of this lead's potential and current situation",
  "scoreExplanation": "1-2 sentences explaining the lead score of ${input.leadScore}/100",
  "nextBestAction": "Single most impactful action to advance this deal",
  "recommendations": ["action 1", "action 2", "action 3"]
}`;

  try {
    const content = await callLLM(prompt);
    const parsed = JSON.parse(content);
    return {
      summary: parsed.summary ?? buildFallback(input).summary,
      recommendations: parsed.recommendations ?? buildFallback(input).recommendations,
      scoreExplanation: parsed.scoreExplanation ?? buildFallback(input).scoreExplanation,
      nextBestAction: parsed.nextBestAction ?? buildFallback(input).nextBestAction,
    };
  } catch {
    return buildFallback(input);
  }
}
