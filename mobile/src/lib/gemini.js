import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY in .env');
}

const genAI = new GoogleGenerativeAI(apiKey);

// Gemini 1.5 Flash - supports multimodal (text + images)
export const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

/**
 * Runs AI triage on scene images + audio recording.
 * @param {object} audio - { base64: string, mimeType: string }
 * @param {Array<{base64: string, mimeType: string}>} images
 * @returns {Promise<{severity: string, summary: string, injuries: string[], risks: string[], recommendations: string[], transcript: string, raw: object}>}
 */
export async function runAITriage(audio, images = []) {
  const prompt = `
You are an emergency medical AI triage assistant. Analyze the following emergency scene through the provided photos and audio recording.

IMPORTANT RULES:
- Respond ONLY with a valid JSON object.
- If the photos are completely black/blank and the audio is silent or has no speech, DO NOT invent or hallucinate a scenario.
- If no emergency is visible or audible, set severity to "unknown", summary to "Media is unclear or no emergency detected.", and leave all arrays empty.

Tasks:
1. Transcribe what you hear in the audio recording (the "transcript"). If no speech, set to empty string.
2. Determine Severity level: "red" (life-threatening, immediate), "orange" (serious, urgent), "yellow" (minor, non-urgent), or "unknown" (unclear).
3. Provide a short summary of the emergency (2-3 sentences).
4. List detected or likely injuries.
5. List immediate risks if untreated.
6. Provide first-aid recommendations for bystanders.

Respond ONLY with this JSON format, no markdown, no explanation:
{
  "transcript": "string",
  "severity": "red" | "orange" | "yellow" | "unknown",
  "summary": "string",
  "injuries": ["string"],
  "risks": ["string"],
  "recommendations": ["string"]
}
`.trim();

  // Build content parts: text prompt + images + audio
  const parts = [{ text: prompt }];

  // Add images
  for (const img of images) {
    parts.push({
      inlineData: {
        data: img.base64,
        mimeType: img.mimeType || 'image/jpeg',
      },
    });
  }

  // Add audio
  if (audio?.base64) {
    parts.push({
      inlineData: {
        data: audio.base64,
        mimeType: audio.mimeType || 'audio/mp4',
      },
    });
  }

  const result = await geminiModel.generateContent(parts);
  const responseText = result.response.text().trim();

  // Strip any accidental markdown fencing
  const cleaned = responseText.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('[Gemini] Failed to parse response:', responseText);
    throw new Error('Gemini returned invalid JSON. Raw: ' + responseText);
  }

  return {
    severity: parsed.severity || 'unknown',
    summary: parsed.summary || '',
    injuries: parsed.injuries || [],
    risks: parsed.risks || [],
    recommendations: parsed.recommendations || [],
    transcript: parsed.transcript || '',
    raw: parsed,
  };
}
