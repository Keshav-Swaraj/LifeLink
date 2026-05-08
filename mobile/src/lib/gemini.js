import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('Missing EXPO_PUBLIC_GEMINI_API_KEY in .env');
}

const genAI = new GoogleGenerativeAI(apiKey);

// Gemini 1.5 Flash - supports multimodal (text + images)
export const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

/**
 * Runs AI triage on a voice transcript + array of base64 images.
 * @param {string} voiceTranscript
 * @param {Array<{base64: string, mimeType: string}>} images
 * @returns {Promise<{severity: string, summary: string, injuries: string[], risks: string[], recommendations: string[], raw: object}>}
 */
export async function runAITriage(voiceTranscript, images = []) {
  const prompt = `
You are an emergency medical AI triage assistant. Analyze the following emergency situation and respond ONLY with a valid JSON object.

Voice description from victim or bystander:
"${voiceTranscript || 'No voice description provided.'}"

Analyze the scene images and voice description together. Determine:
1. Severity level: "red" (life-threatening, immediate), "orange" (serious, urgent), or "yellow" (minor, non-urgent)
2. A short summary of the emergency (2-3 sentences)
3. List of detected or likely injuries
4. List of immediate risks if untreated
5. List of first-aid recommendations for bystanders

Respond ONLY with this JSON format, no markdown, no explanation:
{
  "severity": "red" | "orange" | "yellow",
  "summary": "string",
  "injuries": ["string"],
  "risks": ["string"],
  "recommendations": ["string"]
}
`.trim();

  // Build content parts: text prompt + images
  const parts = [{ text: prompt }];

  for (const img of images) {
    parts.push({
      inlineData: {
        data: img.base64,
        mimeType: img.mimeType || 'image/jpeg',
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
    raw: parsed,
  };
}
